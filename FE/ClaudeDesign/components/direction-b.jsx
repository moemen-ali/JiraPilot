// Pilot — Direction B: Command-palette / document-first
// One focused stage: agent picker as a grid of cards, run as a
// generated document in the center. Meant to feel like a writing tool.

function DirectionB({ theme, density }) {
  const [selectedAgentId, setSelectedAgentId] = React.useState(null); // null = picker
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const agent = AGENTS.find(a => a.id === selectedAgentId);
  const script = agent ? STREAM_SCRIPTS[agent.id] : STREAM_SCRIPTS.sprint;
  const run = useFakeRun(script);

  const [inputs, setInputs] = React.useState({});
  React.useEffect(() => {
    if (!agent) return;
    const seed = {};
    agent.inputs.forEach(i => { seed[i.id] = i.default || ''; });
    setInputs(seed);
    run.reset();
  }, [selectedAgentId]);

  const wasDone = React.useRef(false);
  React.useEffect(() => {
    if (run.state === 'done' && !wasDone.current) {
      wasDone.current = true;
      setTimeout(() => setPdfOpen(true), 300);
    }
    if (run.state !== 'done') wasDone.current = false;
  }, [run.state]);

  // Keyboard: cmd+k opens palette
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', height: '100vh',
      background: 'var(--bg)', color: 'var(--ink)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <TopBarB onOpenPalette={() => setCmdOpen(true)} agent={agent} onBack={() => setSelectedAgentId(null)} />

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!agent ? (
          <AgentPickerB onPick={(id) => setSelectedAgentId(id)} />
        ) : (
          <DocumentStageB
            agent={agent}
            inputs={inputs}
            setInputs={setInputs}
            run={run}
            onOpenPdf={() => setPdfOpen(true)}
          />
        )}
      </main>

      {cmdOpen && (
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          onPick={(id) => { setSelectedAgentId(id); setCmdOpen(false); }}
        />
      )}

      {pdfOpen && run.md && (
        <PdfPreview
          md={run.md}
          agentName={agent.name}
          meta={{ pages: 2 }}
          onClose={() => setPdfOpen(false)}
          onDownload={() => { setPdfOpen(false); setToast('Downloaded. Document cleared.'); setTimeout(() => setToast(null), 2400); setTimeout(() => { run.reset(); setSelectedAgentId(null); }, 400); }}
        />
      )}
      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

function TopBarB({ onOpenPalette, agent, onBack }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 22px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
    }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--brand)' }}><I.Logo size={20}/></span>
        <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 19, letterSpacing: -0.3 }}>Pilot</span>
      </button>
      {agent && (
        <>
          <span style={{ color: 'var(--ink-40)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--ink-82)' }}>{agent.name}</span>
          <Badge tone={agent.tone} style={{ marginLeft: 0 }}>{agent.toneLabel}</Badge>
        </>
      )}
      <button
        onClick={onOpenPalette}
        style={{
          marginLeft: 'auto',
          height: 32, width: 280,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 10px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          color: 'var(--ink-60)', fontSize: 12.5,
          textAlign: 'left',
        }}>
        <I.Search size={13}/>
        <span>Search agents, runs, settings…</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 3 }}><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
      </button>
      <IconBtn title="Settings"><I.Gear size={15}/></IconBtn>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: 'var(--agent-pm-bg)', color: 'var(--agent-pm)',
        display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
      }}>A</div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Agent picker — editorial, card-grid
// ─────────────────────────────────────────────────────────────
function AgentPickerB({ onPick }) {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '64px 32px 80px', width: '100%' }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Badge tone="ok"><I.Sparkle size={10}/> 4 agents ready</Badge>
          <span style={{ fontSize: 12, color: 'var(--ink-60)' }}>Jira · MCP connected</span>
        </div>
        <h1 className="display" style={{ fontSize: 44, margin: 0, letterSpacing: -0.8, lineHeight: 1.02 }}>
          What should we report on today?
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-60)', marginTop: 10, maxWidth: 540, lineHeight: 1.5 }}>
          Pick an agent. It reads the right slice of Jira, thinks about it, and hands you a PDF you can forward straight to leadership.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 14,
      }}>
        {AGENTS.map((a) => (
          <AgentCardB key={a.id} agent={a} onClick={() => onPick(a.id)} />
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-60)', marginBottom: 10 }}>Recent runs</div>
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          background: 'var(--bg-raised)',
          overflow: 'hidden',
        }}>
          {RECENT_RUNS.slice(0, 4).map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 16px',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              fontSize: 12.5,
            }}>
              <span style={{ color: 'var(--err)' }}><I.FilePdf size={14}/></span>
              <span style={{ fontWeight: 500 }}>{r.agent}</span>
              <span style={{ color: 'var(--ink-60)' }}>{r.board}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--ink-60)', fontSize: 11.5 }}>{r.who} · {r.when}</span>
              <IconBtn><I.Download size={13}/></IconBtn>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentCardB({ agent, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', textAlign: 'left', width: '100%',
        padding: 18,
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        transition: 'all var(--t-med) var(--ease)',
        transform: hover ? 'translateY(-1px)' : 'none',
        boxShadow: hover ? 'var(--shadow-focus)' : 'none',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Badge tone={agent.tone}>{agent.toneLabel}</Badge>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-60)' }}>{agent.est}</span>
      </div>
      <div className="display" style={{ fontSize: 20, letterSpacing: -0.25, marginBottom: 6 }}>{agent.name}</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-60)', lineHeight: 1.5, minHeight: 36 }}>{agent.blurb}</div>
      <div style={{
        marginTop: 14, paddingTop: 12,
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11.5, color: hover ? 'var(--ink)' : 'var(--ink-60)',
        transition: 'color var(--t-fast)',
      }}>
        <I.Play size={10}/> Start run <span style={{ marginLeft: 'auto' }}><I.ChevRight size={12}/></span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Document stage — the writing-tool feel
// ─────────────────────────────────────────────────────────────
function DocumentStageB({ agent, inputs, setInputs, run, onOpenPdf }) {
  const [drawerOpen, setDrawerOpen] = React.useState(run.state === 'idle');
  React.useEffect(() => { if (run.state === 'running') setDrawerOpen(false); }, [run.state]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Center document */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 32px 120px', width: '100%' }}>
          <div style={{ marginBottom: 28 }}>
            <Badge tone={agent.tone}>{agent.toneLabel} · {agent.name}</Badge>
            <h1 className="display" style={{ fontSize: 38, letterSpacing: -0.7, lineHeight: 1.05, margin: '14px 0 4px' }}>
              {run.state === 'idle'
                ? agent.name
                : run.state === 'running'
                  ? 'Thinking…'
                  : 'Report'}
            </h1>
            <div style={{ fontSize: 13.5, color: 'var(--ink-60)' }}>
              {run.state === 'idle' && <>Configure the run below, then press <strong style={{ color: 'var(--ink-82)' }}>Run</strong>.</>}
              {run.state === 'running' && <>Fetching from Jira and drafting. A PDF will be ready when it\u2019s done.</>}
              {run.state === 'done' && <>Draft ready · PDF downloaded automatically · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
            </div>
          </div>

          {run.tools.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {run.tools.map(t => <ToolCallRow key={t.id} tool={t}/>)}
            </div>
          )}

          {run.md ? (
            <div style={{ animation: 'fade-in 260ms var(--ease)' }}>
              <Markdown text={run.md} cursor={run.state === 'running'} />
            </div>
          ) : run.state === 'idle' ? (
            <IdleDocPreview agent={agent} />
          ) : null}

          {run.state === 'done' && (
            <div style={{
              marginTop: 30,
              padding: 16,
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              background: 'var(--bg-raised)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ color: 'var(--err)' }}><I.FilePdf size={20}/></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{agent.name.toLowerCase().replace(/\s+/g, '-')}-{new Date().toISOString().slice(0,10)}.pdf</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>2 pages · downloaded to your Downloads folder</div>
              </div>
              <Button variant="default" size="sm" onClick={onOpenPdf}>Preview</Button>
              <Button variant="primary" size="sm" icon={<I.Download size={12}/>}>Download again</Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom dock: inputs + run — feels like a composer */}
      <div style={{
        position: 'sticky', bottom: 0,
        padding: '0 24px 24px',
        display: 'flex', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          pointerEvents: 'auto',
          width: '100%', maxWidth: 780,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          {drawerOpen && (
            <div style={{
              padding: '16px 18px 6px',
              borderBottom: '1px solid var(--border)',
              animation: 'fade-in 200ms var(--ease)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: agent.inputs.length >= 2 ? '1fr 1fr' : '1fr', gap: 12 }}>
                {agent.inputs.filter(f => f.kind === 'select').map(field => (
                  <div key={field.id}>
                    <Label>{field.label}</Label>
                    <Select value={inputs[field.id] || ''} onChange={(e) => setInputs({ ...inputs, [field.id]: e.target.value })}>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  </div>
                ))}
              </div>
              {agent.inputs.find(f => f.kind === 'textarea') && (
                <div style={{ marginTop: 12 }}>
                  <Label>Additional context <span style={{ color: 'var(--ink-60)', fontWeight: 400 }}>(optional)</span></Label>
                  <Textarea
                    rows={2}
                    placeholder={agent.inputs.find(f => f.kind === 'textarea').placeholder}
                    value={inputs.context || ''}
                    onChange={(e) => setInputs({ ...inputs, context: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
          }}>
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 30, padding: '0 10px',
                borderRadius: 'var(--r-sm)',
                color: 'var(--ink-82)', fontSize: 12.5,
                background: drawerOpen ? 'var(--ink-04)' : 'transparent',
              }}>
              <span style={{ transform: drawerOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 160ms' }}>
                <I.ChevDown size={12}/>
              </span>
              {agent.inputs.length} inputs
            </button>
            <Divider vertical style={{ height: 18 }}/>
            <span style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>
              {run.state === 'running' ? 'Streaming…' : run.state === 'done' ? 'Complete' : `Typical run · ${agent.est}`}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {run.state === 'done' && (
                <Button variant="default" icon={<I.Refresh size={12}/>} onClick={() => { run.reset(); setDrawerOpen(true); }}>Reset</Button>
              )}
              {run.state === 'running' ? (
                <Button variant="default" icon={<I.Stop size={11}/>} onClick={run.stop}>Stop</Button>
              ) : (
                <Button variant="primary" icon={<I.Play size={11}/>} onClick={run.start}>
                  Run <span style={{ marginLeft: 8, opacity: 0.6, display: 'inline-flex', gap: 2 }}><Kbd>⌘</Kbd><Kbd>↵</Kbd></span>
                </Button>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdleDocPreview({ agent }) {
  return (
    <div style={{
      padding: '32px 36px',
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--r-lg)',
      background: 'var(--ink-03)',
      opacity: 0.72,
    }}>
      <div style={{ fontSize: 12.5, color: 'var(--ink-60)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <I.FileText size={13}/> Preview shape · will fill in when you run
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <SkelLine w="60%" h={22}/>
        <SkelLine w="30%" h={12}/>
        <div style={{ height: 8 }}/>
        <SkelLine w="18%" h={14}/>
        <SkelLine w="92%"/>
        <SkelLine w="88%"/>
        <SkelLine w="64%"/>
        <div style={{ height: 8 }}/>
        <SkelLine w="22%" h={14}/>
        <SkelLine w="80%"/>
        <SkelLine w="76%"/>
        <SkelLine w="70%"/>
      </div>
    </div>
  );
}

function SkelLine({ w = '100%', h = 10 }) {
  return (
    <div style={{
      height: h, width: w,
      borderRadius: 3,
      background: 'linear-gradient(90deg, var(--ink-04) 25%, var(--ink-08) 37%, var(--ink-04) 63%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 2.4s ease-in-out infinite',
    }} />
  );
}

// ─────────────────────────────────────────────────────────────
// Command palette
// ─────────────────────────────────────────────────────────────
function CommandPalette({ onClose, onPick }) {
  const [q, setQ] = React.useState('');
  const filtered = AGENTS.filter(a => !q || a.name.toLowerCase().includes(q.toLowerCase()) || a.blurb.toLowerCase().includes(q.toLowerCase()));
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 85,
      background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center',
      paddingTop: '18vh',
      animation: 'fade-in 160ms var(--ease)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520,
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--ink-60)' }}><I.Search size={14}/></span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Run agent, open setting, search…" style={{
            flex: 1, background: 'transparent', border: 0, outline: 'none',
            fontSize: 14, color: 'var(--ink)',
          }}/>
          <Kbd>esc</Kbd>
        </div>
        <div style={{ padding: 6, maxHeight: 360, overflow: 'auto' }}>
          <div style={{ padding: '8px 10px 4px', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-60)' }}>Agents</div>
          {filtered.map((a, i) => (
            <button key={a.id} onClick={() => onPick(a.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px 10px', borderRadius: 'var(--r-sm)',
              textAlign: 'left', fontSize: 13, color: 'var(--ink)',
              background: i === 0 ? 'var(--ink-04)' : 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink-04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = i === 0 ? 'var(--ink-04)' : 'transparent'; }}
            >
              <Badge tone={a.tone}>{a.toneLabel}</Badge>
              <span style={{ fontWeight: 500 }}>{a.name}</span>
              <span style={{ color: 'var(--ink-60)', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {a.blurb}</span>
              <span style={{ color: 'var(--ink-60)', fontSize: 11 }}>{a.est}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

window.DirectionB = DirectionB;
