// Pilot — atomic components (buttons, inputs, badges, tooltips)
// Style tokens come from styles/tokens.css via CSS variables.

const atomStyles = {
  btn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    height: 32,
    padding: '0 14px',
    borderRadius: 'var(--r-sm)',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: -0.01,
    whiteSpace: 'nowrap',
    transition: 'opacity var(--t-fast) var(--ease), background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease)',
    cursor: 'pointer',
    userSelect: 'none',
  },
};

function Button({
  variant = 'default',
  size = 'md',
  icon,
  children,
  style,
  disabled,
  loading,
  ...rest
}) {
  const sizeMap = {
    sm: { height: 26, padding: '0 10px', fontSize: 12 },
    md: { height: 32, padding: '0 14px', fontSize: 13 },
    lg: { height: 38, padding: '0 18px', fontSize: 14 },
    icon: { height: 30, width: 30, padding: 0, fontSize: 13 },
  };
  const variants = {
    primary: {
      background: 'var(--ink)',
      color: 'var(--on-dark)',
      boxShadow: 'var(--shadow-inset)',
    },
    brand: {
      background: 'var(--brand)',
      color: 'var(--brand-ink)',
      boxShadow: 'var(--shadow-inset)',
    },
    default: {
      background: 'var(--bg-raised)',
      color: 'var(--ink)',
      border: '1px solid var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--ink)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--ink)',
      border: '1px solid var(--border-strong)',
    },
    danger: {
      background: 'transparent',
      color: 'var(--err)',
      border: '1px solid var(--border)',
    },
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{
        ...atomStyles.btn,
        ...sizeMap[size],
        ...variants[variant],
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onMouseDown={(e) => { e.currentTarget.style.opacity = 0.82; rest.onMouseDown?.(e); }}
      onMouseUp={(e) => { e.currentTarget.style.opacity = disabled ? 0.5 : 1; rest.onMouseUp?.(e); }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = disabled ? 0.5 : 1; rest.onMouseLeave?.(e); }}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

function Spinner({ size = 12 }) {
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size,
        borderRadius: '50%',
        border: '1.5px solid currentColor',
        borderTopColor: 'transparent',
        display: 'inline-block',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}

function IconBtn({ children, active, ...rest }) {
  return (
    <button
      {...rest}
      style={{
        width: 30, height: 30,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--r-sm)',
        color: active ? 'var(--ink)' : 'var(--ink-60)',
        background: active ? 'var(--ink-04)' : 'transparent',
        transition: 'background var(--t-fast), color var(--t-fast)',
        ...rest.style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink-04)'; e.currentTarget.style.color = 'var(--ink)'; rest.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--ink-04)' : 'transparent'; e.currentTarget.style.color = active ? 'var(--ink)' : 'var(--ink-60)'; rest.onMouseLeave?.(e); }}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = 'neutral', style }) {
  const tones = {
    neutral: { background: 'var(--ink-04)', color: 'var(--ink-82)', border: '1px solid var(--border)' },
    pm: { background: 'var(--agent-pm-bg)', color: 'var(--agent-pm)' },
    eng: { background: 'var(--agent-eng-bg)', color: 'var(--agent-eng)' },
    data: { background: 'var(--agent-data-bg)', color: 'var(--agent-data)' },
    release: { background: 'var(--agent-release-bg)', color: 'var(--agent-release)' },
    ok: { background: 'var(--brand-soft)', color: 'var(--brand)' },
    warn: { background: 'rgba(176, 122, 30, 0.14)', color: 'var(--warn)' },
    err: { background: 'rgba(166, 67, 42, 0.14)', color: 'var(--err)' },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.01,
      padding: '2px 8px',
      borderRadius: 'var(--r-sm)',
      ...tones[tone], ...style,
    }}>{children}</span>
  );
}

function Kbd({ children }) {
  return (
    <span className="mono" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 18, height: 18, padding: '0 5px',
      fontSize: 10.5, fontWeight: 500,
      color: 'var(--ink-60)',
      background: 'var(--ink-04)',
      border: '1px solid var(--border)',
      borderBottomWidth: 1.5,
      borderRadius: 4,
    }}>{children}</span>
  );
}

function Input({ style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      {...rest}
      onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
      style={{
        height: 34,
        width: '100%',
        padding: '0 12px',
        borderRadius: 'var(--r-sm)',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        outline: 'none',
        fontSize: 13,
        color: 'var(--ink)',
        boxShadow: focused ? `0 0 0 3px var(--ring)` : 'none',
        transition: 'box-shadow var(--t-fast), border-color var(--t-fast)',
        ...style,
      }}
    />
  );
}

function Textarea({ style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      {...rest}
      onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 'var(--r-sm)',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        outline: 'none',
        fontSize: 13,
        color: 'var(--ink)',
        lineHeight: 1.5,
        resize: 'vertical',
        boxShadow: focused ? `0 0 0 3px var(--ring)` : 'none',
        transition: 'box-shadow var(--t-fast), border-color var(--t-fast)',
        fontFamily: 'inherit',
        ...style,
      }}
    />
  );
}

function Select({ children, style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <select
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          height: 34,
          width: '100%',
          padding: '0 32px 0 12px',
          borderRadius: 'var(--r-sm)',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          outline: 'none',
          fontSize: 13,
          color: 'var(--ink)',
          boxShadow: focused ? `0 0 0 3px var(--ring)` : 'none',
          transition: 'box-shadow var(--t-fast)',
          cursor: 'pointer',
          ...style,
        }}
      >{children}</select>
      <svg width="10" height="10" viewBox="0 0 10 10" style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: 'var(--ink-60)',
      }}><path d="M2 3.5 L5 6.5 L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

function Label({ children, hint, htmlFor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
      <label htmlFor={htmlFor} style={{
        fontSize: 12, fontWeight: 500, color: 'var(--ink-82)',
        letterSpacing: 0.01,
      }}>{children}</label>
      {hint && <span style={{ fontSize: 11, color: 'var(--ink-60)' }}>{hint}</span>}
    </div>
  );
}

function Divider({ vertical, style }) {
  return (
    <div style={{
      background: 'var(--border)',
      ...(vertical ? { width: 1, alignSelf: 'stretch' } : { height: 1, width: '100%' }),
      ...style,
    }} />
  );
}

function Card({ children, style, padding = 16, raised }) {
  return (
    <div style={{
      background: raised ? 'var(--bg-raised)' : 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding,
      ...style,
    }}>{children}</div>
  );
}

function SegmentedControl({ options, value, onChange, size = 'md' }) {
  const h = size === 'sm' ? 26 : 30;
  return (
    <div style={{
      display: 'inline-flex', padding: 2,
      background: 'var(--ink-04)',
      borderRadius: 'var(--r-md)',
      border: '1px solid var(--border-soft)',
    }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            height: h - 4,
            padding: '0 10px',
            fontSize: size === 'sm' ? 11.5 : 12.5,
            fontWeight: 500,
            borderRadius: 'calc(var(--r-md) - 2px)',
            color: value === o.value ? 'var(--ink)' : 'var(--ink-60)',
            background: value === o.value ? 'var(--bg-raised)' : 'transparent',
            boxShadow: value === o.value ? 'var(--shadow-card)' : 'none',
            transition: 'all var(--t-fast)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >{o.icon}{o.label}</button>
      ))}
    </div>
  );
}

// Small helper: status dot with pulse
function StatusDot({ tone = 'ok', pulse }) {
  const toneColor = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : tone === 'err' ? 'var(--err)' : 'var(--ink-60)';
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: toneColor,
      boxShadow: pulse ? `0 0 0 0 ${toneColor}` : 'none',
      animation: pulse ? 'pulse-dot 1.6s ease-in-out infinite' : 'none',
      position: 'relative',
    }} />
  );
}

Object.assign(window, {
  Button, IconBtn, Badge, Kbd, Input, Textarea, Select, Label,
  Divider, Card, SegmentedControl, StatusDot, Spinner,
});
