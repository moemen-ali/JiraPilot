# JiraPilot Backend (NestJS) — Codebase Report
_Generated: 2026-04-20_

## 1. Project Overview

**JiraPilot Backend** is a NestJS REST API that orchestrates AI agent execution. It:
1. Serves a list of available agents (loaded from markdown files with YAML frontmatter)
2. Handles agent execution: fetches Jira data, builds user context, streams LLM responses via OpenRouter
3. Provides direct Jira endpoints for testing connections, querying projects/sprints/tickets/epic data
4. Implements connection validation, error handling, CORS, and request authentication via token guards

The backend acts as the "glue" between the JiraPilot frontend (Next.js) and two external services: Jira Cloud API and OpenRouter AI.

- **Framework**: NestJS 10.0.0 with Express adapter
- **Language**: TypeScript 5.1.3
- **Architecture**: Modular (AppModule → AgentsModule, JiraModule, OpenRouterModule)
- **Authentication**: Token-based via X-Jira-Token header (no database, credentials passed from client)
- **Streaming**: SSE (Server-Sent Events) for real-time agent output streaming
- **Error Handling**: Global exception filter, HTTP guards, validation pipes

## 2. Tech Stack & Dependencies

### Core Dependencies
- **@nestjs/core** `^10.0.0` — NestJS core
- **@nestjs/common** `^10.0.0` — Common decorators & utilities
- **@nestjs/platform-express** `^10.0.0` — Express adapter
- **@nestjs/config** `^4.0.4` — Environment configuration
- **@nestjs/axios** `^4.0.1` — HTTP client for Jira/external APIs
- **axios** `^1.15.0` — HTTP library (also used directly for OpenRouter streaming)
- **class-validator** `^0.15.1` — DTO validation decorators
- **class-transformer** `^0.5.1` — DTO transformation
- **gray-matter** `^4.0.3` — YAML frontmatter parsing for agent prompts
- **rxjs** `^7.8.1` — Reactive extensions (NestJS HttpService)
- **reflect-metadata** `^0.2.0` — TypeScript metadata

### Dev Dependencies
- jest, @nestjs/testing, @nestjs/cli, typescript, ts-jest, ts-node, supertest, prettier, eslint

## 3. Directory Structure

```
BE/jirapilot-mcp/
├── src/
│   ├── main.ts                    # Bootstrap, global pipes/guards/filters, CORS
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # GET /health
│   ├── agents/
│   │   ├── agents.controller.ts   # POST /agents/list, /agents/run
│   │   ├── agents.service.ts      # Load agents, orchestrate execution
│   │   ├── agents.module.ts
│   │   ├── dto/run-agent.dto.ts
│   │   └── prompts/
│   │       ├── bug-report.md      # Bug Report agent (with addon toggles)
│   │       ├── sprint-summary.md  # Sprint Summary agent (jira-project + jira-sprint)
│   │       └── prd-generator.md   # PRD Generator agent
│   ├── jira/
│   │   ├── jira.controller.ts     # POST /jira/projects, /sprints, /sprint, /tickets, /epic
│   │   ├── jira.service.ts        # Jira Cloud API client
│   │   ├── jira.module.ts
│   │   └── dto/
│   │       ├── sprint-query.dto.ts    # sprintName, sprintId, projectKey, maxResults
│   │       ├── sprints-query.dto.ts   # projectKey (for board+sprint lookup)
│   │       ├── tickets-query.dto.ts   # keys[], maxResults
│   │       └── epic-query.dto.ts      # epicKey, maxResults
│   ├── openrouter/
│   │   ├── openrouter.service.ts  # OpenRouter streaming
│   │   └── openrouter.module.ts
│   └── common/
│       ├── guards/jira-token.guard.ts
│       └── filters/http-exception.filter.ts
├── test/jest-e2e.json
├── .env, .env.example
├── nest-cli.json                  # Assets: copies agents/prompts/*.md to dist
├── tsconfig.json, tsconfig.build.json
├── package.json, jest.config.js
└── dist/ (build output)
```

## 4. Framework Analysis: NestJS

### Module Architecture
- **AppModule** imports ConfigModule (global), JiraModule, AgentsModule
- **AgentsModule** imports JiraModule, OpenRouterModule
- **JiraModule** provides JiraService (with HttpModule.registerAsync for Jira base URL)
- **OpenRouterModule** provides OpenRouterService
- **Dependency Injection** via @Module decorators

### Controllers & Endpoints

#### AppController
```
GET /health
  No auth required
  Returns: { status: 'ok', timestamp: ISO }
```

#### AgentsController (agents/)
```
POST /agents/list
  No auth required
  Body: {}
  Returns: AgentConfig[] (without systemPrompt)

POST /agents/run
  Auth: X-Jira-Token, X-OpenRouter-Key (required)
  Headers: X-Jira-Email (optional), X-Model (optional)
  Body: { agentId, formValues }
  Response: SSE stream (text/event-stream)
```

#### JiraController (jira/)
```
POST /jira/projects
  Auth: X-Jira-Token, [X-Jira-Email]
  Body: {}
  Returns: { projects: [{ id, key, name }] }

POST /jira/sprints
  Auth: X-Jira-Token, [X-Jira-Email]
  Body: { projectKey: string }
  Returns: { sprints: [{ id, name, state }] }

POST /jira/sprint
  Auth: X-Jira-Token, [X-Jira-Email]
  Body: SprintQueryDto (sprintName | sprintId, projectKey, maxResults)
  Returns: { sprint, total, issues[] }

POST /jira/tickets
  Auth: X-Jira-Token, [X-Jira-Email]
  Body: TicketsQueryDto
  Returns: { total, issues[] }

POST /jira/epic
  Auth: X-Jira-Token, [X-Jira-Email]
  Body: EpicQueryDto
  Returns: { epic, children[], total }
```

### Services

#### AgentsService
- **Constructor**: Loads all agents from src/agents/prompts/*.md
- **loadAllAgents()**: Parse YAML frontmatter + body via gray-matter
- **getAgent(id)**: Returns agent config, throws NotFoundException
- **getAllAgents()**: Returns all agents
- **getJiraRoute(id)**: Returns Jira endpoint (sprint/tickets/epic/undefined)

**Agent Registry** (AGENT_IDS):
```
bug-report       → Jira route: epic
sprint-summary   → Jira route: sprint
prd-generator    → Jira route: epic
```

**AgentConfig Structure**:
```typescript
{
  id: string;           // bug-report, sprint-summary, prd-generator
  name: string;         // "Bug Report", "Sprint Summary", "PRD Generator"
  description: string;  // Long description
  blurb: string;        // Short blurb for agent card
  tone: string;         // err, pm, data
  toneLabel: string;    // QA, PM, Data
  est: string;          // ~45s, ~20s, ~30s
  inputs: FieldDef[];   // Dynamic form fields (text, select, toggle, jira-project, jira-sprint)
  systemPrompt: string; // Markdown body (sent to LLM)
}
```

**Input Types**:
- `text` — free-text input with placeholder
- `textarea` — multi-line text input
- `select` — dropdown with options array
- `toggle` — boolean switch (add-on toggles in Bug Report)
- `jira-project` — workspace dropdown (reads from localStorage JIRAPILOT_WORKSPACES)
- `jira-sprint` — sprint dropdown with `dependsOn` field linking to a jira-project input

**Prompt File Format** (agents/prompts/*.md):
```markdown
---
name: Bug Report
description: Comprehensive bug analysis for an epic or story, with optional add-ons...
blurb: Full bug report with optional pattern analysis, duplicate detection...
tone: err
toneLabel: QA
est: ~45s
inputs:
  - id: epic_key
    label: Epic / Story key
    type: text
    placeholder: "e.g. PROJ-123"
    required: true
  - id: addon_bug_report
    label: Bug Report
    type: toggle
    default: "true"
  - id: addon_bug_analyzer
    label: Bug Analyzer (Patterns)
    type: toggle
    default: "false"
---
You are a Jira Bug Report Orchestrator...
```

#### JiraService
- **getProjects(token, email)** — Lists accessible Jira projects (workspaces)
- **getSprints(dto, token, email)** — Lists active/future sprints for a project (two-step: find board → fetch sprints)
- **getSprintIssues(dto, token, email)** — JQL query for sprint issues (supports sprintId or sprintName)
- **getTickets(dto, token, email)** — Query specific issue keys
- **getEpicWithChildren(dto, token, email)** — Epic + child issues

**Auth**:
- If email: Basic auth = base64(email:token)
- Else: Bearer token
- Base URL from JIRA_BASE_URL env var

**Data Transforms**:
- toIssue(): key, summary, status, assignee, priority, type
- toDetailedIssue(): + description, labels, fixVersions, comments
- extractText(): ADF (Atlassian Document Format) → plain text

#### OpenRouterService
- **streamChat(key, model, systemPrompt, userMessage)** — async generator
- POST https://openrouter.ai/api/v1/chat/completions
- Parse SSE, yield content chunks
- Stop on [DONE]
- Rate limit handling (429 with retry-after)

### Guards

#### JiraTokenGuard (global)
- Allow: /health, /agents/list (no token)
- Require X-Jira-Token for all others
- Require X-OpenRouter-Key for /agents/run
- Throws UnauthorizedException if missing

### Pipes

#### ValidationPipe (global)
- whitelist: true
- forbidNonWhitelisted: true
- transform: true

### Filters

#### AllExceptionsFilter (global)
Consistent error response:
```json
{
  "statusCode": 400|401|500|...,
  "message": "...",
  "path": "/endpoint",
  "timestamp": "ISO"
}
```

### DTOs

#### RunAgentDto
```typescript
agentId: string (@IsString)
formValues: Record<string, string> (@IsObject)
```

#### SprintQueryDto
```typescript
sprintName?: string (@IsOptional, @IsString)
sprintId?: number (@IsOptional, @IsInt)
projectKey?: string (@IsOptional, @IsString)
maxResults?: number (@IsOptional, @IsInt, @Min(1), @Max(100))
```

#### SprintsQueryDto
```typescript
projectKey: string (@IsString)
```

#### TicketsQueryDto
```typescript
keys: string[] (@IsString[])
maxResults?: number (@IsOptional, @IsInt, @Min(1), @Max(50))
```

#### EpicQueryDto
```typescript
epicKey: string (@IsString)
maxResults?: number (@IsOptional, @IsInt, @Min(1), @Max(100))
```

## 5. Agent Execution Flow (POST /agents/run)

**Request**:
```
Headers: X-Jira-Token, X-OpenRouter-Key, [X-Jira-Email], [X-Model]
Body: { agentId: "bug-report", formValues: { epic_key: "PROJ-123", addon_bug_report: "true", addon_bug_analyzer: "false", ... } }
```

**Processing**:
1. ValidationPipe: Transform to RunAgentDto
2. JiraTokenGuard: Check tokens
3. AgentsController.runAgent():
   - Load agent: AgentsService.getAgent(agentId)
   - Get Jira route: AgentsService.getJiraRoute(agentId) → "epic"/"sprint"/"tickets"
   - Fetch Jira data: JiraService method based on route, passing formValues
   - Build message: Format Jira data + form inputs as markdown
   - Set response headers: Content-Type: text/event-stream
   - Stream OpenRouter: For each chunk, write SSE event
   - Finish: Write [DONE]

**Sprint Route — fetchJiraData**:
- Reads `formValues.sprint_id` → converts to Number for JQL `sprint = {id}` query
- Falls back to `formValues.sprint_name` / `formValues.sprintName` → JQL `sprint = "{name}"`
- Also sends `formValues.project_key` / `formValues.projectKey` → JQL `project = "{key}"`

**Epic Route — fetchJiraData**:
- Reads `formValues.epic_key` or `formValues.epicKey`
- Calls getEpicWithChildren with that key

**Toggle Handling**:
- Bug Report agent sends addon toggles as `formValues` (e.g. `addon_bug_report: "true"`, `addon_blocker_predictor: "false"`)
- These are included in the user message under "## Form Inputs"
- The system prompt conditions generation on toggle values: only generates sections where the value is "true"

**Response** (SSE):
```
data: {"content":"text chunk"}
data: {"content":"more text"}
...
data: [DONE]
```

## 6. Agent Inventory

### Bug Report (`bug-report.md`)
- **Jira route**: epic
- **Inputs**: epic_key (text), addon_bug_report (toggle, default true), addon_bug_analyzer (toggle), addon_duplicate_detector (toggle), addon_epic_scorer (toggle), addon_release_notes (toggle), addon_blocker_predictor (toggle)
- **Description**: Comprehensive bug analysis with optional add-ons for pattern analysis, duplicate detection, health scoring, release notes, and blocker prediction
- **Blocker Predictor scope**: Only flags functional/logic errors, API failures, data integrity issues, and crashes. Never flags UI styling, text/translation, spacing, or cosmetic issues.

### Sprint Summary (`sprint-summary.md`)
- **Jira route**: sprint
- **Inputs**: project_key (jira-project, dependsOn), sprint_id (jira-sprint, dependsOn: project_key), focus (select)
- **Description**: Sprint status and blocker summary for any active sprint

### PRD Generator (`prd-generator.md`)
- **Jira route**: epic
- **Inputs**: feature_name (text), description (textarea), target_users (select)
- **Description**: Generate a Product Requirements Document from a feature brief

### Removed from Standalone
- `release-notes` — now an add-on toggle inside Bug Report only
- `ticket-summary` — kept for backwards compatibility but removed from AGENT_IDS

## 7. Configuration & Environment

### Environment Variables
- PORT (default 3000)
- ALLOWED_ORIGIN (CORS, default *)
- JIRA_BASE_URL — Base URL for all Jira API calls (REST and Agile)

### Jira Credentials
- Passed per-request via X-Jira-Token header
- Optional X-Jira-Email for Basic auth
- Not stored in .env

### nest-cli.json Assets
```json
{
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      { "include": "agents/prompts/*.md", "outDir": "dist" }
    ]
  }
}
```
This ensures `.md` prompt files are copied to `dist/agents/prompts/` on build.

## 8. Testing Setup

Jest configuration:
- testRegex: `.*\.spec\.ts$`
- rootDir: src
- testEnvironment: node
- ts-jest transformer
- e2e tests: jest-e2e.json

No test files present yet.

## 9. Key APIs & Contracts

### Agent List Response
```typescript
[
  {
    id: "bug-report",
    name: "Bug Report",
    description: "Comprehensive bug analysis...",
    blurb: "Full bug report with optional pattern analysis...",
    tone: "err",
    toneLabel: "QA",
    est: "~45s",
    inputs: [
      { id: "epic_key", label: "Epic / Story key", type: "text", placeholder: "e.g. PROJ-123", required: true },
      { id: "addon_bug_report", label: "Bug Report", type: "toggle", default: "true" },
      { id: "addon_bug_analyzer", label: "Bug Analyzer (Patterns)", type: "toggle", default: "false" },
      ...
    ]
  },
  {
    id: "sprint-summary",
    name: "Sprint Summary",
    ...
    inputs: [
      { id: "project_key", label: "Workspace / Project", type: "jira-project", required: true },
      { id: "sprint_id", label: "Sprint", type: "jira-sprint", dependsOn: "project_key", required: true },
      { id: "focus", label: "Focus area", type: "select", options: [...], default: "Full summary" }
    ]
  }
]
```

### Jira Projects Response
```typescript
{
  projects: [
    { id: "10001", key: "PROJ", name: "My Project" }
  ]
}
```

### Jira Sprints Response
```typescript
{
  sprints: [
    { id: 42, name: "Sprint 42", state: "active" },
    { id: 43, name: "Sprint 43", state: "future" }
  ]
}
```

### Jira Sprint Response
```typescript
{
  sprint: "Sprint 42",
  total: 15,
  issues: [
    { key: "PROJ-123", summary: "Fix bug", status: "Done", assignee: "Alice", priority: "High", type: "Bug" }
  ]
}
```

### Jira Epic Response
```typescript
{
  epic: {
    key: "PROJ-100",
    summary: "Auth Overhaul",
    description: "...",
    status: "In Progress",
    assignee: "Bob"
  },
  children: [...], // detailed issues
  total: 25
}
```

### OpenRouter SSE
```
data: {"content":"text"}
data: {"content":" chunk"}
...
data: [DONE]
```

## 10. Notable Patterns & Observations

### Strengths
1. **Modular Architecture**: Clear separation (Agents, Jira, OpenRouter)
2. **Streaming-First**: Real-time SSE output
3. **Token Guards**: Header-based auth, no database
4. **Validation Pipes**: DTO-based validation
5. **Consistent Errors**: Global error filter
6. **Markdown Agents**: Easy agent definition via frontmatter
7. **Dynamic Inputs**: Support for text, select, toggle, jira-project, jira-sprint input types
8. **Sprint ID vs Name**: Supports both sprint ID (more reliable) and sprint name for JQL queries

### Areas for Improvement
1. **No Database**: Agents loaded from files on startup
2. **No Caching**: Every Jira query hits API
3. **No Logging**: Only console.warn
4. **No Rate Limiting**: OpenRouter/Jira limits not guarded
5. **Minimal Input Validation**: formValues accepted as-is (only agentId validated)
6. **Hardcoded Agent IDs**: AGENT_IDS array must be manually updated

### Recent Changes (2026-04-20)
1. **Bug Report Agent**: New agent with 6 addon toggles (bug report, bug analyzer, duplicate detector, epic scorer, release notes, blocker predictor)
2. **Sprint Summary**: Updated inputs from text-based `sprint_name` to `jira-project` + `jira-sprint` dropdown with dynamic sprint fetching
3. **Jira Projects Endpoint**: New `POST /jira/projects` — lists all accessible workspaces
4. **Jira Sprints Endpoint**: New `POST /jira/sprints` — lists active/future sprints for a project
5. **SprintQueryDto**: Added optional `sprintId` field alongside `sprintName` for more reliable JQL queries
6. **Agent Registry**: Removed `release-notes` and `ticket-summary` from standalone AGENT_IDS (now add-ons inside Bug Report)
7. **Blocker Predictor**: Explicitly scoped to functional/logic errors only — never flags UI styling or translation issues

## 11. Recommendations

### Immediate
1. Add structured logging (Winston/Pino)
2. Write unit tests for services
3. Add input validation for formValues
4. Improve SSE error messages

### Mid-Term
1. Add caching for Jira queries
2. Dynamic agent discovery/hot-reload
3. Rate limiting guards
4. JWT/OAuth authentication
5. Database for run history

### Documentation
- Agent prompt best practices
- Jira API version & scopes
- OpenRouter rate limits & errors
- Swagger/OpenAPI docs
- Example agent prompts