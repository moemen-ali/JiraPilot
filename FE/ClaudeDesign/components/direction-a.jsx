// Pilot — Direction A: Three-pane workspace (sidebar / agents / run panel)
// Matches the user's reference screenshot; primary direction.

function DirectionA({ theme, density }) {
  const [selectedAgentId, setSelectedAgentId] = React.useState('sprint');
  const [view, setView] = React.useState('agents'); // agents | runs | settings
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const agent = AGENTS.find(a => a.id === selectedAgentId) || AGENTS[0];
  const script = STREAM_SCRIPTS[agent.id];
  const run = useFakeRun(script);

  const [inputs, setInputs] = React.useState({});
  React.useEffect(() => {
    const seed = {};
    agent.inputs.forEach(i => { seed[i.id] = i.default || ''; });
    setInputs(seed);
    run.reset();
  }, [agent.id]);

  // Auto open PDF preview + toast when done
  const wasDone = React.useRef(false);
  React.useEffect(() => {
    if (run.state === 'done' && !wasDone.current) {
      wasDone.current = true;
      setTimeout(() => setPdfOpen(true), 300);
    }
    if (run.state !== 'done') wasDone.current = false;
  }, [run.state]);

  const pad = density === 'compact' ? 12 : 16;
  const rowPad = density === 'compact' ? 10 : 14;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '232px 340px 1fr',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--ink)',
    }}>
      {/* ─── Left nav ─── */}
      <aside style={{
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '14px 10px',
        background: 'var(--bg-sunken)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 18px' }}>
          <span style={{ color: 'var(--brand)' }}><I.Logo size={22}/></span>
          <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 20, letterSpacing: -0.3 }}>Pilot</span>
          <span style={{ marginLeft: 'auto' }}>
            <Badge tone="neutral" style={{ fontSize: 10 }}>v0.1</Badge>
          </span>
        </div>

        <NavSection label="Workspace">
          <NavItem active={view==='agents'} onClick={() => setView('agents')} icon={<I.Grid size={14}/>}>Agents</NavItem>
          <NavItem active={view==='runs'} onClick={() => setView('runs')} icon={<I.Clock size={14}/>}>Recent runs</NavItem>
        </NavSection>
        <NavSection label="Team">
          <NavItem icon={<I.Users size={14}/>}>Members</NavItem>
        </NavSection>

        <div style={{ marginTop: 'auto' }}>
          <Divider style={{ margin: '10px 0' }}/>
          <NavItem active={view==='settings'} onClick={() => setView('settings')} icon={<I.Gear size={14}/>}>Settings</NavItem>
          <div style={{ padding: '12px 10px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--agent-pm-bg)', color: 'var(--agent-pm)',
              display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
            }}>A</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Ahmed</div>
              <div style={{ fontSize: 11, color: 'var(--ink-60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>trianglz.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Middle: agent list (or runs list) ─── */}
      <section style={{
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        minHeight: 0,
      }}>
        {view === 'agents' && (
          <AgentsListPane
            agents={AGENTS}
            selectedId={selectedAgentId}
            onSelect={setSelectedAgentId}
            pad={pad}
            rowPad={rowPad}
          />
        )}
        {view === 'runs' && (
          <RecentRunsPane
            runs={RECENT_RUNS}
            pad={pad}
            onOpen={(r) => { setView('agents'); setSelectedAgentId(r.agentId); }}
          />
        )}
        {view === 'settings' && (
          <SettingsNavPane />
        )}
      </section>

      {/* ─── Right: run panel / settings body ─── */}
      <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {view === 'settings' ? (
          <SettingsBody />
        ) : (
          <RunPanel
            agent={agent}
            inputs={inputs}
            setInputs={setInputs}
            run={run}
            onOpenPdf={() => setPdfOpen(true)}
            density={density}
          />
        )}
      </section>

      {pdfOpen && run.md && (
        <PdfPreview
          md={run.md}
          agentName={agent.name}
          meta={{ pages: 2 }}
          onClose={() => setPdfOpen(false)}
          onDownload={() => { setPdfOpen(false); setToast('Downloaded. Panel cleared.'); setTimeout(() => setToast(null), 2400); setTimeout(() => run.reset(), 400); }}
        />
      )}
      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Nav atoms
// ─────────────────────────────────────────────────────────────
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

function NavItem({ active, onClick, icon, children, right }) {
  const [hover, setHover] = React.useState(false);
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
      <span style={{ color: active ? 'var(--ink)' : 'var(--ink-60)', display: 'inline-flex' }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
      {right}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Agents list pane
// ─────────────────────────────────────────────────────────────
function AgentsListPane({ agents, selectedId, onSelect, pad, rowPad }) {
  const [q, setQ] = React.useState('');
  const filtered = agents.filter(a => !q || a.name.toLowerCase().includes(q.toLowerCase()) || a.blurb.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div style={{ padding: `${pad}px ${pad}px ${pad - 2}px`, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 className="display" style={{ fontSize: 22, margin: 0, letterSpacing: -0.3 }}>Agents</h2>
          <span style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>{agents.length} installed</span>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-60)', pointerEvents: 'none' }}>
            <I.Search size={13}/>
          </span>
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
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
            pad={rowPad}
          />
        ))}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '10px 12px', marginTop: 4,
          borderRadius: 'var(--r-md)',
          border: '1px dashed var(--border-strong)',
          color: 'var(--ink-60)', fontSize: 12.5,
          justifyContent: 'center',
        }}><I.Plus size={13}/> New agent from .md</button>
      </div>
    </>
  );
}

function AgentRow({ agent, active, onClick, pad }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', textAlign: 'left', width: '100%',
        padding: `${pad}px ${pad + 2}px`,
        marginBottom: 4,
        borderRadius: 'var(--r-md)',
        background: active ? 'var(--bg-raised)' : (hover ? 'var(--ink-03)' : 'transparent'),
        border: active ? '1px solid var(--border-strong)' : '1px solid transparent',
        transition: 'all var(--t-fast)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Badge tone={agent.tone}>{agent.toneLabel}</Badge>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-60)' }}>{agent.lastRun}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.1, marginBottom: 2 }}>{agent.name}</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-60)', lineHeight: 1.45 }}>{agent.blurb}</div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Recent runs pane (view='runs')
// ─────────────────────────────────────────────────────────────
function RecentRunsPane({ runs, pad, onOpen }) {
  return (
    <>
      <div style={{ padding: `${pad}px ${pad}px ${pad - 2}px`, borderBottom: '1px solid var(--border)' }}>
        <h2 className="display" style={{ fontSize: 22, margin: 0, letterSpacing: -0.3 }}>Recent runs</h2>
        <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 4 }}>Latest 7 days</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {runs.map(r => (
          <button key={r.id} onClick={() => onOpen(r)} style={{
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
              {r.status === 'failed' ? <Badge tone="err">failed</Badge> : <Badge tone="ok">done</Badge>}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-60)' }}>{r.when}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-60)' }}>{r.board} · by {r.who}</div>
          </button>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Run panel (the hero screen)
// ─────────────────────────────────────────────────────────────
function RunPanel({ agent, inputs, setInputs, run, onOpenPdf, density }) {
  const pad = density === 'compact' ? 20 : 28;
  const [showPrompt, setShowPrompt] = React.useState(false);
  return (
    <>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: `${density === 'compact' ? 14 : 18}px ${pad}px`,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Badge tone={agent.tone}>{agent.toneLabel}</Badge>
            <span style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>· {agent.est} typical · last run {agent.lastRun}</span>
          </div>
          <h1 className="display" style={{ fontSize: 24, margin: 0, letterSpacing: -0.3 }}>{agent.name}</h1>
          <div style={{ fontSize: 12.5, color: 'var(--ink-60)', marginTop: 2 }}>{agent.description}</div>
        </div>
        <IconBtn title="View agent source (.md)" onClick={() => setShowPrompt(!showPrompt)}><I.FileText size={15}/></IconBtn>
        <IconBtn title="Duplicate"><I.Copy size={15}/></IconBtn>
        {run.state === 'running' ? (
          <Button variant="default" icon={<I.Stop size={11}/>} onClick={run.stop}>Stop</Button>
        ) : (
          <Button variant="primary" icon={<I.Play size={11}/>} onClick={run.start}>Run agent</Button>
        )}
      </header>

      {/* Body: form on left-ish, output on right */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
      }}>
        {/* Form */}
        <div style={{
          borderRight: '1px solid var(--border)',
          padding: pad,
          overflow: 'auto',
          background: 'var(--bg-sunken)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-60)' }}>Inputs</div>
            <button style={{ fontSize: 11.5, color: 'var(--ink-60)', textDecoration: 'underline' }}
              onClick={() => {
                const seed = {}; agent.inputs.forEach(i => { seed[i.id] = i.default || ''; }); setInputs(seed);
              }}>Reset</button>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {agent.inputs.map(field => (
              <div key={field.id}>
                <Label>{field.label}</Label>
                {field.kind === 'select' && (
                  <Select value={inputs[field.id] || ''} onChange={(e) => setInputs({ ...inputs, [field.id]: e.target.value })}>
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                )}
                {field.kind === 'textarea' && (
                  <Textarea rows={4} placeholder={field.placeholder} value={inputs[field.id] || ''} onChange={(e) => setInputs({ ...inputs, [field.id]: e.target.value })} />
                )}
              </div>
            ))}
          </div>

          {showPrompt && (
            <div style={{ marginTop: 20 }}>
              <Label hint="read-only preview">System prompt (.md)</Label>
              <pre className="mono" style={{
                margin: 0, padding: 12,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-82)',
                maxHeight: 220, overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}>{`# Agent: ${agent.name}
# Tools: jira.*

You are a ${agent.toneLabel === 'Eng' ? 'staff engineer' : 'seasoned product manager'} writing
a clear, useful report for stakeholders.

1. Call MCP tools to gather data.
2. Synthesize, don't just dump.
3. Lead with the headline, end with
   recommended next steps.
4. Output clean markdown, no preamble.`}</pre>
            </div>
          )}

          <div style={{ marginTop: 20, padding: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-60)' }}>
              <I.Link size={12}/> Connections
            </div>
            <ConnectionRow icon={<I.Jira size={13}/>} label="Jira · MCP" status="Connected" />
            <ConnectionRow icon={<I.Sparkle size={13}/>} label="OpenRouter · claude-sonnet-4" status="Ready" />
          </div>
        </div>

        {/* Output */}
        <div style={{
          padding: pad, overflow: 'auto',
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-60)' }}>Output</div>
            <RunStatus state={run.state} />
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {run.state === 'done' && (
                <>
                  <Button variant="default" size="sm" icon={<I.FilePdf size={12}/>} onClick={onOpenPdf}>Preview PDF</Button>
                  <Button variant="default" size="sm" icon={<I.Copy size={12}/>}>Copy markdown</Button>
                  <Button variant="default" size="sm" icon={<I.Refresh size={12}/>} onClick={run.start}>Re-run</Button>
                </>
              )}
            </span>
          </div>

          {/* Tool calls */}
          {run.tools.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {run.tools.map(t => <ToolCallRow key={t.id} tool={t}/>)}
            </div>
          )}

          {/* Output surface */}
          {run.state === 'idle' && run.md === '' ? (
            <EmptyOutput agent={agent} />
          ) : (
            <div style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '22px 28px',
              flex: 1,
              animation: 'fade-in 220ms var(--ease)',
            }}>
              <Markdown text={run.md} cursor={run.state === 'running' && run.md.length > 0} />
              {run.state === 'done' && (
                <div style={{
                  marginTop: 18, paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ color: 'var(--ok)' }}><I.Check size={14}/></span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-82)' }}>Complete. PDF downloaded.</span>
                  <span style={{ marginLeft: 'auto' }}>
                    <Button variant="default" size="sm" icon={<I.FilePdf size={12}/>} onClick={onOpenPdf}>Open PDF preview</Button>
                  </span>
                </div>
              )}
            </div>
          )}

          {run.state === 'running' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-60)', fontSize: 12 }}>
              <StatusDot tone="ok" pulse /> Streaming · PDF will download on completion
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RunStatus({ state }) {
  if (state === 'idle') return <Badge tone="neutral">Ready</Badge>;
  if (state === 'running') return <Badge tone="warn"><Spinner size={9}/> Running</Badge>;
  if (state === 'done') return <Badge tone="ok"><I.Check size={10}/> Complete</Badge>;
  return null;
}

function EmptyOutput({ agent }) {
  return (
    <div style={{
      flex: 1,
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--r-lg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 40,
      minHeight: 320,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          width: 40, height: 40, margin: '0 auto 14px',
          borderRadius: 'var(--r-md)',
          background: 'var(--ink-04)',
          display: 'grid', placeItems: 'center',
          color: 'var(--ink-60)',
        }}><I.FileText size={18}/></div>
        <div className="display" style={{ fontSize: 20, letterSpacing: -0.2, marginBottom: 6 }}>Ready when you are</div>
        <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.55 }}>
          Fill in the inputs on the left, hit <strong style={{ color: 'var(--ink-82)' }}>Run agent</strong>. {agent.name.toLowerCase()} will pull from Jira, stream its reasoning, and download a PDF when done.
        </div>
        <div style={{ marginTop: 14, display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--ink-60)', fontSize: 11.5 }}>
          <Kbd>⌘</Kbd><Kbd>↵</Kbd> <span>to run</span>
        </div>
      </div>
    </div>
  );
}

function ConnectionRow({ icon, label, status }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
      <span style={{ color: 'var(--ink-60)' }}>{icon}</span>
      <span style={{ color: 'var(--ink-82)' }}>{label}</span>
      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-60)' }}>
        <StatusDot tone="ok"/> {status}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings (middle + right panes)
// ─────────────────────────────────────────────────────────────
function SettingsNavPane() {
  return (
    <>
      <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
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
  const [orKey, setOrKey] = React.useState('sk-or-v1-••••••••••••••••••••••••••••••••1c2a');
  const [mcpUrl, setMcpUrl] = React.useState('https://jira-mcp.pilot.internal.railway.app');
  const [revealed, setRevealed] = React.useState(false);
  return (
    <div style={{ padding: 36, overflow: 'auto', flex: 1, maxWidth: 820 }}>
      <h1 className="display" style={{ fontSize: 28, letterSpacing: -0.4, margin: '0 0 6px' }}>Connections</h1>
      <p style={{ color: 'var(--ink-60)', fontSize: 13.5, margin: '0 0 28px', maxWidth: 560 }}>
        Pilot stores these in your browser. They never touch a backend. See the{' '}
        <span style={{ textDecoration: 'underline' }}>security note</span> for tradeoffs.
      </p>

      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        background: 'var(--bg-raised)',
        overflow: 'hidden',
      }}>
        <SettingRow
          icon={<I.Sparkle size={15}/>}
          title="OpenRouter API key"
          sub="Used for model inference. Key is stored in localStorage."
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              type={revealed ? 'text' : 'password'}
              value={orKey}
              onChange={(e) => setOrKey(e.target.value)}
              style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12 }}
            />
            <Button variant="default" onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide' : 'Reveal'}</Button>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ok)' }}>
            <StatusDot tone="ok"/> Valid · $12.40 remaining credit
          </div>
        </SettingRow>

        <Divider />

        <SettingRow
          icon={<I.Jira size={15}/>}
          title="Jira MCP server"
          sub="URL of your deployed MCP server. Must have CORS enabled for this origin."
        >
          <Input value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)}
            style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12 }} />
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ok)' }}>
            <StatusDot tone="ok"/> Connected · 8 tools exposed · last ping 2s ago
          </div>
        </SettingRow>

        <Divider />

        <SettingRow
          icon={<I.Warning size={15}/>}
          title="Security note"
          sub="Acknowledged tradeoff for an internal-only tool."
        >
          <div style={{
            padding: 12, borderRadius: 'var(--r-sm)',
            background: 'var(--ink-04)',
            border: '1px solid var(--border)',
            fontSize: 12.5, color: 'var(--ink-82)', lineHeight: 1.55,
          }}>
            Keys live in <code className="mono" style={{ background: 'var(--ink-04)', padding: '1px 5px', borderRadius: 3 }}>localStorage</code> and are visible in DevTools.
            Acceptable for a small trusted team. Rotate keys if a machine leaves the org.
          </div>
        </SettingRow>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="default">Test connections</Button>
        <Button variant="primary">Save</Button>
      </div>
    </div>
  );
}

function SettingRow({ icon, title, sub, children }) {
  return (
    <div style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 'var(--r-sm)',
          background: 'var(--ink-04)', border: '1px solid var(--border)',
          display: 'grid', placeItems: 'center', color: 'var(--ink-82)',
          flexShrink: 0,
        }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-60)', marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

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
    }}>
      <span style={{ color: 'var(--brand)' }}><I.Download size={13}/></span>
      {children}
    </div>
  );
}

window.DirectionA = DirectionA;
