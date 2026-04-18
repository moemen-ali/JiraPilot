// Pilot — agent run panel + streaming + PDF preview

// ─────────────────────────────────────────────────────────────
// useFakeRun — drives the mocked streaming of tool calls + markdown
// ─────────────────────────────────────────────────────────────
function useFakeRun(script) {
  const [state, setState] = React.useState('idle'); // idle | running | done
  const [tools, setTools] = React.useState([]); // [{id, label, detail, state: 'running'|'done'}]
  const [md, setMd] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  const timers = React.useRef([]);

  const reset = React.useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setState('idle'); setTools([]); setMd(''); setProgress(0);
  }, []);

  const start = React.useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTools([]); setMd(''); setProgress(0); setState('running');

    let t = 0;
    let toolCounter = 0;
    script.forEach((step) => {
      if (step.type === 'tool') {
        const id = ++toolCounter;
        timers.current.push(setTimeout(() => {
          setTools((prev) => [...prev, { id, label: step.label, detail: step.detail, state: 'running' }]);
        }, t));
        t += step.dur;
        timers.current.push(setTimeout(() => {
          setTools((prev) => prev.map(x => x.id === id ? { ...x, state: 'done' } : x));
        }, t));
        t += 120;
      } else if (step.type === 'md') {
        // stream the chunk char-by-char for the feel
        const text = step.text;
        const chunkSize = 4;
        for (let i = 0; i < text.length; i += chunkSize) {
          const slice = text.slice(i, i + chunkSize);
          timers.current.push(setTimeout(() => {
            setMd((prev) => prev + slice);
          }, t));
          t += 18;
        }
        t += 60;
      }
    });

    timers.current.push(setTimeout(() => {
      setState('done'); setProgress(1);
    }, t));
  }, [script]);

  const stop = React.useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setState('idle');
  }, []);

  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return { state, tools, md, progress, start, stop, reset };
}

// ─────────────────────────────────────────────────────────────
// Markdown → JSX (minimal, dependency-free)
// Handles: #, ##, bold**, italic*, code`, - lists, 1. ordered, paragraphs
// ─────────────────────────────────────────────────────────────
function renderInline(text, keyBase) {
  // Split into tokens of code `x`, bold **x**, italic *x*, plain
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0; let m; let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    if (s.startsWith('**')) parts.push(<strong key={`${keyBase}-b-${i}`}>{s.slice(2, -2)}</strong>);
    else if (s.startsWith('`')) parts.push(<code key={`${keyBase}-c-${i}`} className="mono" style={{
      fontSize: '0.9em', padding: '1px 5px', background: 'var(--ink-04)',
      border: '1px solid var(--border-soft)', borderRadius: 4,
    }}>{s.slice(1, -1)}</code>);
    else parts.push(<em key={`${keyBase}-i-${i}`}>{s.slice(1, -1)}</em>);
    last = m.index + s.length; i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Markdown({ text, cursor }) {
  const lines = text.split('\n');
  const out = [];
  let listBuf = null; // {type, items}
  const flushList = () => {
    if (!listBuf) return;
    const Tag = listBuf.type === 'ul' ? 'ul' : 'ol';
    out.push(
      <Tag key={`l-${out.length}`} style={{
        margin: '8px 0 14px', paddingLeft: 22, color: 'var(--ink-82)',
      }}>
        {listBuf.items.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{renderInline(t, `li-${out.length}-${i}`)}</li>)}
      </Tag>
    );
    listBuf = null;
  };
  lines.forEach((rawLine, idx) => {
    const line = rawLine;
    if (/^# /.test(line)) {
      flushList();
      out.push(<h1 key={idx} className="display" style={{ fontSize: 28, margin: '18px 0 8px', letterSpacing: -0.4, color: 'var(--ink)' }}>{renderInline(line.slice(2), `h1-${idx}`)}</h1>);
    } else if (/^## /.test(line)) {
      flushList();
      out.push(<h2 key={idx} style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 6px', color: 'var(--ink)', letterSpacing: -0.1 }}>{renderInline(line.slice(3), `h2-${idx}`)}</h2>);
    } else if (/^\*[^*]/.test(line) && /^\*[^*].*\*\s*$/.test(line.trim())) {
      // meta italic line at top of doc
      flushList();
      out.push(<p key={idx} style={{ margin: '2px 0 12px', color: 'var(--ink-60)', fontSize: 12.5 }}>{renderInline(line, `m-${idx}`)}</p>);
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
      {cursor && <span style={{
        display: 'inline-block', width: 2, height: 14,
        background: 'var(--brand)', verticalAlign: -2,
        animation: 'blink 1s steps(2) infinite',
      }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tool call card — shows MCP fetches as they happen
// ─────────────────────────────────────────────────────────────
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
      <span className="mono" style={{ color: 'var(--ink-82)', fontSize: 11.5 }}>{tool.detail}</span>
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {tool.state === 'running' ? (
          <><Spinner size={10}/><span style={{ color: 'var(--ink-60)', fontSize: 11 }}>fetching…</span></>
        ) : (
          <><span style={{ color: 'var(--ok)' }}><I.Check size={12}/></span><span style={{ color: 'var(--ink-60)', fontSize: 11 }}>done</span></>
        )}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PDF Preview — faux A4 page rendering the completed markdown
// ─────────────────────────────────────────────────────────────
function PdfPreview({ md, agentName, meta, onDownload, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center',
      animation: 'fade-in 180ms var(--ease)',
      backdropFilter: 'blur(6px)',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        display: 'flex', flexDirection: 'column',
        width: '100%', maxWidth: 920,
        margin: '32px 24px',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--r-sm)',
            background: 'var(--ink-04)', border: '1px solid var(--border)',
            display: 'grid', placeItems: 'center', color: 'var(--err)',
          }}><I.FilePdf size={15}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {agentName.toLowerCase().replace(/\s+/g, '-')}-{new Date().toISOString().slice(0,10)}.pdf
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>
              Generated · {meta?.pages || 2} pages · ready to download
            </div>
          </div>
          <Button variant="default" size="sm" onClick={onClose}>Close</Button>
          <Button variant="primary" size="sm" icon={<I.Download size={13}/>} onClick={onDownload}>Download</Button>
        </div>
        {/* Body — scrollable A4 */}
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
            {/* Header strip inside page */}
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
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', color: '#1c1c1c' }}>
              <PdfMarkdown md={md} />
            </div>
          </div>
        </div>
      </div>
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
    out.push(<Tag key={`l-${out.length}`} style={{ margin: '8px 0 14px', paddingLeft: 22, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
      {listBuf.items.map((t, i) => <li key={i} style={{ marginBottom: 4, color: '#1c1c1c' }}>{renderInline(t, `pli-${out.length}-${i}`)}</li>)}
    </Tag>);
    listBuf = null;
  };
  lines.forEach((line, idx) => {
    if (/^# /.test(line)) { flushList(); out.push(<h1 key={idx} style={{ fontSize: 28, margin: '6px 0 8px', letterSpacing: -0.4, fontWeight: 400 }}>{renderInline(line.slice(2), `ph1-${idx}`)}</h1>); }
    else if (/^## /.test(line)) { flushList(); out.push(<h2 key={idx} style={{ fontSize: 16, margin: '22px 0 6px', fontWeight: 600, fontFamily: 'Inter, sans-serif', letterSpacing: -0.1 }}>{renderInline(line.slice(3), `ph2-${idx}`)}</h2>); }
    else if (/^\*[^*].*\*\s*$/.test(line.trim())) { flushList(); out.push(<p key={idx} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: '#5f5f5d', margin: '0 0 18px' }}>{renderInline(line, `pm-${idx}`)}</p>); }
    else if (/^- /.test(line)) { if (!listBuf || listBuf.type !== 'ul') { flushList(); listBuf = { type: 'ul', items: [] }; } listBuf.items.push(line.slice(2)); }
    else if (/^\d+\.\s/.test(line)) { if (!listBuf || listBuf.type !== 'ol') { flushList(); listBuf = { type: 'ol', items: [] }; } listBuf.items.push(line.replace(/^\d+\.\s/, '')); }
    else if (line.trim() === '') { flushList(); }
    else { flushList(); out.push(<p key={idx} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, lineHeight: 1.6, margin: '0 0 10px', color: '#1c1c1c' }}>{renderInline(line, `pp-${idx}`)}</p>); }
  });
  flushList();
  return <>{out}</>;
}

Object.assign(window, { useFakeRun, Markdown, ToolCallRow, PdfPreview });
