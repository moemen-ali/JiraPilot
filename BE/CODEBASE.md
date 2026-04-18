# AgentDesk MCP Backend — Codebase Report

_Generated: 2026-04-18_

## 1. Project Overview

**Project Name:** agentdesk-mcp  
**Version:** 0.0.1  
**License:** UNLICENSED  
**Type:** NestJS REST API + Multi-Agent System  
**Description:** A backend API server for AgentDesk that bridges Jira ticket management with AI-powered agents (via OpenRouter) to automate documentation, summaries, and requirements generation. Uses Server-Sent Events (SSE) for streaming AI responses.

**Key Purpose:**
- Provide REST endpoints for Jira data retrieval (sprints, tickets, epics)
- Manage multi-agent configurations with dynamic prompt loading
- Stream AI-generated content via OpenRouter with token-based authentication
- Enforce security via Jira and OpenRouter token validation

---

## 2. Tech Stack & Dependencies

### Runtime Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/common` | ^10.0.0 | Core NestJS framework |
| `@nestjs/core` | ^10.0.0 | NestJS dependency injection & runtime |
| `@nestjs/platform-express` | ^10.0.0 | Express adapter for HTTP |
| `@nestjs/axios` | ^4.0.1 | HTTP client with axios integration |
| `@nestjs/config` | ^4.0.4 | Environment variable management |
| `axios` | ^1.15.0 | Direct HTTP client for OpenRouter |
| `class-validator` | ^0.15.1 | DTO validation decorators |
| `class-transformer` | ^0.5.1 | DTO transformation |
| `reflect-metadata` | ^0.2.0 | Metadata reflection (required by decorators) |
| `rxjs` | ^7.8.1 | Reactive streams (NestJS async patterns) |
| `gray-matter` | ^4.0.3 | YAML frontmatter parsing for agent prompts |

### Dev Dependencies (Key)
| Package | Purpose |
|---------|---------|
| `@nestjs/cli` | NestJS project scaffolding & build |
| `@nestjs/schematics` | Schematic generators for NestJS artifacts |
| `@nestjs/testing` | Testing utilities & module setup |
| `typescript` | ^5.1.3 - TypeScript compiler |
| `jest` | Unit & integration testing framework |
| `supertest` | HTTP testing library |
| `@typescript-eslint/*` | TypeScript linting |
| `prettier` | Code formatting |

### TypeScript Configuration
- **Target:** ES2021
- **Module:** CommonJS
- **Strict Mode:** Relaxed (nullChecks: false, noImplicitAny: false) — permits flexible typing patterns
- **Source Maps:** Enabled for debugging
- **Decorator Support:** Experimental decorators enabled

---

## 3. Directory Structure

```
src/
├── main.ts                          # App bootstrap; setup pipes, filters, guards, CORS
├── app.module.ts                    # Root module; imports Jira, Agents, Config modules
├── app.controller.ts                # Health check endpoint
│
├── jira/                            # Jira API integration module
│   ├── jira.module.ts               # Module definition; HttpModule config
│   ├── jira.controller.ts           # REST endpoints: /jira/sprint, /jira/tickets, /jira/epic
│   ├── jira.service.ts              # Service: JQL builder, issue mapping, ADF parser
│   └── dto/
│       ├── sprint-query.dto.ts       # SprintQueryDto validation
│       ├── tickets-query.dto.ts      # TicketsQueryDto validation
│       └── epic-query.dto.ts         # EpicQueryDto validation
│
├── agents/                          # Multi-agent orchestration module
│   ├── agents.module.ts             # Module definition; imports Jira & OpenRouter modules
│   ├── agents.controller.ts         # REST endpoints: /agents/list, /agents/run
│   ├── agents.service.ts            # Agent loader; maps prompts, manages configurations
│   ├── dto/
│   │   └── run-agent.dto.ts          # RunAgentDto validation
│   └── prompts/                      # Agent prompt files (markdown with YAML frontmatter)
│       ├── release-notes.md          # Release notes generator prompt
│       ├── sprint-summary.md         # Sprint summary generator prompt
│       ├── ticket-summary.md         # Individual ticket summary prompt
│       └── prd-generator.md          # Product Requirements Document generator prompt
│
├── openrouter/                      # OpenRouter streaming integration module
│   ├── openrouter.module.ts         # Module definition
│   └── openrouter.service.ts        # Service: Stream chat completions from OpenRouter
│
└── common/                          # Cross-cutting concerns
    ├── filters/
    │   └── http-exception.filter.ts  # Global exception filter; JSON error shape
    └── guards/
        └── jira-token.guard.ts       # Global guard; enforces X-Jira-Token & X-OpenRouter-Key

test/
├── app.e2e-spec.ts                  # Basic e2e smoke test
└── jest-e2e.json                    # Jest e2e configuration

Configuration Files
├── nest-cli.json                    # NestJS CLI config; asset includes for prompts
├── tsconfig.json                    # TypeScript compiler options
├── tsconfig.build.json              # Build-specific overrides
├── .eslintrc.js                     # ESLint configuration
├── .prettierrc                      # Prettier configuration
├── Dockerfile                       # Docker image definition
├── .env                             # Environment variables (dev)
├── .env.example                     # Environment variable template
└── package.json                     # Project metadata, scripts, dependencies

```

---

## 4. Framework Analysis

### NestJS Architecture

**Type:** Modular monolith with feature-based organization

#### Module Dependency Graph
```
AppModule (root)
├── ConfigModule (global)
├── JiraModule
│   └── HttpModule (Jira API client)
└── AgentsModule
    ├── JiraModule (imported for dependency)
    └── OpenRouterModule
        └── (direct axios for streaming)
```

#### Modules & Responsibility Breakdown

| Module | Controllers | Services | Purpose |
|--------|-------------|----------|---------|
| **AppModule** | AppController | — | Root bootstrap; health check |
| **JiraModule** | JiraController | JiraService | Jira API integration; issue retrieval |
| **AgentsModule** | AgentsController | AgentsService | Multi-agent orchestration; prompt loading |
| **OpenRouterModule** | — | OpenRouterService | OpenRouter API streaming integration |

---

## 5. Routes & Endpoints

### Health & Discovery

| Method | Path | Guard | Auth Required | Purpose |
|--------|------|-------|---|---------|
| GET | `/health` | JiraTokenGuard (exempt) | No | Health check; always allowed |
| POST | `/agents/list` | JiraTokenGuard (exempt) | No | List all available agents (no system prompts) |

### Jira Integration

| Method | Path | Guard | Headers Required | Purpose |
|--------|------|-------|---|---------|
| POST | `/jira/sprint` | JiraTokenGuard | X-Jira-Token | Fetch sprint issues by sprint name & optional project key |
| POST | `/jira/tickets` | JiraTokenGuard | X-Jira-Token | Fetch specific tickets by issue keys (up to 20) |
| POST | `/jira/epic` | JiraTokenGuard | X-Jira-Token | Fetch epic & all child issues |

**Request/Response Examples:**

**POST /jira/sprint**
```json
{
  "sprintName": "Sprint 42",
  "projectKey": "PROJ",
  "maxResults": 50
}
```
Response: `{ sprint, total, issues: [{key, summary, status, assignee, priority, type}] }`

**POST /jira/tickets**
```json
{
  "keys": ["PROJ-1", "PROJ-2"],
  "maxResults": 50
}
```
Response: `{ total, issues: [{...detailed}] }`

**POST /jira/epic**
```json
{
  "epicKey": "PROJ-100",
  "maxResults": 100
}
```
Response: `{ epic: {...}, children: [...], total }`

### Agent Orchestration

| Method | Path | Guard | Headers Required | Purpose |
|--------|------|-------|---|---------|
| POST | `/agents/run` | JiraTokenGuard | X-Jira-Token, X-OpenRouter-Key, X-Model (optional) | Run agent with SSE streaming |

**Request:**
```json
{
  "agentId": "release-notes",
  "formValues": {
    "version": "v2.4.0",
    "source": "Jira tickets",
    "audience": "External users"
  }
}
```

**Response:** Server-Sent Events (SSE) stream
```
data: {"content": "chunk 1"}
data: {"content": "chunk 2"}
data: [DONE]
```

---

## 6. Core Services & Business Logic

### JiraService (`src/jira/jira.service.ts`)

**Responsibilities:**
- Build JQL queries for sprints, specific tickets, and epics
- Fetch issues from Jira REST API v3
- Transform raw Jira responses into clean DTOs
- Parse Atlassian Document Format (ADF) descriptions into plain text
- Extract and map issue metadata: assignee, priority, status, labels, fix versions, comments

**Key Methods:**
- `getSprintIssues(dto, token)` — fetch all issues in a named sprint
- `getTickets(dto, token)` — fetch specific issues by key
- `getEpicWithChildren(dto, token)` — fetch epic metadata + all linked child issues
- `extractText(adf)` — recursively parse ADF tree to plain text
- `jiraSearch(jql, maxResults, token)` — low-level JQL search
- `jiraGet(path, token)` — low-level GET for issue details

**Error Handling:**
- 401/403 → `UnauthorizedException` (invalid token message)
- Other errors → `BadGatewayException` (Jira API error message)

---

### AgentsService (`src/agents/agents.service.ts`)

**Responsibilities:**
- Load all agent prompt files from `src/agents/prompts/*.md` at startup
- Parse YAML frontmatter (name, description, inputs array) from each prompt
- Expose agent configurations (without system prompts for discovery)
- Map agent IDs to Jira data route types

**Available Agents:**

| Agent ID | Name | Jira Route | Purpose | Inputs |
|----------|------|-----------|---------|--------|
| `release-notes` | Release Notes | sprint | Generate release notes from sprint issues | version, source, audience |
| `sprint-summary` | Sprint Summary | sprint | Summarize sprint progress & blockers | sprint_name, focus |
| `ticket-summary` | Ticket Summary | tickets | Summarize individual tickets | ticket_key, detail_level |
| `prd-generator` | PRD Generator | epic | Generate PRD from epic description | feature_name, description, target_users |

**Key Methods:**
- `loadAllAgents()` — read prompts from disk, parse with gray-matter
- `getAgent(id)` — retrieve agent config by ID or throw NotFoundException
- `getAllAgents()` — return all agents (used by `/agents/list`)
- `getJiraRoute(agentId)` — map agent to Jira endpoint type

---

### OpenRouterService (`src/openrouter/openrouter.service.ts`)

**Responsibilities:**
- Stream chat completions from OpenRouter API
- Handle SSE protocol parsing from OpenRouter response
- Yield content chunks as they arrive
- Error handling for auth & network failures

**Key Method:**
- `streamChat(key, model, systemPrompt, userMessage)` — async generator yielding chunks

**Features:**
- Timeout: 120 seconds
- Bearer token auth
- Proper SSE parsing (data: [...] lines)
- Handles [DONE] sentinel
- Yields only content delta chunks

---

### AgentsController (`src/agents/agents.controller.ts`)

**Orchestration Flow (POST /agents/run):**

1. **Validate & Extract:** Parse DTO, extract Jira token, OpenRouter key, model override
2. **Lookup Agent:** Get agent config (including system prompt)
3. **Fetch Jira Data:** Based on agent's mapped route, fetch from Jira
4. **Build User Message:** Combine Jira data (JSON) + form inputs (markdown key-value list)
5. **Stream Response:** Set SSE headers, iterate OpenRouter stream, write chunks to response

**Error Scenarios:**
- Agent not found → 404
- Missing tokens → 401 (caught by JiraTokenGuard)
- Jira fetch fails → propagates as BadGatewayException
- OpenRouter fails → error sent in SSE stream

---

## 7. Middleware, Guards, Filters & Pipes

### Global Guards: `JiraTokenGuard`

**Location:** `src/common/guards/jira-token.guard.ts`

**Behavior:**
- Required on all routes except `/health` and `/agents/list`
- Validates presence of `X-Jira-Token` header (non-empty string)
- For `/agents/run`: also requires `X-OpenRouter-Key` header
- Throws `UnauthorizedException` with helpful message if missing

**Implementation:** Manual header validation; no external dependencies

---

### Global Exception Filter: `AllExceptionsFilter`

**Location:** `src/common/filters/http-exception.filter.ts`

**Behavior:**
- Catches all unhandled exceptions
- Converts to JSON error response with structure:
  ```json
  {
    "statusCode": 400,
    "message": "...",
    "path": "/jira/sprint",
    "timestamp": "2026-04-18T..."
  }
  ```
- Preserves HTTP status codes from NestJS exceptions
- Falls back to 500 for non-HTTP exceptions

---

### Global Validation Pipe (in main.ts)

```typescript
new ValidationPipe({
  whitelist: true,              // Strip unknown properties
  forbidNonWhitelisted: true,   // Reject unknown properties
  transform: true,              // Transform primitives to types
})
```

**Effect:** All DTO validation via class-validator decorators; auto-reject extra fields

---

## 8. DTOs & Input Validation

### Jira DTOs

**SprintQueryDto** (`src/jira/dto/sprint-query.dto.ts`)
```typescript
sprintName: string (required)
projectKey?: string (optional)
maxResults?: number (1-100, optional)
```

**TicketsQueryDto** (`src/jira/dto/tickets-query.dto.ts`)
```typescript
keys: string[] (1-20 keys, required)
maxResults?: number (1-50, optional)
```

**EpicQueryDto** (`src/jira/dto/epic-query.dto.ts`)
```typescript
epicKey: string (required)
maxResults?: number (1-100, optional)
```

### Agent DTOs

**RunAgentDto** (`src/agents/dto/run-agent.dto.ts`)
```typescript
agentId: string (required, validated at service level)
formValues: Record<string, string> (required, key-value pairs)
```

**Validation:** Standard class-validator decorators; custom constraints on Jira service for JQL safety

---

## 9. Configuration & Environment

### Environment Variables

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `PORT` | number | No | 3000 | HTTP server port |
| `NODE_ENV` | string | No | development | Environment flag |
| `JIRA_BASE_URL` | string | Yes | — | Jira instance URL (e.g., https://org.atlassian.net) |
| `ALLOWED_ORIGIN` | string | No | * | Comma-separated CORS origins |

### Configuration Setup
- **ConfigModule:** Loaded globally in AppModule via `ConfigModule.forRoot({ isGlobal: true })`
- **Dotenv:** `.env` file automatically parsed on startup
- **Access:** Via `process.env.KEY` throughout the application

### CORS Configuration

Configured in `main.ts`:
- **Origins:** Whitelist from `ALLOWED_ORIGIN` env var (comma-separated)
- **Methods:** GET, POST, OPTIONS
- **Headers:** Content-Type, X-Jira-Token, X-OpenRouter-Key, X-Model
- **Credentials:** false (no cookies)

---

## 10. Agent Prompts

All agent prompts are stored as markdown files with YAML frontmatter in `src/agents/prompts/`:

### 1. Release Notes (`release-notes.md`)
- **Input Fields:** version, source (dropdown), audience (dropdown)
- **Task:** Generate structured release notes with version, features, bugs, breaking changes
- **Tone:** Professional; audience-aware (internal vs. external)

### 2. Sprint Summary (`sprint-summary.md`)
- **Input Fields:** sprint_name, focus (dropdown: "Blockers only" | "Full summary" | "Executive brief")
- **Task:** Summarize sprint progress, completed items, blockers, risks
- **Tone:** Project manager; status-focused

### 3. Ticket Summary (`ticket-summary.md`)
- **Input Fields:** ticket_key, detail_level (dropdown)
- **Task:** Summarize Jira ticket with description, assignee, subtasks, blockers, action items
- **Tone:** Technical program manager; actionable

### 4. PRD Generator (`prd-generator.md`)
- **Input Fields:** feature_name, description (textarea), target_users (dropdown)
- **Task:** Generate full PRD with problem statement, goals, user stories, requirements, success metrics
- **Tone:** Product manager; comprehensive

**Prompt Loading:** Prompts are read from disk on service init, parsed with `gray-matter` to separate frontmatter (JSON metadata) from content (system prompt text)

---

## 11. Testing Setup

### Unit & Integration Tests
- **Framework:** Jest (configured in package.json)
- **Test Files:** `**/*.spec.ts` (default pattern)
- **Coverage:** Collected from `src/**`
- **Output:** `coverage/` directory

### E2E Tests
- **Framework:** Jest + Supertest
- **Configuration:** `test/jest-e2e.json`
- **Test Files:** `**/*.e2e-spec.ts` pattern
- **Current Test:** Basic health check stub (`app.e2e-spec.ts`)

### Scripts
```bash
npm run test              # Unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:debug       # Debugger mode
npm run test:e2e         # E2E tests
```

---

## 12. Build & Deployment

### Build Configuration

**nest-cli.json:**
```json
{
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      {
        "include": "agents/prompts/*.md",
        "outDir": "dist"
      }
    ]
  }
}
```

**Effect:** Agent prompt .md files are copied to `dist/agents/prompts/` on build (required for runtime loading)

### Build & Run Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `nest build` | Compile TypeScript → dist/ |
| `start` | `nest start` | Run from compiled dist/ |
| `start:dev` | `nest start --watch` | Run with file watch |
| `start:debug` | `nest start --debug --watch` | Debug mode + watch |
| `start:prod` | `node dist/main` | Production runner |

### Docker

**Dockerfile:** Multi-stage build (implied)
- Installs dependencies
- Builds NestJS project
- Exposes PORT (default 3000)
- Runs `node dist/main`

---

## 13. Code Patterns & Notable Observations

### 1. **Dependency Injection**
All services are injectable and auto-registered in modules. Strong use of NestJS DI container.

### 2. **DTO Validation**
Class-validator decorators on all input DTOs; global ValidationPipe enforces whitelist + transform.

### 3. **Error Handling**
- Jira errors mapped to UnauthorizedException (401/403) or BadGatewayException
- OpenRouter errors streamed to client via SSE
- Global exception filter normalizes all error responses

### 4. **Streaming Pattern**
`/agents/run` uses Express Response SSE pattern:
- Set headers (`Content-Type: text/event-stream`, etc.)
- Iterate async generator from OpenRouterService
- Write `data: {...}\n\n` chunks
- Close with `[DONE]` sentinel

### 5. **Prompt Management**
YAML frontmatter (gray-matter) + markdown content allows agent metadata + system prompts in single file. Clean separation of concerns.

### 6. **Jira ADF Parsing**
Custom recursive tree walker to convert Atlassian Document Format → plain text. Handles nested content arrays.

### 7. **Flexible Token Passing**
Each request can override model via `X-Model` header; defaults to `qwen/qwen3-coder:free`.

---

## 14. Security Considerations

### Strengths
1. **Token-Based Auth:** X-Jira-Token and X-OpenRouter-Key required on protected routes
2. **CORS Whitelist:** Origin validation via `ALLOWED_ORIGIN` env var
3. **Input Validation:** Global ValidationPipe with whitelist + forbid unknown properties
4. **DTO Validation:** Class-validator constraints (array size limits, min/max bounds)

### Potential Improvements
1. **Rate Limiting:** No rate limiter on Jira or OpenRouter endpoints
2. **Audit Logging:** No request/response logging for compliance
3. **Secret Rotation:** Tokens passed per-request; no refresh token mechanism
4. **JQL Injection:** JQL queries built with string interpolation (though form-controlled)

---

## 15. Key Architectural Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **Module-per-feature** | Clear separation; easy to extend | Slight overhead for small features |
| **HttpModule + axios** | Flexibility for OpenRouter streaming | Dual HTTP client dependency (HttpModule + axios) |
| **Gray-matter for prompts** | Separate metadata from content; easy to extend | Additional dependency; file-based config |
| **SSE for streaming** | Standard HTTP; browser-friendly | No built-in retry; client responsible |
| **Per-request tokens** | Flexibility; no token storage | Client must manage token lifecycle |

---

## 16. File Manifest

### Source Files (total: ~523 lines)

| File | Lines | Type | Purpose |
|------|-------|------|---------|
| `src/main.ts` | 42 | Setup | Bootstrap, pipes, filters, guards, CORS |
| `src/app.module.ts` | 15 | Module | Root module; imports |
| `src/app.controller.ts` | 10 | Controller | Health endpoint |
| `src/jira/jira.module.ts` | 19 | Module | Jira module definition |
| `src/jira/jira.controller.ts` | 37 | Controller | 3 endpoints (sprint, tickets, epic) |
| `src/jira/jira.service.ts` | 168 | Service | Jira API integration; transforms |
| `src/agents/agents.module.ts` | 12 | Module | Agents module; imports |
| `src/agents/agents.controller.ts` | 137 | Controller | /agents/list, /agents/run orchestration |
| `src/agents/agents.service.ts` | 71 | Service | Agent loader; prompt parsing |
| `src/openrouter/openrouter.module.ts` | 8 | Module | OpenRouter module |
| `src/openrouter/openrouter.service.ts` | 71 | Service | OpenRouter streaming |
| `src/common/filters/http-exception.filter.ts` | 31 | Filter | Global error handler |
| `src/common/guards/jira-token.guard.ts` | 35 | Guard | Token validation guard |
| **DTOs** | — | DTO | 4 DTOs (Jira + agents) |
| **Agents** | — | Config | 4 agent prompt files |

---

## 17. Recommendations & Known Gaps

### High Priority

1. **Expand E2E Tests**
   - Current test is placeholder; add integration tests for all endpoints
   - Mock Jira & OpenRouter; test full orchestration flow
   - Test error scenarios (401, 400, 500)

2. **Add Request Logging**
   - Implement middleware to log all requests (tokens redacted)
   - Useful for debugging and audit trails

3. **JQL Safety**
   - Consider parameterized JQL or additional validation
   - Current: form-controlled inputs, but could be tighter

### Medium Priority

4. **Rate Limiting**
   - Add `@nestjs/throttler` for request rate limits
   - Protect Jira and OpenRouter API quotas

5. **Streaming Resilience**
   - Client-side retry logic for SSE (already user's responsibility)
   - Consider event IDs for resumable streams

6. **Agent Extensibility**
   - Support dynamic agent registration (not just file-based)
   - Versioning strategy for prompts

### Low Priority

7. **Metrics & Tracing**
   - Prometheus metrics for request latency, token usage
   - Distributed tracing (OpenTelemetry) for multi-service flows

8. **OpenRouter Model Validation**
   - Validate model string against known models before sending
   - Cache model list periodically

---

## 18. Dependencies Summary

**Total Packages:** 23 (runtime) + 18 (dev)

**Notable External Dependencies:**
- `gray-matter` — YAML frontmatter parsing (1 dependency)
- `@nestjs/axios` — HTTP integration (lightweight wrapper)
- `axios` — Direct HTTP for streaming (no alternative in NestJS)

**No Major Risks:** All packages are actively maintained; no deprecated APIs in use.

---

## Conclusion

The AgentDesk MCP backend is a well-structured NestJS application that bridges Jira ticket management with AI agents. Its modular design, strong input validation, and clear separation of concerns make it maintainable and extensible. The SSE streaming pattern for agent responses is efficient and browser-compatible. Future enhancements should focus on testing, logging, and rate limiting to prepare for production scale.

