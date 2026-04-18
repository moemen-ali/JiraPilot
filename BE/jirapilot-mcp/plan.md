# AgentDesk — Backend Implementation Spec (NestJS)

> Paste this into any Claude thread to build the backend with full context.

---

## 1. What This Server Is

A **Jira proxy + LLM orchestrator** deployed on Railway. The AgentDesk browser app sends a single request per agent run. The backend fetches Jira data, assembles the prompt from local agent `.md` files, streams the LLM response from OpenRouter, and pipes it back to the browser as SSE.

**It holds zero secrets of its own** — every request carries the user's keys as headers:

- `X-Jira-Token` — Jira API token
- `X-OpenRouter-Key` — OpenRouter API key
- `X-Model` — LLM model override (optional)

**It DOES:**

- Validate incoming request shapes (DTOs + ValidationPipe)
- Guard every route for required headers (`X-Jira-Token` + `X-OpenRouter-Key`)
- Call the Jira REST API v3 on behalf of the browser
- Transform and filter Jira responses to only what agents need
- Read agent `.md` prompt files and extract system prompts
- Call OpenRouter with the assembled prompt and stream the response
- Return SSE-streamed LLM output to the frontend
- Return consistent error shapes via a global exception filter
- Expose a `/health` endpoint for Railway's health check

**It does NOT:**

- Store API keys, sessions, or history
- Serve the frontend (that's Vercel)
- Implement the MCP wire protocol — it's plain HTTP/JSON + SSE

---

## 2. Architecture — Request Flow

```
Browser
  │
  │  POST /agents/run
  │  Headers: X-Jira-Token, X-OpenRouter-Key, X-Model
  │  Body: { agentId: "sprint-summary", formValues: { sprint_name: "Sprint 42", ... } }
  │
  ▼
┌──────────────────────────────────────────────────────────────┐
│  NestJS Backend                                               │
│                                                               │
│  1. Guard validates headers (X-Jira-Token + X-OpenRouter-Key) │
│  2. AgentsController receives the request                     │
│  3. AgentsService loads agent .md file → gets system prompt   │
│  4. AgentsController maps agentId → Jira route:               │
│     • release-notes, sprint-summary → JiraService.sprint()    │
│     • ticket-summary → JiraService.tickets()                  │
│     • prd-generator → JiraService.epic()                      │
│  5. JiraService calls Jira REST API v3 → returns clean JSON   │
│  6. AgentsController builds user message (Jira data + form)   │
│  7. OpenRouterService streams LLM response                    │
│  8. AgentsController pipes SSE chunks back to browser         │
│                                                               │
│       ┌──────────┐     ┌──────────────┐     ┌─────────────┐  │
│       │ Jira API │ ──► │ Prompt Build │ ──► │ OpenRouter  │  │
│       └──────────┘     └──────────────┘     └──────┬──────┘  │
│                                                     │ SSE     │
└─────────────────────────────────────────────────────┼────────┘
                                                      │
                                                      ▼
                                                   Browser
                                              (renders stream)
```

---

## 3. File Structure

```
src/
├── main.ts                          ← bootstrap, CORS, global pipes/filters/guards
├── app.module.ts                    ← root module
├── app.controller.ts                ← health check only
│
├── common/
│   ├── guards/
│   │   └── jira-token.guard.ts      ← validates X-Jira-Token + X-OpenRouter-Key headers
│   └── filters/
│       └── http-exception.filter.ts ← consistent error shape
│
├── jira/
│   ├── jira.module.ts
│   ├── jira.controller.ts           ← direct Jira routes (kept for standalone use)
│   ├── jira.service.ts              ← all Jira API calls + transforms
│   └── dto/
│       ├── sprint-query.dto.ts
│       ├── tickets-query.dto.ts
│       └── epic-query.dto.ts
│
├── openrouter/
│   ├── openrouter.module.ts
│   └── openrouter.service.ts        ← streams chat completions from OpenRouter
│
└── agents/
    ├── agents.module.ts
    ├── agents.controller.ts          ← POST /agents/run (SSE), POST /agents/list
    ├── agents.service.ts             ← loads + parses agent .md files
    ├── dto/
    │   └── run-agent.dto.ts
    └── prompts/                      ← agent system prompt files
        ├── release-notes.md
        ├── sprint-summary.md
        ├── ticket-summary.md
        └── prd-generator.md
```

---

## 4. `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JiraTokenGuard } from './common/guards/jira-token.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalGuards(new JiraTokenGuard());

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = (process.env.ALLOWED_ORIGIN ?? '*')
        .split(',')
        .map((s) => s.trim());
      if (!origin || allowed.includes('*') || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'X-Jira-Token',
      'X-OpenRouter-Key',
      'X-Model',
    ],
    credentials: false,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`MCP server running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
```

---

## 5. `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { JiraModule } from './jira/jira.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), JiraModule, AgentsModule],
  controllers: [AppController],
})
export class AppModule {}
```

---

## 6. `app.controller.ts` — health check

Railway pings this to confirm the server is alive. No token required.

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

---

## 7. Guard — `common/guards/jira-token.guard.ts`

Skips `/health` and `/agents/list`. Requires `X-Jira-Token` on all other routes. Additionally requires `X-OpenRouter-Key` on `/agents/run`.

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JiraTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.url === '/health' || request.url === '/agents/list')
      return true;

    const jiraToken = request.headers['x-jira-token'];
    if (
      !jiraToken ||
      typeof jiraToken !== 'string' ||
      jiraToken.trim() === ''
    ) {
      throw new UnauthorizedException(
        'Missing X-Jira-Token header. Set your Jira API token in AgentDesk settings.',
      );
    }

    if (request.url === '/agents/run') {
      const orKey = request.headers['x-openrouter-key'];
      if (!orKey || typeof orKey !== 'string' || orKey.trim() === '') {
        throw new UnauthorizedException(
          'Missing X-OpenRouter-Key header. Set your OpenRouter key in AgentDesk settings.',
        );
      }
    }

    return true;
  }
}
```

---

## 8. Filter — `common/filters/http-exception.filter.ts`

All errors return the same JSON shape.

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 9. Jira Module

### `jira/jira.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JiraController } from './jira.controller';
import { JiraService } from './jira.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 10000,
        baseURL: process.env.JIRA_BASE_URL,
      }),
    }),
  ],
  controllers: [JiraController],
  providers: [JiraService],
  exports: [JiraService], // exported for AgentsModule
})
export class JiraModule {}
```

### DTOs

#### `jira/dto/sprint-query.dto.ts`

```typescript
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class SprintQueryDto {
  @IsString()
  sprintName: string;

  @IsOptional()
  @IsString()
  projectKey?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxResults?: number;
}
```

#### `jira/dto/tickets-query.dto.ts`

```typescript
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class TicketsQueryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  keys: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxResults?: number;
}
```

#### `jira/dto/epic-query.dto.ts`

```typescript
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class EpicQueryDto {
  @IsString()
  epicKey: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxResults?: number;
}
```

### `jira/jira.controller.ts`

Direct Jira routes — kept for standalone use and testing.

```typescript
import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { JiraService } from './jira.service';
import { SprintQueryDto } from './dto/sprint-query.dto';
import { TicketsQueryDto } from './dto/tickets-query.dto';
import { EpicQueryDto } from './dto/epic-query.dto';

@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Post('sprint')
  @HttpCode(200)
  async sprint(
    @Body() dto: SprintQueryDto,
    @Headers('x-jira-token') jiraToken: string,
  ) {
    return this.jiraService.getSprintIssues(dto, jiraToken);
  }

  @Post('tickets')
  @HttpCode(200)
  async tickets(
    @Body() dto: TicketsQueryDto,
    @Headers('x-jira-token') jiraToken: string,
  ) {
    return this.jiraService.getTickets(dto, jiraToken);
  }

  @Post('epic')
  @HttpCode(200)
  async epic(
    @Body() dto: EpicQueryDto,
    @Headers('x-jira-token') jiraToken: string,
  ) {
    return this.jiraService.getEpicWithChildren(dto, jiraToken);
  }
}
```

### `jira/jira.service.ts`

All Jira REST API v3 calls. Raw Jira payloads are transformed into clean, minimal objects.

```typescript
import {
  Injectable,
  BadGatewayException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { SprintQueryDto } from './dto/sprint-query.dto';
import { TicketsQueryDto } from './dto/tickets-query.dto';
import { EpicQueryDto } from './dto/epic-query.dto';

@Injectable()
export class JiraService {
  constructor(private readonly http: HttpService) {}

  async getSprintIssues(dto: SprintQueryDto, jiraToken: string) {
    const jql = dto.projectKey
      ? `sprint = "${dto.sprintName}" AND project = "${dto.projectKey}" ORDER BY status ASC`
      : `sprint = "${dto.sprintName}" ORDER BY status ASC`;
    const raw = await this.jiraSearch(jql, dto.maxResults ?? 50, jiraToken);
    return {
      sprint: dto.sprintName,
      total: raw.total,
      issues: raw.issues.map(this.toIssue),
    };
  }

  async getTickets(dto: TicketsQueryDto, jiraToken: string) {
    const keys = dto.keys.map((k) => `"${k}"`).join(', ');
    const jql = `issueKey in (${keys}) ORDER BY created DESC`;
    const raw = await this.jiraSearch(jql, dto.maxResults ?? 50, jiraToken);
    return {
      total: raw.total,
      issues: raw.issues.map(this.toDetailedIssue),
    };
  }

  async getEpicWithChildren(dto: EpicQueryDto, jiraToken: string) {
    const epicRaw = await this.jiraGet(
      `/rest/api/3/issue/${dto.epicKey}`,
      jiraToken,
    );
    const jql = `"Epic Link" = "${dto.epicKey}" OR parent = "${dto.epicKey}" ORDER BY created ASC`;
    const raw = await this.jiraSearch(jql, dto.maxResults ?? 100, jiraToken);
    return {
      epic: {
        key: epicRaw.key,
        summary: epicRaw.fields.summary,
        description: this.extractText(epicRaw.fields.description),
        status: epicRaw.fields.status?.name,
        assignee: epicRaw.fields.assignee?.displayName ?? 'Unassigned',
      },
      children: raw.issues.map(this.toDetailedIssue),
      total: raw.total,
    };
  }

  // ─── Transforms ──────────────────────────────

  private toIssue = (issue: any) => ({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status?.name,
    assignee: issue.fields.assignee?.displayName ?? 'Unassigned',
    priority: issue.fields.priority?.name ?? 'None',
    type: issue.fields.issuetype?.name,
  });

  private toDetailedIssue = (issue: any) => ({
    ...this.toIssue(issue),
    description: this.extractText(issue.fields.description),
    labels: issue.fields.labels ?? [],
    fixVersions: issue.fields.fixVersions?.map((v: any) => v.name) ?? [],
    comments: (issue.fields.comment?.comments ?? [])
      .slice(-3)
      .map((c: any) => ({
        author: c.author?.displayName,
        body: this.extractText(c.body),
      })),
  });

  private extractText(adf: any): string {
    if (!adf) return '';
    if (typeof adf === 'string') return adf;
    const texts: string[] = [];
    const walk = (node: any) => {
      if (node?.type === 'text') texts.push(node.text);
      if (node?.content) node.content.forEach(walk);
    };
    walk(adf);
    return texts.join(' ').trim();
  }

  // ─── HTTP helpers ────────────────────────────

  private authHeaders(jiraToken: string): AxiosRequestConfig['headers'] {
    return { Authorization: `Bearer ${jiraToken}`, Accept: 'application/json' };
  }

  private async jiraSearch(jql: string, maxResults: number, jiraToken: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get('/rest/api/3/search', {
          headers: this.authHeaders(jiraToken),
          params: {
            jql,
            maxResults,
            fields:
              'summary,status,assignee,priority,issuetype,description,labels,fixVersions,comment',
          },
        }),
      );
      return data;
    } catch (err) {
      this.handleJiraError(err);
    }
  }

  private async jiraGet(path: string, jiraToken: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(path, {
          headers: this.authHeaders(jiraToken),
          params: { fields: 'summary,status,assignee,description' },
        }),
      );
      return data;
    } catch (err) {
      this.handleJiraError(err);
    }
  }

  private handleJiraError(err: any): never {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      throw new UnauthorizedException(
        'Jira rejected your token. Check your API token in AgentDesk settings.',
      );
    }
    const jiraMsg =
      err.response?.data?.errorMessages?.[0] ??
      err.response?.data?.message ??
      err.message;
    throw new BadGatewayException(`Jira API error: ${jiraMsg}`);
  }
}
```

---

## 10. OpenRouter Module

### `openrouter/openrouter.service.ts`

Streams chat completions from OpenRouter via axios with `responseType: 'stream'`.

```typescript
import { Injectable, BadGatewayException } from '@nestjs/common';
import axios from 'axios';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable()
export class OpenRouterService {
  async *streamChat(
    openRouterKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
  ): AsyncGenerator<string> {
    let response: any;
    try {
      response = await axios.post(
        OPENROUTER_URL,
        {
          model,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 120000,
        },
      );
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? err.message;
      throw new BadGatewayException(
        `OpenRouter error (${err.response?.status ?? 'network'}): ${msg}`,
      );
    }

    let buffer = '';
    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          /* skip malformed chunks */
        }
      }
    }
  }
}
```

### `openrouter/openrouter.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';

@Module({
  providers: [OpenRouterService],
  exports: [OpenRouterService],
})
export class OpenRouterModule {}
```

---

## 11. Agents Module

### `agents/agents.service.ts`

Loads agent `.md` files at startup and provides lookup by ID.

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import * as matter from 'gray-matter';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  inputs: any[];
  systemPrompt: string;
}

const AGENT_IDS = [
  'release-notes',
  'sprint-summary',
  'ticket-summary',
  'prd-generator',
];

const AGENT_JIRA_ROUTE: Record<string, string> = {
  'release-notes': 'sprint',
  'sprint-summary': 'sprint',
  'ticket-summary': 'tickets',
  'prd-generator': 'epic',
};

@Injectable()
export class AgentsService {
  private readonly agents = new Map<string, AgentConfig>();

  constructor() {
    this.loadAllAgents();
  }

  private loadAllAgents() {
    for (const id of AGENT_IDS) {
      const filePath = join(__dirname, 'prompts', `${id}.md`);
      if (!existsSync(filePath)) {
        console.warn(`Agent prompt not found: ${filePath}`);
        continue;
      }
      const raw = readFileSync(filePath, 'utf-8');
      const { data, content } = matter(raw);
      this.agents.set(id, {
        id,
        name: data.name || id,
        description: data.description || '',
        inputs: data.inputs || [],
        systemPrompt: content.trim(),
      });
    }
  }

  getAgent(id: string): AgentConfig {
    const agent = this.agents.get(id);
    if (!agent) throw new NotFoundException(`Agent "${id}" not found`);
    return agent;
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getJiraRoute(agentId: string): string | undefined {
    return AGENT_JIRA_ROUTE[agentId];
  }
}
```

### `agents/dto/run-agent.dto.ts`

```typescript
import { IsString, IsObject } from 'class-validator';

export class RunAgentDto {
  @IsString()
  agentId: string;

  @IsObject()
  formValues: Record<string, string>;
}
```

### `agents/agents.controller.ts`

The unified endpoint. Orchestrates: agent lookup → Jira fetch → prompt build → OpenRouter stream → SSE response.

````typescript
import { Controller, Post, Body, Headers, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { AgentsService } from './agents.service';
import { JiraService } from '../jira/jira.service';
import { OpenRouterService } from '../openrouter/openrouter.service';
import { RunAgentDto } from './dto/run-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly jiraService: JiraService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  @Post('list')
  @HttpCode(200)
  listAgents() {
    return this.agentsService
      .getAllAgents()
      .map(({ systemPrompt, ...rest }) => rest);
  }

  @Post('run')
  async runAgent(
    @Body() dto: RunAgentDto,
    @Headers('x-jira-token') jiraToken: string,
    @Headers('x-openrouter-key') openRouterKey: string,
    @Headers('x-model') model: string | undefined,
    @Res() res: Response,
  ) {
    const agent = this.agentsService.getAgent(dto.agentId);
    const selectedModel = model || 'qwen/qwen3-coder:free';

    // Step 1: Fetch Jira data
    let jiraData: any = {};
    const jiraRoute = this.agentsService.getJiraRoute(dto.agentId);
    if (jiraRoute && jiraToken) {
      jiraData = await this.fetchJiraData(jiraRoute, dto.formValues, jiraToken);
    }

    // Step 2: Build user message
    const userMessage = this.buildUserMessage(jiraData, dto.formValues);

    // Step 3: Stream LLM response as SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const stream = this.openRouterService.streamChat(
        openRouterKey,
        selectedModel,
        agent.systemPrompt,
        userMessage,
      );
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write(`data: [DONE]\n\n`);
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({ error: err.message || 'Stream failed' })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  private async fetchJiraData(
    route: string,
    formValues: Record<string, string>,
    jiraToken: string,
  ) {
    switch (route) {
      case 'sprint':
        return this.jiraService.getSprintIssues(
          {
            sprintName: formValues.sprint_name || formValues.sprintName || '',
            projectKey: formValues.project_key || formValues.projectKey,
          },
          jiraToken,
        );
      case 'tickets':
        return this.jiraService.getTickets(
          {
            keys: (formValues.ticket_key || formValues.ticketKeys || '')
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean),
          },
          jiraToken,
        );
      case 'epic':
        return this.jiraService.getEpicWithChildren(
          {
            epicKey: formValues.epic_key || formValues.epicKey || '',
          },
          jiraToken,
        );
      default:
        return {};
    }
  }

  private buildUserMessage(
    jiraData: any,
    formValues: Record<string, string>,
  ): string {
    let message = '';
    if (jiraData && Object.keys(jiraData).length > 0) {
      message +=
        '## Jira Data\n\n```json\n' +
        JSON.stringify(jiraData, null, 2) +
        '\n```\n\n';
    }
    message += '## Form Inputs\n\n';
    for (const [key, value] of Object.entries(formValues)) {
      message += `- **${key}**: ${value}\n`;
    }
    return message;
  }
}
````

### `agents/agents.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { JiraModule } from '../jira/jira.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';

@Module({
  imports: [JiraModule, OpenRouterModule],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
```

---

## 12. Agent Prompt Files

Stored in `src/agents/prompts/`. Copied to `dist/agents/prompts/` on build via `nest-cli.json` asset config.

Each file has YAML frontmatter (name, description, inputs) and a markdown body (the system prompt). The `AgentsService` loads them at startup.

**Agent → Jira route mapping:**
| Agent ID | Jira Route | JiraService Method |
|---|---|---|
| `release-notes` | `sprint` | `getSprintIssues()` |
| `sprint-summary` | `sprint` | `getSprintIssues()` |
| `ticket-summary` | `tickets` | `getTickets()` |
| `prd-generator` | `epic` | `getEpicWithChildren()` |

---

## 13. Environment Variables

### `.env` (local dev — never commit)

```
PORT=3000
NODE_ENV=development
JIRA_BASE_URL=https://yourorg.atlassian.net
ALLOWED_ORIGIN=http://localhost:3001
```

### `.env.example` (commit this)

```
PORT=
NODE_ENV=
JIRA_BASE_URL=
ALLOWED_ORIGIN=
```

### Railway dashboard — set these

| Key              | Value                              |
| ---------------- | ---------------------------------- |
| `PORT`           | `3000` (Railway auto-injects this) |
| `NODE_ENV`       | `production`                       |
| `JIRA_BASE_URL`  | `https://yourorg.atlassian.net`    |
| `ALLOWED_ORIGIN` | `https://agentdesk.vercel.app`     |

---

## 14. Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

### `.dockerignore`

```
node_modules
dist
.env
coverage
.git
```

---

## 15. API Contract

### `POST /agents/run` (primary endpoint)

The unified agent execution endpoint. Streams SSE.

```json
// Request
// Headers: X-Jira-Token, X-OpenRouter-Key, X-Model (optional)
{
  "agentId": "sprint-summary",
  "formValues": {
    "sprint_name": "Sprint 42",
    "focus": "Full summary"
  }
}

// Response: SSE stream
data: {"content": "## Sprint 42 Summary\n\n"}
data: {"content": "### Completed\n"}
data: {"content": "- PROJ-101: Add OAuth login (Done)\n"}
...
data: [DONE]

// Error during stream
data: {"error": "Jira rejected your token. Check your API token in AgentDesk settings."}
```

### `POST /agents/list`

Returns available agents (no tokens required).

```json
// Response
[
  {
    "id": "release-notes",
    "name": "Release Notes",
    "description": "Generate release notes from a list of merged PRs or commits",
    "inputs": [...]
  }
]
```

### `POST /jira/sprint` · `POST /jira/tickets` · `POST /jira/epic`

Direct Jira routes — same contract as before. Kept for standalone use and testing.

### `GET /health`

No token required. Returns `{ "status": "ok", "timestamp": "..." }`.

### Error shape (all non-SSE endpoints)

```json
{
  "statusCode": 401,
  "message": "Jira rejected your token. Check your API token in AgentDesk settings.",
  "path": "/agents/run",
  "timestamp": "2026-04-13T10:00:00.000Z"
}
```

---

## 16. `nest-cli.json`

Copies `.md` prompt files into `dist/` on build:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [{ "include": "agents/prompts/*.md", "outDir": "dist" }]
  }
}
```

---

## 17. Build Order

1. `main.ts` — bootstrap, CORS, global pipes/filters/guard
2. `app.module.ts` + `app.controller.ts` — root wiring + health check
3. `common/guards/jira-token.guard.ts` — header validation
4. `common/filters/http-exception.filter.ts` — error shape
5. `jira/` module — Jira API calls + transforms (export JiraService)
6. `openrouter/` module — OpenRouter streaming service
7. `agents/` module — agent loader, unified controller, SSE streaming
8. `.env`, `.env.example`, `Dockerfile`, `.dockerignore`
9. Deploy to Railway, set env vars, set health check path to `/health`

---

_This spec is complete. Every file, every route, the full Jira + OpenRouter integration pipeline, SSE streaming, error handling, CORS, and Railway deployment — no decisions left open._
