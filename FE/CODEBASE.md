# AgentDesk FE — Codebase Report
_Generated: 2026-04-18_

## 1. Project Overview

**AgentDesk** is a Next.js 14.2 frontend application for orchestrating AI agents. It provides a three-pane layout for agent selection, recent run history, settings management, and execution of agents with real-time streaming output and PDF export capabilities.

- **Version**: 0.1.0
- **Status**: Active development (bootstrap via create-next-app)
- **Router Type**: Next.js App Router (13.4+)
- **Styling**: Custom CSS with design tokens (light + dark theme support)
- **Client Framework**: React 18, JSX components (100% client-side after initial load)

## 2. Tech Stack & Dependencies

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.2.35 | Full-stack React framework with App Router |
| `react` | ^18 | UI component library |
| `react-dom` | ^18 | React DOM rendering |
| `@react-pdf/renderer` | ^4.4.1 | Server-side PDF generation from React components |
| `geist` | ^1.7.0 | Vercel's design system (installed but not heavily used; custom tokens take precedence) |
| `gray-matter` | ^4.0.3 | YAML/Markdown front-matter parser (for agent metadata) |
| `react-markdown` | ^10.1.0 | Client-side Markdown rendering (unused; custom renderer in use) |

### Build & Configuration
- **Module system**: ESM (next.config.mjs, package.json type: module via Next.js defaults)
- **JS config**: jsconfig.json with path alias `@/*` → `./src/*`
- **Package manager**: npm (package-lock.json present)
- **Linting**: next lint (Next.js built-in ESLint config)

### Unused/Minimal Dependencies
- `geist`: Imported in layout but not referenced in components (custom design tokens used instead)
- `react-markdown`: Installed but unused (custom Markdown renderer built inline in page.jsx)

## 3. Directory Structure

```
d:\Work\AgentDesk\FE/
├── public/
│   └── agents/                    # Markdown definitions for agent metadata + prompts
│       ├── prd-generator.md
│       ├── release-notes.md
│       ├── sprint-summary.md
│       └── ticket-summary.md
│
├── src/
│   ├── app/
│   │   ├── layout.jsx             # RootLayout with global fonts, metadata, theming
│   │   ├── page.jsx               # Main dashboard (HOME), 1200+ lines, core UI
│   │   └── settings/
│   │       └── page.jsx           # Settings page (currently unused, scaffold)
│   │
│   ├── components/
│   │   ├── PdfExporter.jsx        # React PDF document wrapper
│   │   ├── InputForm.jsx          # (listed but not found in codebase)
│   │   ├── OutputPanel.jsx        # (listed but not found in codebase)
│   │   ├── AgentSelector.jsx      # (listed but not found in codebase)
│   │   └── ui/
│   │       ├── Atoms.jsx          # 345-line component library (Button, Input, Badge, etc.)
│   │       └── Icons.jsx          # 71-line SVG icon set (I.Logo, I.Grid, I.Play, etc.)
│   │
│   ├── hooks/
│   │   ├── useAgentList.js        # Loads agent .md files from /public/agents
│   │   ├── useAgentRunner.js      # Orchestrates agent execution + SSE streaming
│   │   └── usePdfExport.js        # Triggers PDF download via @react-pdf/renderer
│   │
│   ├── lib/
│   │   ├── agentParser.js         # Parses gray-matter YAML → agent object
│   │   └── mcpClient.js           # HTTP client for MCP backend + SSE reader
│   │
│   └── styles/
│       └── globals.css            # Design tokens + CSS resets (light + dark themes)
│
├── .next/                         # Build output (Next.js cache)
├── .gitignore
├── jsconfig.json                  # Path alias config
├── next.config.mjs                # Empty Next.js config
├── package.json                   # Dependencies + scripts
├── package-lock.json
└── README.md                      # Bootstrap template (minimal)
```

**Note:** Three components listed in file discovery (InputForm, OutputPanel, AgentSelector) do not exist in the codebase; they may have been planned but are not implemented. All logic is contained in `page.jsx`.

## 4. Framework Analysis

### Next.js Configuration
- **App Router**: Yes (src/app/ directory structure)
- **Pages Router**: No
- **Static Config**: next.config.mjs is empty (defaults applied)
- **Fonts**: Google Fonts loaded in RootLayout
  - `Inter` (300–700 weight, variable)
  - `Instrument_Serif` (400 weight, variable)
  - `JetBrains_Mono` (400–500 weight, variable)
- **Metadata**: Set at root level (`title: 'Pilot'`, `description: 'AI agents for your team'`)
- **Theme Attribute**: `data-theme="dark"` set on `<html>` element; toggled at runtime via localStorage

### Routes
| Path | Component | Type | Rendering | Purpose |
|------|-----------|------|-----------|---------|
| `/` | `page.jsx` | App Router | **Client-side** (marked 'use client') | Main dashboard: 3-pane layout, agent selection, execution |
| `/settings` | `settings/page.jsx` | App Router | Not implemented (scaffold) | Placeholder for future settings UI |

### Client-Side Architecture
All interactive state lives in the client (React hooks). The app is a **single-page application (SPA)** post-hydration.

**Key Client Components (all in `/app/page.jsx`):**
- `Home()` — root/orchestrator (agents list, selected agent, view mode)
- `NavAside()` — left sidebar (nav sections, theme toggle, user profile)
- `AgentsListPane()` — middle: agent list with search
- `RecentRunsPane()` — middle: recent run history (mock data)
- `SettingsNavPane()` — middle nav for settings
- `RunPanel()` — right: agent inputs, output, tools execution log
- `PdfPreviewModal()` — fullscreen modal for PDF preview before download
- `Markdown()` / `PdfMarkdown()` — custom inline Markdown renderer (no external deps)
- Helper components: `NavSection`, `NavItem`, `AgentRow`, `RunStatus`, `ToolCallRow`, `ConnectionRow`, `EmptyOutput`, `Toast`

### Styling Approach
1. **Design Tokens** (CSS custom properties):
   - Defined in `globals.css` with `:root[data-theme="light"]` and `:root[data-theme="dark"]` selectors
   - Warm, accessible palette (greens, browns, tans)
   - Color stops: `--bg`, `--ink`, `--border`, `--brand`, `--ok`, `--warn`, `--err`
   - Agent-specific colors: `--agent-pm`, `--agent-eng`, `--agent-data`, `--agent-release` (with backgrounds)
2. **Inline Styles**: All component styling via React `style={}` objects (no CSS Modules or Tailwind)
3. **Theme Toggle**: Stored in `localStorage` as `PILOT_THEME` ('light' or 'dark')
4. **Animations**: CSS keyframes (fade-in, spin, pulse, blink) defined in globals.css
5. **Responsive**: CSS Grid for layout (3 panes with fixed widths: 232px | 340px | 1fr)

## 5. Key Modules / Pages / Routes

### `/` (Home / Dashboard)
**File:** `src/app/page.jsx` (1200+ lines, heavily commented)

**State Management:**
```javascript
const [activeId, setActiveId] = useState(null);           // Selected agent ID
const [view, setView] = useState('agents');              // 'agents'|'runs'|'settings'
const [inputs, setInputs] = useState({});                // Form inputs for agent
const [pdfOpen, setPdfOpen] = useState(false);           // PDF modal state
const [toast, setToast] = useState(null);               // Toast notification
const [theme, setTheme] = useState('dark');              // Theme toggle
const { agents, loading } = useAgentList();              // Loaded agent list
const { output, runState, tools, error, run, abort, reset } = useAgentRunner(); // Execution state
const { exportPdf } = usePdfExport();                    // PDF export handler
```

**Key Interactions:**
1. **Agent Selection**: Click agent in middle pane → sets `activeId` → resets inputs/output
2. **Run Agent**: Fill inputs → click "Run agent" → `useAgentRunner.run()` → SSE stream
3. **PDF Export**: On completion, auto-open modal → user downloads
4. **Settings**: Click "Settings" in nav → `SettingsBody` renders connection form with localStorage persistence
5. **Theme Toggle**: Click moon/sun icon → update DOM + localStorage

**Mock Data:**
- `RECENT_RUNS`: 6 hardcoded run history items (unused in production)
- `SETTINGS_FIELDS`: Connection form schema (5 fields: OpenRouter key, Jira token, MCP URL, etc.)

### UI Component Library (`ui/Atoms.jsx` + `ui/Icons.jsx`)

**Atoms.jsx (345 lines):**
| Component | Props | Notes |
|-----------|-------|-------|
| `Button` | variant, size, icon, children, disabled, loading | Supports 'primary', 'brand', 'default', 'ghost', 'outline', 'danger' |
| `Spinner` | size | Rotating border animation |
| `IconBtn` | children, active, title, onMouseEnter, onMouseLeave | Icon-only button with hover states |
| `Badge` | tone, children | Tones: neutral, pm, eng, data, release, ok, warn, err |
| `Kbd` | children | Keyboard key visual (e.g., `<Kbd>⌘</Kbd>`) |
| `Input` | standard HTML input props + style | Focus ring with design token color |
| `Textarea` | standard HTML textarea props + style | Focus ring, resizable |
| `Select` | children (options), style | Custom chevron SVG dropdown |
| `Label` | children, htmlFor, hint | Optional hint text on right |
| `Divider` | vertical, style | Horizontal or vertical line |
| `Card` | children, padding, raised, style | Raised or flat card background |
| `SegmentedControl` | options, value, onChange, size | Tab-like control |
| `StatusDot` | tone, pulse | Colored dot (ok/warn/err) with optional pulse animation |

**Icons.jsx (71 lines):**
- Custom SVG icon factory `Icon()` component with 16px grid, 1.5 stroke width
- Exported as `I` object with 25+ icons: Logo, Play, Stop, Grid, Clock, Users, Gear, Search, Check, Download, FileText, FilePdf, Jira, Sparkle, Key, Link, Bolt, Copy, Refresh, Book, Warning, Moon, Sun, etc.
- All icons use `currentColor` for theming

## 6. Components & Services Inventory

### Hooks (Custom)

**`useAgentList()`** (`src/hooks/useAgentList.js`)
- Fetches agent definitions from `/public/agents/*.md` on mount
- Parses each file with `parseAgent()` (gray-matter + content)
- Returns: `{ agents, loading, error }`
- Agent files: 4 hardcoded IDs (release-notes, prd-generator, ticket-summary, sprint-summary)

**`useAgentRunner()`** (`src/hooks/useAgentRunner.js`)
- Orchestrates execution of an agent against backend MCP server
- Reads credentials from localStorage (Jira token, OpenRouter key, MCP URL, model name)
- Calls `mcpClient.runAgent()` → SSE response
- Streams events: `content` (text chunks), `tool_use` (MCP call), `tool_result` (completion)
- Returns: `{ output, runState ('idle'|'running'|'done'), tools[], error, run(), abort(), reset() }`
- AbortController used for cancellation

**`usePdfExport()`** (`src/hooks/usePdfExport.js`)
- Wraps `@react-pdf/renderer` API
- Takes markdown content + title → generates PDF blob → triggers download
- Uses `ReactPdfDocument` component for rendering

### Services (Utilities)

**`agentParser.js`** (`src/lib/agentParser.js`)
- Exports `parseAgent(mdContent, id)`
- Uses `gray-matter` to extract YAML front-matter from `.md` files
- Front-matter keys: `name`, `description`, `blurb`, `tone`, `toneLabel`, `est`, `lastRun`, `inputs` (array)
- Returns agent object with parsed metadata + markdown body as system prompt

**`mcpClient.js`** (`src/lib/mcpClient.js`)
- Exports `runAgent(mcpBaseUrl, jiraToken, orKey, model, agentId, formValues)`
  - POSTs to `{mcpBaseUrl}/agents/run`
  - Headers: X-Jira-Token, X-OpenRouter-Key, X-Model
  - Body: `{ agentId, formValues }`
  - Returns Response object with SSE stream
- Exports `readSSEStream(response)` async generator
  - Parses `data: ` prefixed JSON lines
  - Yields: `{ type, text/id/name/input/... }`
  - Stops on `[DONE]` marker

## 7. Configuration & Environment

### Environment Variables
All credentials stored in **browser localStorage** (no backend .env):
| Key | Example | Used By |
|-----|---------|---------|
| `AGENTDESK_OPENROUTER_KEY` | sk-... | useAgentRunner (API inference) |
| `AGENTDESK_JIRA_TOKEN` | ... | useAgentRunner (auth header) |
| `AGENTDESK_MCP_URL` | http://localhost:3001 | useAgentRunner (backend URL) |
| `AGENTDESK_JIRA_URL` | https://yourorg.atlassian.net | Settings UI (unused in execution) |
| `AGENTDESK_MODEL` | qwen/qwen3-coder:free-5 | useAgentRunner (default model) |

**Theme Preference:**
| Key | Values | Location |
|-----|--------|----------|
| `PILOT_THEME` | 'light' or 'dark' | localStorage, synced to `document.documentElement.dataset.theme` |

### Files
- `jsconfig.json`: Path alias `@/*` → `./src/*` for imports
- `next.config.mjs`: Empty (all defaults)
- `.gitignore`: Standard Next.js template

### Design Tokens (globals.css)

**Light Theme** (`data-theme="light"`):
- `--bg: #f7f4ed`, `--bg-raised: #fcfbf8`, `--bg-sunken: #f0ede4`
- `--ink: #1c1c1c` (text), `--ink-60: rgba(..., 0.60)` (secondary)
- `--brand: #2e6f5e` (sage green), `--brand-soft: #d9ebe3`
- Agent colors: PM (brown #b65c2a), Eng (olive #5d6a3c), Data (blue #4a5a8a), Release (tan #8a5a3c)

**Dark Theme** (`data-theme="dark"`):
- `--bg: #1a1917`, `--bg-raised: #22211e`, `--bg-sunken: #141412`
- `--ink: #f4f1ea` (light text), `--ink-60: rgba(..., 0.62)`
- `--brand: #7fbfa8` (lighter sage), `--brand-soft: #243530`
- Agent colors: Adjusted for dark (lighter, desaturated)

**Shared:**
- Radii: `--r-sm: 6px`, `--r-md: 8px`, `--r-lg: 12px`, `--r-pill: 9999px`
- Transitions: `--t-fast: 120ms`, `--t-med: 220ms`, `--ease: cubic-bezier(0.2, 0.7, 0.2, 1)`
- Shadows: inset, focus, card
- Ring (focus): `var(--ring)` rgba with opacity

## 8. Testing Setup

**Current Status:** None.
- No test files (Jest, Vitest, or Cypress)
- No test runners configured in package.json
- No .test.js, .spec.js files

## 9. Notable Patterns & Observations

### Architecture Patterns
1. **Monolithic Page**: All UI logic lives in `/app/page.jsx` (1200+ lines). No component extraction despite size.
2. **Client-Only SPA**: Marked `'use client'` in page.jsx; entire app is client-side after hydration. No SSR data fetching or layouts.
3. **Streaming + SSE**: Backend integration uses Server-Sent Events for real-time agent output streaming.
4. **Dependency-Free Rendering**: Custom Markdown renderer (inline in page.jsx) replaces react-markdown; icons are custom SVGs instead of icon library.

### State Management
- React hooks only (useState, useRef, useCallback, useEffect)
- No Redux, Zustand, or Jotai
- State is local to component; `useAgentRunner` encapsulates execution logic

### Styling
- No build-time CSS-in-JS (Styled Components, Emotion)
- No CSS Modules
- No Tailwind (though geist dep suggests it was considered)
- All inline React `style={}` objects with design tokens
- Theme toggle is runtime DOM attribute change

### API Integration
- Backend contract via single endpoint: POST `/agents/run` (streaming SSE)
- No REST CRUD operations; entirely request-response for execution
- Credentials passed as HTTP headers (X-Jira-Token, X-OpenRouter-Key, X-Model)

### Form Handling
- Manual state (inputs object) instead of react-hook-form
- No validation framework
- Reset via seed object from agent metadata

### Security Notes
- **Issue**: API credentials stored in browser localStorage (visible in DevTools)
- **Mitigated by**: Comment in Settings body: "Acceptable for a small trusted team. Rotate keys if a machine leaves the org."
- No HTTPS enforcement, CSRF protection, or XSS sanitization visible

### Unused/Dead Code
- `geist` dependency: installed but not used (custom tokens override)
- `react-markdown` dependency: installed but custom renderer used
- Three components listed (InputForm, OutputPanel, AgentSelector) don't exist
- RECENT_RUNS mock data: hardcoded but never updated
- Settings `/app/settings/page.jsx`: exists but largely a scaffold

### Performance Observations
1. **Grid Layout**: 3-pane layout uses CSS Grid (efficient)
2. **List Virtualization**: Not implemented; agent list is small (4 items), so likely not needed
3. **Bundle Size**: Custom components + no external UI library helps keep bundle lean
4. **Markdown Rendering**: Inline regex-based parser is lightweight but doesn't handle complex Markdown

## 10. Recommendations

### High Priority
1. **Extract components**: Break `page.jsx` into smaller files for maintainability.
   - `components/NavAside.jsx`, `components/RunPanel.jsx`, `components/PdfPreviewModal.jsx`
2. **Add tests**: Unit tests for hooks (useAgentRunner, useAgentList) and utility functions; e2e tests for agent execution flow.
3. **Implement settings page**: `/settings` currently unused. Integrate with root page state or implement as standalone.
4. **Migrate credentials**: Move localStorage-based secrets to environment variables or a secure backend API (OAuth, session tokens).

### Medium Priority
5. **Clean up dependencies**: Remove `geist`, `react-markdown` if truly unused; document rationale if intentional.
6. **Improve Markdown parser**: Support more Markdown features (blockquotes, code blocks, links, images) if agent output complexity increases.
7. **Error boundaries**: Wrap components in React Error Boundaries to handle edge cases gracefully.
8. **Accessibility**: Add ARIA labels, keyboard navigation, and high-contrast mode support.

### Low Priority
9. **PWA support**: Add manifest.json and service worker for offline capability.
10. **Internationalization**: If expanding to multiple languages, integrate i18n library.
11. **Analytics**: Add event tracking (agent runs, errors, theme toggles) for product insights.

## 11. Summary

AgentDesk FE is a focused, single-purpose React frontend for orchestrating AI agents. Its main strengths are simplicity (no complex dependencies), fast load times (custom components + tokens), and real-time streaming. Key areas for growth are component modularity, test coverage, and credential security. The codebase is well-commented and suitable for small-team adoption, but refactoring is recommended as the feature set expands.

---
_End of Report_
