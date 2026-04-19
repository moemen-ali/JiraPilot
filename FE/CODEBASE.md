# JiraPilot Frontend — Codebase Report
_Generated: 2026-04-20_

## 1. Project Overview

**JiraPilot** is a Next.js 14 frontend for an AI-powered agent orchestration platform. It provides a desktop-like interface for running pre-built "agents" that fetch Jira data, process it with LLMs (via OpenRouter), and generate structured documents (bug reports, sprint summaries, PRD proposals, etc.). The frontend communicates with a NestJS backend MCP server and stores all credentials and configuration locally in browser localStorage.

- **Framework**: Next.js 14.2.35 (App Router)
- **UI Approach**: Client-side React components with CSS Modules + inline CSS-in-JS
- **State Management**: React hooks (useState, useCallback, useEffect, useRef) + localStorage
- **Key Features**: Multi-agent dashboard, real-time SSE streaming, PDF export, connection testing, workspace/sprint dropdowns, addon toggles, run history, theme toggle

## 2. Tech Stack & Dependencies

### Core Dependencies
- **next** `14.2.35` — React framework with App Router
- **react** `^18` — UI library
- **react-dom** `^18` — DOM rendering
- **geist** `^1.7.0` — Geist Design System (UI primitives & icons)
- **react-markdown** `^10.1.0` — Markdown rendering
- **@react-pdf/renderer** `^4.4.1` — PDF generation
- **gray-matter** `^4.0.3` — YAML frontmatter parsing

### Build & Development
- npm scripts: `dev`, `build`, `start`, `lint`
- TypeScript via Next.js defaults
- ESLint

## 3. Directory Structure

```
FE/
├── src/
│   ├── app/
│   │   ├── layout.jsx             # Root layout with Google fonts
│   │   ├── page.jsx               # Main dashboard (3-column layout, ~1455 lines)
│   │   ├── settings/page.jsx      # Redirect to Settings
│   │   └── page.module.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Atoms.jsx          # Button, Input, Badge, etc.
│   │   │   └── Icons.jsx          # Geist icons
│   │   └── [legacy components]    # AgentSelector, InputForm, OutputPanel, PdfExporter (unused)
│   ├── hooks/
│   │   ├── useAgentList.js
│   │   ├── useAgentRunner.js
│   │   ├── useRunHistory.js
│   │   └── usePdfExport.js
│   ├── lib/
│   │   ├── mcpClient.js           # Backend API client
│   │   └── agentParser.js         # gray-matter parser (unused in page.jsx)
│   └── styles/
│       └── globals.css
├── public/
│   └── agents/                    # Static agent markdown files (not used by app)
├── next.config.mjs
├── package.json
└── tsconfig.json
```

## 4. Framework Analysis: Next.js 14 (App Router)

### Routing & Pages
- **app/page.jsx** — Main dashboard. Single large client component (~1455 lines) containing all UI components.
- **app/settings/page.jsx** — Redirects to Settings view in main page.
- **app/layout.jsx** — Root layout with Google Fonts, metadata, CSS variables.

### Rendering Strategy
- **CSR (Client-Side Rendering)**: All pages marked with `'use client'`. No SSR or SSG.
- **No API Routes**: Backend communication via fetch() to external NestJS MCP server URL.

### Data Fetching
- useAgentList → POST `/agents/list`
- useAgentRunner → POST `/agents/run` + SSE stream
- Jira Projects → POST `/jira/projects`
- Jira Sprints → POST `/jira/sprints`
- Connection Testing → POST `/jira/sprint`, GET openrouter.ai/api/v1/models
- Custom headers: X-Jira-Token, X-OpenRouter-Key, X-Model, X-Jira-Email

### State Management
- React hooks (useState, useCallback, useEffect, useRef)
- localStorage for persistence:
  - Credentials: JIRAPILOT_USERNAME, JIRAPILOT_JIRA_EMAIL, JIRAPILOT_JIRA_TOKEN, JIRAPILOT_OPENROUTER_KEY, JIRAPILOT_MCP_URL, JIRAPILOT_MODEL, JIRAPILOT_JIRA_URL
  - UI: PILOT_THEME, JIRAPILOT_CONN_STATUS (JSON)
  - Workspaces: JIRAPILOT_WORKSPACES (JSON array of {id, key, name})
  - History: JIRAPILOT_RUN_HISTORY (max 50)

### Main Components (all in page.jsx)
- **Home** — Root page component, manages agents, inputs, theme, connection status
- **NavAside** — Left sidebar with logo, nav, user profile, theme toggle
- **AgentsListPane** — Middle pane with searchable agent list
- **RecentRunsPane** — Middle pane with run history
- **SettingsNavPane** — Settings nav stubs
- **SettingsBody** — Connection settings + test UI + workspaces list
- **ToggleInput** — Pill-style toggle switch for addon inputs
- **JiraProjectSelect** — Workspace dropdown reading from localStorage JIRAPILOT_WORKSPACES
- **JiraSprintSelect** — Sprint dropdown fetching from POST /jira/sprints based on selected project
- **RunPanel** — Agent inputs (with jira-project, jira-sprint, toggle support) + live output + connection status
- **PdfPreviewModal** — PDF preview + download modal
- **Markdown/PdfMarkdown** — Custom markdown renderers (dependency-free)
- Helper components: RunStatus, EmptyOutput, ToolCallRow, ConnectionRow

## 5. Key Hooks & API Integration

### useAgentList(mcpUrl)
**Purpose**: Fetch available agents from backend.
- Returns: `{ agents, loading, error }`
- Agent shape: `{ id, name, description, blurb, tone, toneLabel, est, inputs, lastRun }`
- Input types supported: `text`, `textarea`, `select`, `toggle`, `jira-project`, `jira-sprint`
- Endpoint: POST `/agents/list`
- Location: src/hooks/useAgentList.js

### useAgentRunner()
**Purpose**: Execute agent and stream SSE output.
- State: output, isStreaming, tools, error, runState (idle/running/done)
- run(agent, formValues) — validates credentials in localStorage, executes agent, iterates SSE events
  - content events append to output
  - tool_use events track Jira calls (displayed as "MCP · Jira")
  - tool_result marks tools as done
- abort() — stops streaming via AbortController
- reset() — clears all state
- Credentials read from: JIRAPILOT_JIRA_TOKEN, JIRAPILOT_JIRA_EMAIL, JIRAPILOT_OPENROUTER_KEY, JIRAPILOT_MCP_URL, JIRAPILOT_MODEL
- Location: src/hooks/useAgentRunner.js

### useRunHistory()
**Purpose**: localStorage-based run history.
- addRun(entry) — prepends to history (max 50)
- clearRuns() — delete all
- Adds computed `when` field (relative time: "5m ago", etc.)
- Location: src/hooks/useRunHistory.js

### usePdfExport()
**Purpose**: Generate downloadable PDF from markdown.
- exportPdf(markdown, agentName) — uses @react-pdf/renderer
- Filename: {agentName-lowercase}-{date}.pdf
- Location: src/hooks/usePdfExport.js

### MCP Client (lib/mcpClient.js)
- **listAgents(mcpBaseUrl)** — POST /agents/list
- **fetchProjects(mcpBaseUrl, jiraToken, jiraEmail)** — POST /jira/projects — lists accessible Jira workspaces
- **fetchSprints(mcpBaseUrl, jiraToken, jiraEmail, projectKey)** — POST /jira/sprints — lists active/future sprints for a project
- **testJiraConnection(mcpBaseUrl, jiraToken, jiraEmail)** — POST /jira/sprint with test query
- **testOpenRouterConnection(openRouterKey)** — GET OpenRouter models endpoint
- **runAgent(mcpBaseUrl, jiraToken, jiraEmail, orKey, model, agentId, formValues)** — POST /agents/run, returns SSE Response
- **readSSEStream(response)** — async generator parsing SSE events (content, tool_use, tool_result)

## 6. Components & Services

### Pages
| Component | File | Purpose |
|-----------|------|---------|
| Home | app/page.jsx | Main 3-column dashboard |
| RootLayout | app/layout.jsx | App wrapper with fonts |
| SettingsRedirect | app/settings/page.jsx | Redirect to main Settings |

### Panes (in app/page.jsx)
| Component | Purpose |
|-----------|---------|
| NavAside | Left sidebar with logo, nav, user info, theme toggle |
| AgentsListPane | Agent list + search (shows agents from /agents/list) |
| RecentRunsPane | Run history from localStorage |
| SettingsNavPane | Settings navigation stubs |
| SettingsBody | Connection settings + test + workspaces list |

### Dynamic Input Components (in app/page.jsx)
| Component | Purpose |
|-----------|---------|
| ToggleInput | Pill-style toggle switch. `checked` drives color + knob position. onChange sends boolean, stored as string "true"/"false" |
| JiraProjectSelect | Reads JIRAPILOT_WORKSPACES from localStorage, renders Select dropdown. Shows placeholder if no workspaces cached |
| JiraSprintSelect | Fetches sprints from POST /jira/sprints when projectKey prop changes. Shows loading spinner, empty state, or Select with active/future sprints |

### RunPanel Input Rendering
The RunPanel filters inputs by type:
1. **Regular inputs** (text, textarea, select, jira-project, jira-sprint) rendered in the main input grid
2. **Toggle inputs** rendered in a separate "Add-ons" section with border separators below the main grid
3. **jira-project** inputs use `JiraProjectSelect` component
4. **jira-sprint** inputs use `JiraSprintSelect` component, reading `field.dependsOn` to get the project key from form values
5. Toggle default values are set via the existing `seed[f.id] = f.default || ''` loop when switching agents
6. All form values (including toggles as "true"/"false" strings) are sent in the `formValues` object to the backend

### SettingsBody Workspaces
After a successful Jira connection test:
1. Calls `fetchProjects()` to list accessible Jira projects
2. Stores projects in component state + `localStorage['JIRAPILOT_WORKSPACES']`
3. Renders a scrollable "Workspaces (N)" panel showing project key + name for each

### UI Atoms (components/ui/Atoms.jsx)
Button, Input, Textarea, Select, Label, Divider, StatusDot, Spinner, Kbd, Badge, IconBtn

### Hooks (hooks/)
| Hook | Purpose |
|------|---------|
| useAgentList | Fetch agents from backend |
| useAgentRunner | Execute agent + SSE stream |
| useRunHistory | localStorage history |
| usePdfExport | PDF generation |

### Services (lib/)
| Service | Purpose |
|---------|---------|
| mcpClient | Backend API client (agents, jira projects/sprints, connection testing, SSE streaming) |

## 7. Agent Input Types

The frontend supports these dynamic input types (defined in agent markdown frontmatter):

| Type | Component | Description |
|------|-----------|-------------|
| `text` | Input | Free-text input with placeholder |
| `textarea` | Textarea | Multi-line text input |
| `select` | Select | Dropdown with `options` array |
| `toggle` | ToggleInput | Boolean switch (on/off), stored as "true"/"false" strings |
| `jira-project` | JiraProjectSelect | Workspace dropdown populated from localStorage cache |
| `jira-sprint` | JiraSprintSelect | Sprint dropdown fetched dynamically; depends on `dependsOn` field |

### Toggle Values
All toggle values are stored as strings ("true" or "false") in `formValues`, since the form state uses `Record<string, string>`. The `ToggleInput` component converts between boolean UI state and string storage:
- `checked={inputs[field.id] === 'true'}` — reads string, compares to "true"
- `onChange={(checked) => setInputs({...inputs, [field.id]: String(checked)})}` — writes string

### Sprint Drop-down Dependency
The `jira-sprint` input type uses a `dependsOn` field in the frontmatter that names the `id` of the `jira-project` input. When the project selection changes, `JiraSprintSelect` re-fetches sprints from the backend:
```
inputs:
  - id: project_key
    type: jira-project
  - id: sprint_id
    type: jira-sprint
    dependsOn: project_key
```
In the RunPanel, `JiraSprintSelect` receives `projectKey={inputs[field.dependsOn] || ''}` and triggers a `fetchSprints()` call via useEffect when projectKey changes.

## 8. Configuration & Environment

### localStorage Keys
- JIRAPILOT_USERNAME — Display name
- JIRAPILOT_JIRA_EMAIL — Atlassian email
- JIRAPILOT_JIRA_TOKEN — Jira API token
- JIRAPILOT_OPENROUTER_KEY — OpenRouter API key
- JIRAPILOT_MCP_URL — Backend server URL
- JIRAPILOT_JIRA_URL — Jira base URL (stored but not used in API calls)
- JIRAPILOT_MODEL — LLM model (default: qwen/qwen3-coder:free)
- PILOT_THEME — Theme (dark/light)
- JIRAPILOT_CONN_STATUS — Connection test results (JSON: {jira, jiraMsg, openrouter, openrouterMsg})
- JIRAPILOT_WORKSPACES — Jira projects cache (JSON array: [{id, key, name}])
- JIRAPILOT_RUN_HISTORY — Run history (JSON array, max 50)

### Design Tokens (src/styles/globals.css)
Colors: --brand, --ink, --ink-60, --ink-82, --on-dark, --bg, --bg-sunken, --bg-raised, --border, --border-soft, --border-strong, --ok, --err, --warn
Agent Tones: --agent-pm-bg, --agent-pm, --agent-release-bg, --agent-release, --agent-data
Spacing: --r-sm, --r-md, --r-lg, --r-pill
Timing: --t-fast, --ease
Fonts: --font-inter, --font-instrument-serif, --font-jetbrains-mono
Shadows: --shadow-inset

## 9. Testing Setup

No test infrastructure. No Jest/Vitest configuration present.

## 10. Notable Patterns & Observations

### Strengths
1. **Monolithic Dashboard**: Single page.jsx makes data flow easy to trace
2. **Streaming-First**: Full SSE support with real-time tool tracking
3. **No Backend Credential Storage**: Credentials in localStorage only
4. **Custom Markdown Renderer**: Dependency-free markdown parsing
5. **Run History**: Persistent history with relative timestamps
6. **Connection Testing**: Pre-flight validation for Jira + OpenRouter
7. **Workspace Caching**: Jira projects cached in localStorage for dropdown population
8. **Dynamic Sprint Fetching**: Sprint dropdown updates automatically when project selection changes
9. **Addon Toggles**: Bug Report uses toggle inputs to conditionally enable/disable report sections

### Areas for Improvement
1. **No Error Boundaries**: Single error crashes entire app
2. **Large Monolithic File**: page.jsx is ~1455 lines
3. **Heavy Inline CSS**: Lots of inline style objects
4. **No TypeScript**: All .jsx files untyped
5. **Unused Legacy Components**: AgentSelector, InputForm, OutputPanel, PdfExporter
6. **No Tests**: Zero test coverage
7. **Hardcoded Values**: Model names, timeouts, defaults

### Recent Changes (2026-04-20)
1. **Bug Report Agent**: New primary agent with 6 addon toggles (bug report enabled by default, others disabled)
2. **Workspace Listing**: After successful Jira test, fetches projects via POST /jira/projects and caches in localStorage
3. **Sprint Dropdown**: Sprint Summary uses jira-project + jira-sprint dropdowns instead of free-text sprint name
4. **Toggle Input Component**: ToggleInput pill-style switch for addon toggles
5. **JiraProjectSelect**: Dropdown reading from localStorage workspaces
6. **JiraSprintSelect**: Dynamic dropdown fetching sprints based on selected project
7. **Add-ons Section**: Toggle inputs rendered below regular inputs with border separators
8. **mcpClient.js**: Added fetchProjects() and fetchSprints() API calls
9. **SettingsBody**: Shows workspace list after successful Jira connection test

## 11. Recommendations

### Immediate
1. Refactor page.jsx into separate component files
2. Add TypeScript (.tsx)
3. Add Error Boundary
4. Remove unused legacy components
5. Set up Jest/Vitest

### Mid-Term
1. Migrate credentials from localStorage to OAuth/session auth
2. Adopt TailwindCSS or CSS Modules
3. Add form validation library (react-hook-form, zod)
4. Improve accessibility (ARIA, keyboard nav, contrast)

### Documentation
- Document MCP server contract (endpoints, request/response shapes)
- Document agent prompt format (frontmatter + body)
- Add JSDoc comments to hooks and API clients