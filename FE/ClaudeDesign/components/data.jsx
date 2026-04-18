// Pilot — shared data (agents, recent runs, mocked streaming content)

const AGENTS = [
  {
    id: 'sprint',
    name: 'Sprint summary',
    tone: 'pm',
    toneLabel: 'PM',
    blurb: 'Summarises sprint outcomes, blockers, and velocity.',
    description: 'Reads the active sprint, walks shipped and unshipped tickets, and produces a stakeholder-ready summary covering outcomes, blockers and velocity trend.',
    inputs: [
      { id: 'board', label: 'Jira board', kind: 'select', default: 'PLATFORM · Sprint 42',
        options: ['PLATFORM · Sprint 42', 'MOBILE · Sprint 18', 'GROWTH · Sprint 09', 'INFRA · Sprint 31'] },
      { id: 'tone', label: 'Tone', kind: 'select', default: 'Executive — concise bullets',
        options: ['Executive — concise bullets', 'Team-internal — detailed', 'Async update — narrative'] },
      { id: 'context', label: 'Additional context', kind: 'textarea', placeholder: 'e.g. focus on the mobile team\u2019s work, flag scope creep on FE-1282…' },
    ],
    est: '~40s',
    lastRun: '2h ago',
  },
  {
    id: 'prd',
    name: 'Epic bug reporter',
    tone: 'pm',
    toneLabel: 'PM',
    blurb: 'Aggregates bugs in an epic and summarises impact.',
    description: 'Pulls all bugs linked to a Jira epic, clusters by surface area, and drafts an impact summary with severity distribution and age.',
    inputs: [
      { id: 'epic', label: 'Jira epic', kind: 'select', default: 'PLATFORM-1284 · Billing v2',
        options: ['PLATFORM-1284 · Billing v2', 'MOBILE-902 · Push rework', 'GROWTH-512 · Onboarding 3.0'] },
      { id: 'since', label: 'Window', kind: 'select', default: 'Last 30 days', options: ['Last 7 days','Last 30 days','Last 90 days','All time'] },
      { id: 'context', label: 'Additional context', kind: 'textarea', placeholder: 'e.g. only customer-reported, exclude internal QA tickets…' },
    ],
    est: '~30s',
    lastRun: 'Yesterday',
  },
  {
    id: 'health',
    name: 'Epic health',
    tone: 'eng',
    toneLabel: 'Eng',
    blurb: 'Surfaces scope, risk and schedule drift for an epic.',
    description: 'Compares current epic state to its plan of record. Highlights scope creep, schedule drift, blocking cross-team deps, and risk hotspots.',
    inputs: [
      { id: 'epic', label: 'Jira epic', kind: 'select', default: 'PLATFORM-1284 · Billing v2',
        options: ['PLATFORM-1284 · Billing v2', 'INFRA-744 · DB migration', 'MOBILE-902 · Push rework'] },
      { id: 'baseline', label: 'Baseline', kind: 'select', default: 'Plan of record (Q1)', options: ['Plan of record (Q1)', 'Last week\u2019s snapshot', 'Epic creation date'] },
      { id: 'context', label: 'Additional context', kind: 'textarea', placeholder: 'e.g. exec review next Wed, flag anything slipping past May 12…' },
    ],
    est: '~45s',
    lastRun: '4d ago',
  },
  {
    id: 'release',
    name: 'Release notes',
    tone: 'release',
    toneLabel: 'Rel',
    blurb: 'Generates release notes from completed tickets.',
    description: 'Reads tickets shipped in a version and drafts release notes grouped by category, with optional customer-facing rewrites.',
    inputs: [
      { id: 'version', label: 'Version', kind: 'select', default: 'v4.12.0', options: ['v4.12.0','v4.11.3','v4.11.2','v4.11.1'] },
      { id: 'audience', label: 'Audience', kind: 'select', default: 'External customers', options: ['External customers','Internal changelog','Both (two versions)'] },
      { id: 'context', label: 'Additional context', kind: 'textarea', placeholder: 'e.g. lead with billing improvements, skip infra changes…' },
    ],
    est: '~25s',
    lastRun: '1w ago',
  },
];

const RECENT_RUNS = [
  { id: 'r1', agent: 'Sprint summary', agentId: 'sprint', who: 'You', when: '2h ago', board: 'PLATFORM · Sprint 42', status: 'done' },
  { id: 'r2', agent: 'Release notes', agentId: 'release', who: 'Elif K.', when: 'Yesterday', board: 'v4.11.3', status: 'done' },
  { id: 'r3', agent: 'Epic health', agentId: 'health', who: 'Marcus L.', when: 'Yesterday', board: 'PLATFORM-1284', status: 'done' },
  { id: 'r4', agent: 'Epic bug reporter', agentId: 'prd', who: 'You', when: '2d ago', board: 'MOBILE-902', status: 'done' },
  { id: 'r5', agent: 'Sprint summary', agentId: 'sprint', who: 'Priya R.', when: '3d ago', board: 'MOBILE · Sprint 17', status: 'failed' },
  { id: 'r6', agent: 'Epic health', agentId: 'health', who: 'You', when: '4d ago', board: 'INFRA-744', status: 'done' },
];

// Mock streaming output, chunked to simulate token-by-token markdown
const STREAM_SCRIPTS = {
  sprint: [
    { type: 'tool', label: 'MCP · Jira', detail: 'get_sprint(id="PLATFORM-S42")', dur: 820 },
    { type: 'tool', label: 'MCP · Jira', detail: 'list_issues(sprint="S42", include_subtasks=true)', dur: 1100 },
    { type: 'md', text: '# Sprint 42 — Platform\n\n*PLATFORM · Apr 1 → Apr 15 · 38 issues · 141 points committed*\n\n' },
    { type: 'md', text: '## Outcome\n\nThe team shipped **31 of 38 issues (82%)** and **112 of 141 points (79%)**, a modest dip from Sprint 41 (86%). ' },
    { type: 'md', text: 'All four committed epics advanced, and **Billing v2** hit its scoped milestone a day early.\n\n' },
    { type: 'md', text: '## What shipped\n\n' },
    { type: 'md', text: '- **Billing v2** — Invoice PDF generation behind flag for enterprise tenants (PLATFORM-1284, -1291, -1305)\n' },
    { type: 'md', text: '- **Auth** — SSO group-sync now respects nested groups; unblocks three customer rollouts\n' },
    { type: 'md', text: '- **Reliability** — p99 on `/search` dropped from 480 ms → 210 ms after index rewrite\n\n' },
    { type: 'md', text: '## Blockers & carryover\n\n' },
    { type: 'md', text: '- **PLATFORM-1312** (5 pts) — blocked 4 days on Stripe webhook schema change; spec alignment now agreed\n' },
    { type: 'md', text: '- **PLATFORM-1298** (8 pts) — carried to S43; design rework after accessibility review\n\n' },
    { type: 'md', text: '## Velocity\n\nRolling 4-sprint avg: **118 pts** · This sprint: **112 pts** · Trend: flat → mild dip.\n\n' },
    { type: 'md', text: '## Recommended focus for S43\n\n1. Close Billing v2 enterprise rollout\n2. Unblock PLATFORM-1298 before Wed\n3. Revisit webhook retries — two prod incidents traced to this last week\n' },
  ],
  prd: [
    { type: 'tool', label: 'MCP · Jira', detail: 'get_epic("PLATFORM-1284")', dur: 600 },
    { type: 'tool', label: 'MCP · Jira', detail: 'search_issues(type=Bug, epic="PLATFORM-1284", window=30d)', dur: 980 },
    { type: 'md', text: '# Billing v2 — Bug Report\n\n*Epic PLATFORM-1284 · 30-day window · 24 bugs (9 open, 15 resolved)*\n\n' },
    { type: 'md', text: '## Summary\n\nBug volume in Billing v2 has stabilised in the last two weeks after the webhook refactor landed. ' },
    { type: 'md', text: 'Of 24 total bugs, **none are P0**, 3 are P1 and **all 3 have active owners**. ' },
    { type: 'md', text: 'Average age of open bugs is **4.2 days**, down from 9.1 last window.\n\n' },
    { type: 'md', text: '## Severity distribution\n\n- **P1** — 3 open (invoice PDF truncation on >200 line items, proration math off by 1¢ for annual upgrades, tax region fallback)\n' },
    { type: 'md', text: '- **P2** — 5 open\n- **P3** — 1 open\n\n' },
    { type: 'md', text: '## Clusters\n\n**Invoicing (11 bugs)** — predominantly PDF rendering and locale edge cases.\n\n' },
    { type: 'md', text: '**Proration (6 bugs)** — now well-understood after PLATFORM-1301; three remaining are cosmetic.\n\n' },
    { type: 'md', text: '**Webhooks (4 bugs)** — all resolved post-refactor. No new ones opened in 9 days.\n\n' },
  ],
  health: [
    { type: 'tool', label: 'MCP · Jira', detail: 'get_epic("PLATFORM-1284")', dur: 650 },
    { type: 'tool', label: 'MCP · Jira', detail: 'get_epic_timeline("PLATFORM-1284")', dur: 1200 },
    { type: 'md', text: '# Epic Health — Billing v2\n\n*PLATFORM-1284 · Baseline: Plan of record (Q1) · Assessed: Apr 18*\n\n' },
    { type: 'md', text: '## Overall status — **Amber**\n\n' },
    { type: 'md', text: 'The epic is **on track on outcomes** but carrying **moderate schedule risk** driven by two dependencies outside the team.\n\n' },
    { type: 'md', text: '## Scope\n\n- **Plan of record:** 34 issues, 182 points\n- **Current:** 41 issues, 214 points (**+17%** by points)\n- Of the expansion, 18 points are scope creep, 14 points are discovery work surfaced during implementation.\n\n' },
    { type: 'md', text: '## Schedule\n\n- **Original target:** May 6 · **Current projection:** May 12 (+6 days)\n- Critical path slip of 4 days on the tax-service integration (INFRA team)\n- Buffer remaining: 2 days before the planned beta cohort onboarding\n\n' },
    { type: 'md', text: '## Cross-team risks\n\n1. **INFRA** — tax service migration waiting on schema review; owner aware, no ETA confirmed\n2. **Design** — invoice template review pending; booked Wed\n' },
  ],
  release: [
    { type: 'tool', label: 'MCP · Jira', detail: 'get_version("v4.12.0")', dur: 450 },
    { type: 'tool', label: 'MCP · Jira', detail: 'list_issues(fixVersion="v4.12.0", status=Done)', dur: 900 },
    { type: 'md', text: '# Release Notes — v4.12.0\n\n*Release date: Apr 19, 2026*\n\n' },
    { type: 'md', text: '## ✨ Highlights\n\n' },
    { type: 'md', text: 'This release focuses on **billing polish** and **search performance**. Enterprise tenants get invoice PDFs out of beta, and every user should see noticeably snappier global search.\n\n' },
    { type: 'md', text: '## New\n\n- **Invoice PDFs** for enterprise plans, with full proration detail and localised tax lines\n- **Saved searches** — pin any filter set to your sidebar\n- **Bulk reassign** in the admin console\n\n' },
    { type: 'md', text: '## Improved\n\n- Global search is **~55% faster** at p99\n- SSO group-sync now handles nested groups correctly\n- Webhook retries use exponential backoff with jitter\n\n' },
    { type: 'md', text: '## Fixed\n\n- Invoice PDF truncated past 200 line items\n- Proration math drifted by $0.01 on annual upgrades\n- Safari 17 keyboard shortcut conflict in the editor\n' },
  ],
};

window.AGENTS = AGENTS;
window.RECENT_RUNS = RECENT_RUNS;
window.STREAM_SCRIPTS = STREAM_SCRIPTS;
