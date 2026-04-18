# AgentDesk — Frontend Implementation Spec
> Paste this into any Claude thread to build the UI with full context.

---

## 1. What We're Building

AgentDesk is an internal web app that exposes AI agents to non-technical team members (PMs, EMs) via a clean browser UI. Users pick an agent, fill a form, hit Run, and get a PDF download. No chat, no history, no persistence.

**Stack:** Next.js 14 (App Router) · Deployed on Vercel · Tailwind CSS

**Architecture:** The frontend is a thin UI layer. All intelligence lives in the backend:
- Agent selection and form rendering happen in the browser
- The backend handles everything else: Jira data fetching, prompt assembly, and LLM streaming
- The frontend sends API keys as request headers — it never calls Jira or OpenRouter directly

---

## 2. Design System

This UI is modeled closely on the **Raycast aesthetic** — dark precision instrument, not a generic AI dashboard.

### Core Palette

```css
:root {
  /* Backgrounds */
  --bg-void:     #07080a;   /* page canvas — NOT pure black, blue-cold tint */
  --bg-surface:  #101111;   /* card / panel backgrounds */
  --bg-elevated: #1b1c1e;   /* badges, tags, hover states */

  /* Text */
  --text-primary:   #f9f9f9;   /* headings, high emphasis */
  --text-secondary: #cecece;   /* body, descriptions */
  --text-muted:     #9c9c9d;   /* labels, nav links default */
  --text-dim:       #6a6b6c;   /* disabled, low emphasis */

  /* Brand */
  --accent-blue:  #0052CC;     /* AgentDesk / Jira blue — primary interactive */
  --accent-red:   #FF6363;     /* Raycast red — errors, danger only */
  --accent-green: #5fc992;     /* success states */

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);   /* card edges */
  --border-mid:    rgba(255, 255, 255, 0.10);   /* hover, focus edges */
  --border-strong: rgba(255, 255, 255, 0.18);   /* active states */
  --border-std:    hsl(195, 5%, 15%);           /* dividers, separators */

  /* Sidebar */
  --sidebar-bg:    #0A0A0F;   /* slightly darker/cooler than void */
  --sidebar-width: 280px;

  /* Shadows — always multi-layer, never single */
  --shadow-card:
    rgb(27, 28, 30) 0px 0px 0px 1px,
    rgb(7, 8, 10)   0px 0px 0px 1px inset;
  --shadow-button:
    rgba(255, 255, 255, 0.05) 0px 1px 0px 0px inset,
    rgba(255, 255, 255, 0.10) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.20)       0px -1px 0px 0px inset;
  --shadow-floating:
    rgba(0, 0, 0, 0.50)       0px 0px 0px 2px,
    rgba(255, 255, 255, 0.19) 0px 0px 14px,
    rgba(0, 0, 0, 0.20)       0px -1px 0px 0px inset;
}
```

### Typography

**Font loading (in `layout.jsx`):**
```html
<!-- Inter from Google Fonts or next/font -->
<!-- GeistMono for output panel only -->
```

| Element | Size | Weight | Letter-spacing |
|---|---|---|---|
| Agent name (sidebar) | 14px | 500 | 0.2px |
| Section heading | 24px | 500 | 0.2px |
| Form label | 14px | 500 | 0.2px |
| Input text | 16px | 400 | 0.1px |
| Button | 16px | 600 | 0.3px |
| Output body | 16px | 400 (GeistMono) | 0.2px |
| Badge / tag | 12px | 600 | 0px |
| Muted caption | 12px | 400 | 0.4px |

**Rules:**
- Body text baseline weight is **500**, not 400 — improves dark-mode legibility
- Always use **positive** letter-spacing on dark backgrounds
- OpenType features on Inter: `font-feature-settings: "calt", "kern", "liga", "ss03"`

---

## 3. Layout

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (280px, #0A0A0F)  │  Main panel (#07080a)  │
│                             │                        │
│  [AgentDesk logo]           │  [Agent title]         │
│                             │  [Description]         │
│  ── Agents ──               │                        │
│  ○ Release Notes            │  [Input form]          │
│  ● Sprint Summary  ←active  │                        │
│  ○ PRD Generator            │  [Run Agent button]    │
│  ○ Ticket Summary           │                        │
│                             │  [Output panel]        │
│  ──────────────             │  streaming markdown    │
│  [Settings]                 │  with blinking cursor  │
└─────────────────────────────────────────────────────┘
```

**Sidebar:**
- Fixed left, full viewport height
- `border-right: 1px solid var(--border-std)`
- Logo at top (24px padding), agent list below, settings link pinned to bottom
- Active agent: `background: var(--bg-elevated)`, left border `2px solid var(--accent-blue)`
- Inactive agent link: text `var(--text-muted)`, hover → `var(--text-secondary)`, opacity transition

**Main panel:**
- `flex: 1`, scrollable, `padding: 48px 56px`
- Max content width: `680px` centered

---

## 4. Components

### 4.1 AgentSelector (sidebar list)

```jsx
// src/components/AgentSelector.jsx
// Props: agents[], activeId, onSelect(id)
// Renders a <nav> with one item per agent
// Active item gets left-border accent and bg-elevated
// Each item shows: agent name (14px/500) + description (12px, --text-muted)
```

**Styling:**
```css
.agent-item {
  padding: 10px 16px;
  border-left: 2px solid transparent;
  transition: opacity 0.15s, border-color 0.15s;
  cursor: pointer;
}
.agent-item.active {
  background: var(--bg-elevated);
  border-left-color: var(--accent-blue);
}
.agent-item:hover:not(.active) {
  opacity: 0.7;
}
```

---

### 4.2 InputForm (dynamic form from frontmatter)

```jsx
// src/components/InputForm.jsx
// Props: fields[] (from parsed .md frontmatter), onSubmit(values)
// Renders fields dynamically based on `type`: text | textarea | select
```

**Input fields:**
```css
input, textarea, select {
  background: var(--bg-void);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.1px;
  padding: 10px 14px;
  width: 100%;
  transition: border-color 0.15s;
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--border-mid);
  box-shadow: 0 0 0 3px hsla(202, 100%, 67%, 0.12);
}
::placeholder { color: var(--text-dim); }
```

**Labels:**
```css
label {
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.2px;
  margin-bottom: 6px;
  display: block;
}
```

---

### 4.3 Run Agent button

```css
.btn-primary {
  background: transparent;
  border: 1px solid var(--border-mid);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.3px;
  padding: 10px 24px;
  box-shadow: var(--shadow-button);
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.7; }
.btn-primary:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
```

**Loading state:** replace label with a subtle spinner + "Running…" text. Do not show a progress bar — the streaming output IS the progress indicator.

---

### 4.4 OutputPanel (streaming markdown renderer)

```jsx
// src/components/OutputPanel.jsx
// Props: content (string, markdown), isStreaming (bool)
// Uses react-markdown to render content live
// When isStreaming: append blinking cursor block after last char
// Font: GeistMono 16px, line-height 1.6, color var(--text-secondary)
```

**Panel shell:**
```css
.output-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  padding: 28px 32px;
  margin-top: 32px;
  font-family: 'GeistMono', ui-monospace, monospace;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
  min-height: 200px;
}
```

**Markdown overrides inside output panel:**
```css
.output-panel h1, .output-panel h2, .output-panel h3 {
  color: var(--text-primary);
  font-family: Inter, sans-serif;
  font-weight: 500;
  letter-spacing: 0.2px;
  margin-top: 24px;
}
.output-panel code {
  background: var(--bg-elevated);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 13px;
}
.output-panel hr {
  border-color: var(--border-std);
  margin: 20px 0;
}
```

**Blinking cursor:**
```css
.cursor-blink {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--accent-blue);
  margin-left: 2px;
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

---

### 4.5 Settings page (`/settings`)

Two labeled inputs + a save button. After save, show a success badge.

**Fields:**
| Field | localStorage key | Placeholder |
|---|---|---|
| Jira API token | `AGENTDESK_JIRA_TOKEN` | Paste from id.atlassian.net → API tokens |
| OpenRouter key | `AGENTDESK_OPENROUTER_KEY` | sk-or-… |
| Jira base URL | `AGENTDESK_JIRA_URL` | https://yourorg.atlassian.net |
| MCP server URL | `AGENTDESK_MCP_URL` | https://your-mcp-server.railway.app |
| Model (optional) | `AGENTDESK_MODEL` | qwen/qwen3-coder:free (default) |

**Success badge:**
```css
.badge-success {
  background: rgba(95, 201, 146, 0.15);
  color: var(--accent-green);
  border: 1px solid rgba(95, 201, 146, 0.25);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
}
```

---

### 4.6 Logo / Wordmark

```
AgentDesk
```

- Font: Inter, "Agent" weight 500, "Desk" weight 300 — same size, same color, different weight
- Color: `var(--text-primary)` · Size: 16px
- Or as an SVG wordmark: a small `◈` node icon in `var(--accent-blue)` before the text
- Favicon: `◈` symbol on `#07080a` background, `#0052CC` fill

---

## 5. Data Flow

### Architecture

```
Browser ──► POST /agents/run ──► NestJS backend ──► Jira API
                                                ──► OpenRouter (LLM)
                                                ──► SSE stream back to browser
```

The frontend sends **one request** per agent run. The backend does all orchestration.

### Step 1 — Load agents

Agent `.md` files in `/public/agents/` are still loaded at runtime for rendering the sidebar and input forms. The system prompt inside them is **not used by the frontend** — the backend has its own copy.

```js
// src/hooks/useAgentList.js
// On mount: fetch('/agents/*.md') from /public/agents/
// Parse frontmatter with gray-matter
// Return: [{ id, name, description, inputs[] }]
```

### Step 2 — On "Run Agent"

```js
// src/hooks/useAgentRunner.js

async function run(agent, formValues) {
  const jiraToken  = localStorage.getItem('AGENTDESK_JIRA_TOKEN');
  const orKey      = localStorage.getItem('AGENTDESK_OPENROUTER_KEY');
  const mcpUrl     = localStorage.getItem('AGENTDESK_MCP_URL');
  const model      = localStorage.getItem('AGENTDESK_MODEL') ?? 'qwen/qwen3-coder:free';

  // Single call to backend — sends both keys as headers
  const response = await fetch(`${mcpUrl}/agents/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Jira-Token': jiraToken,
      'X-OpenRouter-Key': orKey,
      'X-Model': model,
    },
    body: JSON.stringify({
      agentId: agent.id,
      formValues,
    }),
  });

  // Response is an SSE stream — read chunks and render live
  // Each chunk: data: {"content": "..."}\n\n
  // Final chunk: data: [DONE]\n\n
}
```

### Step 3 — On stream complete

```js
// src/hooks/usePdfExport.js
// Use @react-pdf/renderer to convert final markdown string to PDF
// Trigger browser download automatically
// Reset output panel state after 1.5s delay
```

---

## 6. Agent `.md` File Format

Each agent is one file in `/public/agents/`. The frontend uses only the **frontmatter** (name, description, inputs) for UI rendering. The **body** (system prompt) is kept in the backend's copy.

```markdown
---
name: Sprint Summary
description: Sprint status and blocker summary for any active sprint
inputs:
  - id: sprint_name
    label: Sprint name
    type: text
    placeholder: "e.g. Sprint 42"
    required: true
  - id: focus
    label: Focus area
    type: select
    options: ["Blockers only", "Full summary", "Executive brief"]
    default: "Full summary"
---

You are a technical project manager summarizing sprint progress.
(This prompt is used by the backend, not the frontend)
```

**Supported field types:** `text` · `textarea` · `select`

---

## 7. File Structure

```
agentdesk-fe/
├── public/
│   └── agents/
│       ├── release-notes.md       ← frontmatter for UI + prompt (synced with backend)
│       ├── prd-generator.md
│       ├── ticket-summary.md
│       └── sprint-summary.md
├── src/
│   ├── app/
│   │   ├── layout.jsx            ← font loading, global CSS vars
│   │   ├── page.jsx              ← main shell (sidebar + main panel)
│   │   └── settings/
│   │       └── page.jsx          ← localStorage key management
│   ├── components/
│   │   ├── AgentSelector.jsx
│   │   ├── InputForm.jsx
│   │   ├── OutputPanel.jsx
│   │   └── PdfExporter.jsx
│   ├── hooks/
│   │   ├── useAgentList.js       ← fetch + parse .md files for UI
│   │   ├── useAgentRunner.js     ← calls backend /agents/run, reads SSE stream
│   │   └── usePdfExport.js       ← markdown → PDF → download
│   └── lib/
│       ├── mcpClient.js          ← runAgent() + readSSEStream() helpers
│       └── agentParser.js        ← gray-matter frontmatter parser
├── styles/
│   └── globals.css               ← CSS vars, resets, base typography
└── package.json
```

---

## 8. Key Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "gray-matter": "^4.0.3",
    "react-markdown": "^9.x",
    "@react-pdf/renderer": "^3.x"
  }
}
```

---

## 9. UX Rules

1. **No save button on output.** The PDF downloads automatically when streaming ends. No opt-in.
2. **No history.** Output panel clears on next run. No persistence, no log.
3. **Guard the run button.** Disable it if `OPENROUTER_KEY` or `MCP_URL` are missing from localStorage. Show a banner linking to `/settings`.
4. **Errors land in the output panel**, not toast popups. Format them like: `⚠ Jira connection failed — check your token in Settings.`
5. **Streaming failure** (network drop mid-stream): show what arrived + error message at bottom. Still offer PDF of partial content.
6. **Settings link** in sidebar bottom always visible, never hidden behind scroll.

---

## 10. What NOT to Do

- No purple gradients, sparkle icons, or "AI" aesthetics
- No toast notifications (errors go in the output panel)
- No chat-style UI — this is a form that runs an agent, not a conversation
- No `#000000` pure black anywhere — always use `#07080a`
- No single-layer shadows — always use the multi-layer system from Section 2
- No color-swap hover states — always use `opacity: 0.6` transitions
- No loading spinners on the output panel — the streaming text IS the loader
- No direct calls to Jira or OpenRouter from the browser — all API calls go through the backend

---

*This spec covers: palette, typography, layout, all components, data flow, agent format, and file structure. Start with `layout.jsx` (CSS vars + font loading) → `page.jsx` (shell) → `AgentSelector` → `InputForm` → `OutputPanel` → `useAgentRunner`.*
