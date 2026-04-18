'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAgentList } from '@/hooks/useAgentList';
import { useAgentRunner } from '@/hooks/useAgentRunner';
import { usePdfExport } from '@/hooks/usePdfExport';
import { I } from '@/components/ui/Icons';
import {
  Button, Badge, IconBtn, Input, Textarea, Select,
  Label, Divider, StatusDot, Spinner, Kbd,
} from '@/components/ui/Atoms';

// ── Static mock data for recent runs ────────────────────────────
const RECENT_RUNS = [
  { id: 'r1', agent: 'Sprint Summary',  agentId: 'sprint-summary', who: 'You',       when: '2h ago',   board: 'Sprint 42',      status: 'done'   },
  { id: 'r2', agent: 'Release Notes',   agentId: 'release-notes',  who: 'Elif K.',   when: 'Yesterday', board: 'v4.11.3',        status: 'done'   },
  { id: 'r3', agent: 'Ticket Summary',  agentId: 'ticket-summary', who: 'Marcus L.', when: 'Yesterday', board: 'PLATFORM-1284',  status: 'done'   },
  { id: 'r4', agent: 'PRD Generator',   agentId: 'prd-generator',  who: 'You',       when: '2d ago',    board: 'Team Dashboard', status: 'done'   },
  { id: 'r5', agent: 'Sprint Summary',  agentId: 'sprint-summary', who: 'Priya R.',  when: '3d ago',    board: 'Sprint 41',      status: 'failed' },
  { id: 'r6', agent: 'Ticket Summary',  agentId: 'ticket-summary', who: 'You',       when: '4d ago',    board: 'INFRA-744',      status: 'done'   },
];

// ── Settings fields ─────────────────────────────────────────────
const SETTINGS_FIELDS = [
  { key: 'JIRAPILOT_OPENROUTER_KEY', label: 'OpenRouter API key', sub: 'Used for model inference. Key is stored in localStorage.', type: 'password', icon: 'Sparkle', mono: true },
  { key: 'JIRAPILOT_JIRA_TOKEN',     label: 'Jira API token',     sub: 'From id.atlassian.net → API tokens.',                      type: 'password', icon: 'Jira',    mono: true },
  { key: 'JIRAPILOT_MCP_URL',        label: 'Jira MCP server URL', sub: 'Must have CORS enabled for this origin.',                  type: 'text',     icon: 'Link',    mono: true },
  { key: 'JIRAPILOT_JIRA_URL',       label: 'Jira base URL',      sub: 'e.g. https://yourorg.atlassian.net',                       type: 'text',     icon: 'Jira',    mono: false },
  { key: 'JIRAPILOT_MODEL',          label: 'Model',              sub: 'Default: qwen/qwen3-coder:free',                     type: 'text',     icon: 'Sparkle', mono: true  },
];

// ═══════════════════════════════════════════════════════════════
// Root page
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  const { agents, loading } = useAgentList();
  const [activeId, setActiveId] = useState(null);
  const [view, setView]         = useState('agents');
  const [inputs, setInputs]     = useState({});
  const [pdfOpen, setPdfOpen]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [theme, setTheme]       = useState('dark');

  const { output, runState, tools, error, run, abort, reset } = useAgentRunner();
  const { exportPdf } = usePdfExport();

  const activeAgent = agents.find(a => a.id === activeId) || agents[0];

  // Initialise theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('PILOT_THEME') || 'dark';
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  // Auto-select first agent
  useEffect(() => {
    if (agents.length > 0 && !activeId) setActiveId(agents[0].id);
  }, [agents, activeId]);

  // Reset form + output when agent changes
  useEffect(() => {
    if (!activeAgent) return;
    const seed = {};
    activeAgent.inputs.forEach(f => { seed[f.id] = f.default || ''; });
    setInputs(seed);
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgent?.id]);

  // Auto-open PDF modal on completion
  const wasDone = useRef(false);
  useEffect(() => {
    if (runState === 'done' && !wasDone.current) {
      wasDone.current = true;
      setTimeout(() => setPdfOpen(true), 300);
    }
    if (runState !== 'done') wasDone.current = false;
  }, [runState]);

  const handleRun = useCallback(() => {
    if (!activeAgent) return;
    run(activeAgent, inputs);
  }, [activeAgent, inputs, run]);

  const handleDownload = useCallback(() => {
    if (activeAgent && output) exportPdf(output, activeAgent.name);
    setPdfOpen(false);
    setToast('PDF downloaded.');
    setTimeout(() => setToast(null), 2400);
    setTimeout(() => reset(), 400);
  }, [activeAgent, output, exportPdf, reset]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('PILOT_THEME', next);
  }, [theme]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', height: '100vh',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--ink-60)', fontSize: 13,
        gap: 10,
      }}>
        <Spinner size={14}/> Loading agents…
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '232px 340px 1fr',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--ink)',
      overflow: 'hidden',
    }}>
      {/* ── Left nav ── */}
      <NavAside view={view} setView={setView} theme={theme} toggleTheme={toggleTheme} />

      {/* ── Middle pane ── */}
      <section style={{
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        minHeight: 0,
      }}>
        {view === 'agents' && (
          <AgentsListPane
            agents={agents}
            selectedId={activeId}
            onSelect={(id) => { setActiveId(id); }}
          />
        )}
        {view === 'runs' && (
          <RecentRunsPane
            onOpen={(r) => { setActiveId(r.agentId); setView('agents'); }}
          />
        )}
        {view === 'settings' && <SettingsNavPane />}
      </section>

      {/* ── Right pane ── */}
      <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {view === 'settings' ? (
          <SettingsBody />
        ) : (
          activeAgent && (
            <RunPanel
              agent={activeAgent}
              inputs={inputs}
              setInputs={setInputs}
              runState={runState}
              tools={tools}
              output={output}
              error={error}
              onRun={handleRun}
              onStop={abort}
              onOpenPdf={() => setPdfOpen(true)}
              onReset={reset}
            />
          )
        )}
      </section>

      {/* ── PDF preview modal ── */}
      {pdfOpen && output && (
        <PdfPreviewModal
          md={output}
          agentName={activeAgent?.name || 'Agent'}
          onClose={() => setPdfOpen(false)}
          onDownload={handleDownload}
        />
      )}

      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Left nav
// ═══════════════════════════════════════════════════════════════
function NavAside({ view, setView, theme, toggleTheme }) {
  return (
    <aside style={{
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '14px 10px',
      background: 'var(--bg-sunken)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 18px' }}>
        <span style={{ color: 'var(--brand)' }}><I.Logo size={22}/></span>
        <span className="display" style={{ fontSize: 20, letterSpacing: -0.3 }}>Pilot</span>
        <span style={{ marginLeft: 'auto' }}>
          <Badge tone="neutral" style={{ fontSize: 10 }}>v0.1</Badge>
        </span>
      </div>

      {/* Workspace section */}
      <NavSection label="Workspace">
        <NavItem active={view === 'agents'} onClick={() => setView('agents')} icon={<I.Grid size={14}/>}>
          Agents
        </NavItem>
        <NavItem active={view === 'runs'} onClick={() => setView('runs')} icon={<I.Clock size={14}/>}>
          Recent runs
        </NavItem>
      </NavSection>

      {/* Team section */}
      <NavSection label="Team">
        <NavItem icon={<I.Users size={14}/>}>Members</NavItem>
      </NavSection>

      {/* Footer */}
      <div style={{ marginTop: 'auto' }}>
        <Divider style={{ margin: '10px 0' }}/>
        <NavItem
          active={view === 'settings'}
          onClick={() => setView('settings')}
          icon={<I.Gear size={14}/>}
        >
          Settings
        </NavItem>
        {/* Theme toggle */}
        <NavItem onClick={toggleTheme} icon={theme === 'dark' ? <I.Sun size={14}/> : <I.Moon size={14}/>}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </NavItem>
        {/* User avatar */}
        <div style={{ padding: '12px 10px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'var(--agent-pm-bg)', color: 'var(--agent-pm)',
            display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
            flexShrink: 0,
          }}>A</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Ahmed
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              trianglz.com
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        padding: '6px 10px 4px',
        fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08,
        textTransform: 'uppercase', color: 'var(--ink-60)',
      }}>{label}</div>
      {children}
    </div>
  );
}

function NavItem({ active, onClick, icon, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '7px 10px',
        borderRadius: 'var(--r-sm)',
        textAlign: 'left', fontSize: 13, fontWeight: active ? 500 : 400,
        color: active ? 'var(--ink)' : 'var(--ink-82)',
        background: active ? 'var(--ink-04)' : (hover ? 'var(--ink-03)' : 'transparent'),
        transition: 'background var(--t-fast), color var(--t-fast)',
      }}
    >
      <span style={{ color: active ? 'var(--ink)' : 'var(--ink-60)', display: 'inline-flex' }}>
        {icon}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Agents list pane (middle, view='agents')
// ═══════════════════════════════════════════════════════════════
function AgentsListPane({ agents, selectedId, onSelect }) {
  const [q, setQ] = useState('');
  const filtered = agents.filter(a =>
    !q ||
    a.name.toLowerCase().includes(q.toLowerCase()) ||
    a.blurb.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 className="display" style={{ fontSize: 22, margin: 0, letterSpacing: -0.3 }}>Agents</h2>
          <span style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>{agents.length} installed</span>
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--ink-60)', pointerEvents: 'none',
          }}>
            <I.Search size={13}/>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agents"
            style={{
              height: 30, width: '100%', paddingLeft: 30, paddingRight: 10,
              borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
              background: 'var(--bg-raised)', color: 'var(--ink)',
              fontSize: 12.5, outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {filtered.map(a => (
          <AgentRow
            key={a.id}
            agent={a}
            active={selectedId === a.id}
            onClick={() => onSelect(a.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--ink-60)', fontSize: 13 }}>
            No agents match "{q}"
          </div>
        )}
      </div>
    </>
  );
}

function AgentRow({ agent, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', textAlign: 'left', width: '100%',
        padding: '12px 14px', marginBottom: 4,
        borderRadius: 'var(--r-md)',
        background: active ? 'var(--bg-raised)' : (hover ? 'var(--ink-03)' : 'transparent'),
        border: active ? '1px solid var(--border-strong)' : '1px solid transparent',
        transition: 'all var(--t-fast)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Badge tone={agent.tone}>{agent.toneLabel || agent.tone}</Badge>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-60)' }}>
          {agent.lastRun}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.1, marginBottom: 2 }}>
        {agent.name}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-60)', lineHeight: 1.45 }}>
        {agent.blurb || agent.description}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Recent runs pane (middle, view='runs')
// ═══════════════════════════════════════════════════════════════
function RecentRunsPane({ onOpen }) {
  return (
    <>
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <h2 className="display" style={{ fontSize: 22, margin: 0, letterSpacing: -0.3 }}>Recent runs</h2>
        <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 4 }}>Latest 7 days</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {RECENT_RUNS.map(r => (
          <button
            key={r.id}
            onClick={() => onOpen(r)}
            style={{
              display: 'block', textAlign: 'left', width: '100%',
              padding: '10px 12px', marginBottom: 4,
              borderRadius: 'var(--r-md)',
              background: 'transparent', border: '1px solid transparent',
              transition: 'all var(--t-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink-03)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.agent}</span>
              {r.status === 'failed'
                ? <Badge tone="err">failed</Badge>
                : <Badge tone="ok">done</Badge>
              }
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-60)' }}>{r.when}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-60)' }}>{r.board} · by {r.who}</div>
          </button>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Run panel (right pane, view='agents')
// ═══════════════════════════════════════════════════════════════
function RunPanel({ agent, inputs, setInputs, runState, tools, output, error, onRun, onStop, onOpenPdf, onReset }) {
  const [showPrompt, setShowPrompt] = useState(false);

  const copyMarkdown = useCallback(async () => {
    if (output) await navigator.clipboard.writeText(output).catch(() => {});
  }, [output]);

  return (
    <>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '18px 28px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Badge tone={agent.tone}>{agent.toneLabel || agent.tone}</Badge>
            {agent.est && (
              <span style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>
                · {agent.est} typical · last run {agent.lastRun}
              </span>
            )}
          </div>
          <h1 className="display" style={{ fontSize: 24, margin: 0, letterSpacing: -0.3 }}>
            {agent.name}
          </h1>
          <div style={{ fontSize: 12.5, color: 'var(--ink-60)', marginTop: 2 }}>
            {agent.description}
          </div>
        </div>
        <IconBtn
          title="View agent prompt"
          onClick={() => setShowPrompt(p => !p)}
        >
          <I.FileText size={15}/>
        </IconBtn>
        <IconBtn title="Copy agent link">
          <I.Copy size={15}/>
        </IconBtn>
        {runState === 'running' ? (
          <Button variant="default" icon={<I.Stop size={11}/>} onClick={onStop}>Stop</Button>
        ) : (
          <Button variant="primary" icon={<I.Play size={11}/>} onClick={onRun}>Run agent</Button>
        )}
      </header>

      {/* Body: inputs left, output right */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        overflow: 'hidden',
      }}>
        {/* Input form */}
        <div style={{
          borderRight: '1px solid var(--border)',
          padding: 28, overflow: 'auto',
          background: 'var(--bg-sunken)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: 0.08,
              textTransform: 'uppercase', color: 'var(--ink-60)',
            }}>Inputs</div>
            <button
              style={{ fontSize: 11.5, color: 'var(--ink-60)', textDecoration: 'underline' }}
              onClick={() => {
                const seed = {};
                agent.inputs.forEach(f => { seed[f.id] = f.default || ''; });
                setInputs(seed);
              }}
            >Reset</button>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {agent.inputs.map(field => (
              <div key={field.id}>
                <Label htmlFor={field.id}>{field.label}</Label>
                {(field.type === 'select' || field.kind === 'select') ? (
                  <Select
                    id={field.id}
                    value={inputs[field.id] || ''}
                    onChange={(e) => setInputs({ ...inputs, [field.id]: e.target.value })}
                  >
                    {(field.options || []).map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </Select>
                ) : (field.type === 'textarea' || field.kind === 'textarea') ? (
                  <Textarea
                    id={field.id}
                    rows={4}
                    placeholder={field.placeholder}
                    value={inputs[field.id] || ''}
                    onChange={(e) => setInputs({ ...inputs, [field.id]: e.target.value })}
                  />
                ) : (
                  <Input
                    id={field.id}
                    type="text"
                    placeholder={field.placeholder}
                    value={inputs[field.id] || ''}
                    onChange={(e) => setInputs({ ...inputs, [field.id]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>

          {/* System prompt preview */}
          {showPrompt && agent.body && (
            <div style={{ marginTop: 20 }}>
              <Label hint="read-only">System prompt</Label>
              <pre className="mono" style={{
                margin: 0, padding: 12,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-82)',
                maxHeight: 200, overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}>{agent.body}</pre>
            </div>
          )}

          {/* Connections */}
          <div style={{
            marginTop: 20, padding: 12,
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
              fontSize: 11, fontWeight: 600, letterSpacing: 0.06,
              textTransform: 'uppercase', color: 'var(--ink-60)',
            }}>
              <I.Link size={12}/> Connections
            </div>
            <ConnectionRow icon={<I.Jira size={13}/>} label="Jira · MCP" />
            <ConnectionRow icon={<I.Sparkle size={13}/>} label="OpenRouter · claude-sonnet-4-5" />
          </div>
        </div>

        {/* Output area */}
        <div style={{
          padding: 28, overflow: 'auto',
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Output header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: 0.08,
              textTransform: 'uppercase', color: 'var(--ink-60)',
            }}>Output</div>
            <RunStatus runState={runState} />
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {runState === 'done' && (
                <>
                  <Button variant="default" size="sm" icon={<I.FilePdf size={12}/>} onClick={onOpenPdf}>
                    Preview PDF
                  </Button>
                  <Button variant="default" size="sm" icon={<I.Copy size={12}/>} onClick={copyMarkdown}>
                    Copy
                  </Button>
                  <Button variant="default" size="sm" icon={<I.Refresh size={12}/>} onClick={onReset}>
                    Clear
                  </Button>
                </>
              )}
            </span>
          </div>

          {/* Tool call rows */}
          {tools.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              {tools.map(t => <ToolCallRow key={t.id} tool={t}/>)}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(166, 67, 42, 0.1)',
              border: '1px solid rgba(166, 67, 42, 0.25)',
              borderRadius: 'var(--r-md)',
              color: 'var(--err)', fontSize: 13,
            }}>{error}</div>
          )}

          {/* Output surface */}
          {runState === 'idle' && !error ? (
            <EmptyOutput agent={agent} onRun={onRun} />
          ) : output ? (
            <div style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '22px 28px',
              flex: 1,
              animation: 'fade-in 220ms var(--ease)',
            }}>
              <Markdown text={output} cursor={runState === 'running'} />
              {runState === 'done' && (
                <div style={{
                  marginTop: 18, paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ color: 'var(--ok)' }}><I.Check size={14}/></span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-82)' }}>Complete.</span>
                  <span style={{ marginLeft: 'auto' }}>
                    <Button variant="default" size="sm" icon={<I.FilePdf size={12}/>} onClick={onOpenPdf}>
                      Open PDF preview
                    </Button>
                  </span>
                </div>
              )}
            </div>
          ) : runState === 'running' ? (
            <div style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '22px 28px',
              flex: 1,
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--ink-60)', fontSize: 13,
            }}>
              <StatusDot tone="ok" pulse/> Fetching data and generating…
            </div>
          ) : null}

          {runState === 'running' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--ink-60)', fontSize: 12, flexShrink: 0,
            }}>
              <StatusDot tone="ok" pulse/> Streaming · PDF preview on completion
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RunStatus({ runState }) {
  if (runState === 'idle')    return <Badge tone="neutral">Ready</Badge>;
  if (runState === 'running') return <Badge tone="warn"><Spinner size={9}/>&nbsp;Running</Badge>;
  if (runState === 'done')    return <Badge tone="ok"><I.Check size={10}/>&nbsp;Complete</Badge>;
  return null;
}

function EmptyOutput({ agent, onRun }) {
  return (
    <div style={{
      flex: 1,
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--r-lg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 40, minHeight: 300,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          width: 40, height: 40, margin: '0 auto 14px',
          borderRadius: 'var(--r-md)',
          background: 'var(--ink-04)',
          display: 'grid', placeItems: 'center',
          color: 'var(--ink-60)',
        }}><I.FileText size={18}/></div>
        <div className="display" style={{ fontSize: 20, letterSpacing: -0.2, marginBottom: 6 }}>
          Ready when you are
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.55 }}>
          Fill in the inputs on the left, then hit{' '}
          <strong style={{ color: 'var(--ink-82)' }}>Run agent</strong>.{' '}
          {agent.name} will stream its output and offer a PDF preview when done.
        </div>
        <div style={{ marginTop: 14, display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--ink-60)', fontSize: 11.5 }}>
          <Kbd>⌘</Kbd><Kbd>↵</Kbd><span>to run</span>
        </div>
      </div>
    </div>
  );
}

function ConnectionRow({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
      <span style={{ color: 'var(--ink-60)' }}>{icon}</span>
      <span style={{ color: 'var(--ink-82)' }}>{label}</span>
      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-60)' }}>
        <StatusDot tone="ok"/> Connected
      </span>
    </div>
  );
}

function ToolCallRow({ tool }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 10px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      background: 'var(--bg-raised)',
      fontSize: 12,
      animation: 'fade-in 220ms var(--ease)',
    }}>
      <span style={{ color: 'var(--agent-data)' }}><I.Jira size={13}/></span>
      <span style={{ color: 'var(--ink-60)' }}>{tool.label}</span>
      <span className="mono" style={{ color: 'var(--ink-82)', fontSize: 11.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tool.detail}
      </span>
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {tool.state === 'running' ? (
          <><Spinner size={10}/><span style={{ color: 'var(--ink-60)', fontSize: 11 }}>fetching…</span></>
        ) : (
          <><span style={{ color: 'var(--ok)' }}><I.Check size={12}/></span><span style={{ color: 'var(--ink-60)', fontSize: 11 }}>done</span></>
        )}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Settings (middle nav + right body)
// ═══════════════════════════════════════════════════════════════
function SettingsNavPane() {
  return (
    <>
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <h2 className="display" style={{ fontSize: 22, margin: 0, letterSpacing: -0.3 }}>Settings</h2>
        <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 4 }}>Stored locally in your browser</div>
      </div>
      <div style={{ padding: 8 }}>
        <NavItem active icon={<I.Key size={14}/>}>Connections</NavItem>
        <NavItem icon={<I.Sparkle size={14}/>}>Model</NavItem>
        <NavItem icon={<I.Users size={14}/>}>Members</NavItem>
        <NavItem icon={<I.Book size={14}/>}>Agent library</NavItem>
        <NavItem icon={<I.Bolt size={14}/>}>Advanced</NavItem>
      </div>
    </>
  );
}

function SettingsBody() {
  const [values, setValues] = useState({});
  const [revealed, setRevealed] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const init = {};
    SETTINGS_FIELDS.forEach(f => { init[f.key] = localStorage.getItem(f.key) || ''; });
    setValues(init);
  }, []);

  function handleSave() {
    SETTINGS_FIELDS.forEach(f => {
      const val = values[f.key];
      if (val) localStorage.setItem(f.key, val);
      else localStorage.removeItem(f.key);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  }

  const iconMap = { Sparkle: I.Sparkle, Jira: I.Jira, Link: I.Link, Warning: I.Warning, Key: I.Key };

  return (
    <div style={{ padding: 36, overflow: 'auto', flex: 1, maxWidth: 820 }}>
      <h1 className="display" style={{ fontSize: 28, letterSpacing: -0.4, margin: '0 0 6px' }}>Connections</h1>
      <p style={{ color: 'var(--ink-60)', fontSize: 13.5, margin: '0 0 28px', maxWidth: 560 }}>
        Pilot stores these in your browser. They never touch a backend.
      </p>

      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        background: 'var(--bg-raised)',
        overflow: 'hidden',
      }}>
        {SETTINGS_FIELDS.map((f, idx) => {
          const IconComp = iconMap[f.icon] || I.Key;
          const isRevealed = revealed[f.key];
          return (
            <div key={f.key}>
              {idx > 0 && <Divider />}
              <div style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 'var(--r-sm)',
                    background: 'var(--ink-04)', border: '1px solid var(--border)',
                    display: 'grid', placeItems: 'center', color: 'var(--ink-82)',
                    flexShrink: 0,
                  }}><IconComp size={15}/></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{f.label}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-60)', marginTop: 2 }}>{f.sub}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    type={f.type === 'password' && !isRevealed ? 'password' : 'text'}
                    value={values[f.key] || ''}
                    onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                    style={f.mono ? { fontFamily: 'var(--font-jetbrains-mono, monospace)', fontSize: 12 } : {}}
                    placeholder={f.type === 'password' ? '••••••••••••••••' : ''}
                  />
                  {f.type === 'password' && (
                    <Button
                      variant="default"
                      onClick={() => setRevealed(r => ({ ...r, [f.key]: !r[f.key] }))}
                    >
                      {isRevealed ? 'Hide' : 'Reveal'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security note */}
      <div style={{
        marginTop: 16, padding: 14,
        background: 'var(--ink-04)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', fontSize: 12.5, color: 'var(--ink-82)', lineHeight: 1.55,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }}><I.Warning size={14}/></span>
        <span>
          Keys live in <code className="mono" style={{ background: 'var(--ink-08)', padding: '1px 5px', borderRadius: 3 }}>localStorage</code> and are visible in DevTools. Acceptable for a small trusted team. Rotate keys if a machine leaves the org.
        </span>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
        {saved && <Badge tone="ok">Saved</Badge>}
        <Button variant="primary" onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PDF preview modal
// ═══════════════════════════════════════════════════════════════
function PdfPreviewModal({ md, agentName, onClose, onDownload }) {
  const filename = `${agentName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        animation: 'fade-in 180ms var(--ease)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex', flexDirection: 'column',
          width: '100%', maxWidth: 920,
          margin: '32px 24px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--r-sm)',
            background: 'var(--ink-04)', border: '1px solid var(--border)',
            display: 'grid', placeItems: 'center', color: 'var(--err)',
          }}><I.FilePdf size={15}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{filename}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>
              Generated · ready to download
            </div>
          </div>
          <Button variant="default" size="sm" onClick={onClose}>Close</Button>
          <Button variant="primary" size="sm" icon={<I.Download size={13}/>} onClick={onDownload}>
            Download
          </Button>
        </div>

        {/* A4 preview */}
        <div style={{
          flex: 1, overflow: 'auto', padding: 28,
          background: 'var(--bg-sunken)',
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            width: 720, minHeight: 1018,
            background: '#fcfbf8', color: '#1c1c1c',
            borderRadius: 4,
            padding: '56px 64px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.22)',
          }}>
            {/* Page header strip */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingBottom: 16, marginBottom: 24,
              borderBottom: '1px solid #eceae4',
              fontSize: 10.5, color: '#5f5f5d', letterSpacing: 0.04, textTransform: 'uppercase',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1c1c1c' }}>
                <span style={{ color: '#2e6f5e' }}><I.Logo size={14}/></span>
                Pilot · {agentName}
              </span>
              <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
            {/* Serif-styled markdown */}
            <div style={{ fontFamily: 'var(--font-instrument-serif, Georgia, serif)', color: '#1c1c1c' }}>
              <PdfMarkdown md={md} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Markdown renderer (dependency-free)
// ═══════════════════════════════════════════════════════════════
function renderInline(text, keyBase) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0; let m; let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    if (s.startsWith('**')) {
      parts.push(<strong key={`${keyBase}-b-${i}`}>{s.slice(2, -2)}</strong>);
    } else if (s.startsWith('`')) {
      parts.push(
        <code key={`${keyBase}-c-${i}`} className="mono" style={{
          fontSize: '0.9em', padding: '1px 5px',
          background: 'var(--ink-04)', border: '1px solid var(--border-soft)', borderRadius: 4,
        }}>{s.slice(1, -1)}</code>
      );
    } else {
      parts.push(<em key={`${keyBase}-i-${i}`}>{s.slice(1, -1)}</em>);
    }
    last = m.index + s.length; i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Markdown({ text, cursor }) {
  const lines = text.split('\n');
  const out = [];
  let listBuf = null;

  const flushList = () => {
    if (!listBuf) return;
    const Tag = listBuf.type === 'ul' ? 'ul' : 'ol';
    out.push(
      <Tag key={`l-${out.length}`} style={{ margin: '8px 0 14px', paddingLeft: 22, color: 'var(--ink-82)' }}>
        {listBuf.items.map((t, i) => (
          <li key={i} style={{ marginBottom: 4 }}>{renderInline(t, `li-${out.length}-${i}`)}</li>
        ))}
      </Tag>
    );
    listBuf = null;
  };

  lines.forEach((line, idx) => {
    if (/^# /.test(line)) {
      flushList();
      out.push(<h1 key={idx} className="display" style={{ fontSize: 28, margin: '18px 0 8px', letterSpacing: -0.4, color: 'var(--ink)' }}>{renderInline(line.slice(2), `h1-${idx}`)}</h1>);
    } else if (/^## /.test(line)) {
      flushList();
      out.push(<h2 key={idx} style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 6px', color: 'var(--ink)', letterSpacing: -0.1 }}>{renderInline(line.slice(3), `h2-${idx}`)}</h2>);
    } else if (/^### /.test(line)) {
      flushList();
      out.push(<h3 key={idx} style={{ fontSize: 13, fontWeight: 600, margin: '16px 0 4px', color: 'var(--ink)' }}>{renderInline(line.slice(4), `h3-${idx}`)}</h3>);
    } else if (/^- /.test(line)) {
      if (!listBuf || listBuf.type !== 'ul') { flushList(); listBuf = { type: 'ul', items: [] }; }
      listBuf.items.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      if (!listBuf || listBuf.type !== 'ol') { flushList(); listBuf = { type: 'ol', items: [] }; }
      listBuf.items.push(line.replace(/^\d+\.\s/, ''));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      out.push(<p key={idx} style={{ margin: '0 0 10px', color: 'var(--ink-82)', lineHeight: 1.6 }}>{renderInline(line, `p-${idx}`)}</p>);
    }
  });
  flushList();

  return (
    <div>
      {out}
      {cursor && (
        <span style={{
          display: 'inline-block', width: 2, height: 14,
          background: 'var(--brand)', verticalAlign: -2,
          animation: 'blink 1s steps(2) infinite',
        }} />
      )}
    </div>
  );
}

// PDF-styled markdown (serif, print feel)
function PdfMarkdown({ md }) {
  const lines = md.split('\n');
  const out = [];
  let listBuf = null;

  const flushList = () => {
    if (!listBuf) return;
    const Tag = listBuf.type === 'ul' ? 'ul' : 'ol';
    out.push(
      <Tag key={`l-${out.length}`} style={{ margin: '8px 0 14px', paddingLeft: 22, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
        {listBuf.items.map((t, i) => (
          <li key={i} style={{ marginBottom: 4, color: '#1c1c1c' }}>{renderInline(t, `pli-${out.length}-${i}`)}</li>
        ))}
      </Tag>
    );
    listBuf = null;
  };

  lines.forEach((line, idx) => {
    if (/^# /.test(line)) {
      flushList();
      out.push(<h1 key={idx} style={{ fontSize: 28, margin: '6px 0 8px', letterSpacing: -0.4, fontWeight: 400 }}>{renderInline(line.slice(2), `ph1-${idx}`)}</h1>);
    } else if (/^## /.test(line)) {
      flushList();
      out.push(<h2 key={idx} style={{ fontSize: 16, margin: '22px 0 6px', fontWeight: 600, fontFamily: 'Inter, sans-serif', letterSpacing: -0.1 }}>{renderInline(line.slice(3), `ph2-${idx}`)}</h2>);
    } else if (/^- /.test(line)) {
      if (!listBuf || listBuf.type !== 'ul') { flushList(); listBuf = { type: 'ul', items: [] }; }
      listBuf.items.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      if (!listBuf || listBuf.type !== 'ol') { flushList(); listBuf = { type: 'ol', items: [] }; }
      listBuf.items.push(line.replace(/^\d+\.\s/, ''));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      out.push(<p key={idx} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, lineHeight: 1.6, margin: '0 0 10px', color: '#1c1c1c' }}>{renderInline(line, `pp-${idx}`)}</p>);
    }
  });
  flushList();
  return <>{out}</>;
}

// ═══════════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════════
function Toast({ children }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 90,
      padding: '9px 14px',
      background: 'var(--ink)', color: 'var(--on-dark)',
      borderRadius: 'var(--r-pill)',
      fontSize: 12.5, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      animation: 'fade-in 200ms var(--ease)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: 'var(--brand)' }}><I.Download size={13}/></span>
      {children}
    </div>
  );
}

// ─── NavItem uses useState, needs to be defined after imports ───
// (it's already defined above alongside NavAside)
