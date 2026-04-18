---
name: AgentDesk MCP Backend Architecture
description: NestJS REST API for AI-powered Jira agent orchestration with SSE streaming
type: project
---

**AgentDesk MCP Backend** — A NestJS REST API that bridges Jira ticket management with AI agents (OpenRouter).

## Architecture Summary

**Type:** Modular NestJS monolith with feature-based module organization

**Core Modules:**
- **AppModule** (root) → imports JiraModule, AgentsModule, ConfigModule
- **JiraModule** → JiraService + JiraController (3 endpoints for sprint/tickets/epic retrieval)
- **AgentsModule** → AgentsService + AgentsController (agent discovery + orchestration)
- **OpenRouterModule** → OpenRouterService (SSE streaming for AI responses)

## Key Technical Decisions

1. **SSE Streaming Pattern** — Async generators for OpenRouter responses; client receives real-time chunks without waiting for completion
2. **Markdown-Based Agents** — Agent prompts stored as `.md` files with YAML frontmatter (gray-matter parser); metadata + system prompt in single file
3. **Per-Request Tokens** — Jira & OpenRouter keys passed as headers (X-Jira-Token, X-OpenRouter-Key); no token storage/refresh mechanism
4. **Global ValidationPipe** — All DTOs validated with whitelist + forbidNonWhitelisted + transform
5. **Jira ADF Parser** — Custom recursive tree walker to convert Atlassian Document Format descriptions to plain text

## Available Agents

- `release-notes` (sprint → release notes generator)
- `sprint-summary` (sprint → sprint status summary)
- `ticket-summary` (tickets → individual ticket summary)
- `prd-generator` (epic → Product Requirements Document)

## Security Model

- **Auth:** Token-based on protected endpoints (X-Jira-Token required, X-OpenRouter-Key required for /agents/run)
- **CORS:** Whitelist via ALLOWED_ORIGIN env var
- **Validation:** Global whitelist + DTO constraints (array size, min/max bounds)
- **Gaps:** No rate limiting, request logging, or token rotation strategy

## Tech Stack

- **Runtime:** NestJS 10, Express, TypeScript 5.1, class-validator, class-transformer, gray-matter
- **HTTP Clients:** @nestjs/axios (Jira) + axios (OpenRouter streaming)
- **Testing:** Jest, Supertest (basic e2e stub exists)

## Known Gaps for Production

1. **Testing** — E2E tests are placeholder; need comprehensive coverage of all endpoints and error paths
2. **Observability** — No request logging, no metrics, no distributed tracing
3. **Rate Limiting** — No throttling on Jira/OpenRouter endpoints
4. **Agent Extensibility** — File-based only; no dynamic registration or versioning

## Code Quality

- ~523 lines of TypeScript across 11 source files
- Clean separation of concerns; modular imports/exports
- Strong input validation; consistent error handling
- Flexible model override via X-Model header (defaults to claude-sonnet-4)

## Integration Points

- **Jira API v3:** Bearer token auth; JQL-based issue search
- **OpenRouter API:** Bearer token auth; SSE streaming for chat/completions endpoint

**Why This Matters:** AgentDesk frontend (FE) calls this backend to run agents. The backend fetches Jira context, orchestrates the AI call, and streams responses back as SSE for real-time UX.
