// Pilot — shared icons (line-based, 16px grid)
// All icons use currentColor + 1.5 stroke width for consistency.

const Icon = ({ children, size = 16, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }} {...rest}>{children}</svg>
);

const I = {
  Logo: (p) => (
    <svg width={p.size || 20} height={p.size || 20} viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" fill="currentColor" opacity="0.12"/>
      <path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 7 L16.5 9.5 V14.5 L12 17 L7.5 14.5 V9.5 Z" fill="currentColor"/>
    </svg>
  ),
  Play: (p) => <Icon {...p}><path d="M4 3 L13 8 L4 13 Z" fill="currentColor" stroke="none"/></Icon>,
  Stop: (p) => <Icon {...p}><rect x="3.5" y="3.5" width="9" height="9" rx="1" fill="currentColor" stroke="none"/></Icon>,
  Grid: (p) => <Icon {...p}><rect x="2" y="2" width="5" height="5" rx="0.5"/><rect x="9" y="2" width="5" height="5" rx="0.5"/><rect x="2" y="9" width="5" height="5" rx="0.5"/><rect x="9" y="9" width="5" height="5" rx="0.5"/></Icon>,
  List: (p) => <Icon {...p}><path d="M2 4h12M2 8h12M2 12h12"/></Icon>,
  Clock: (p) => <Icon {...p}><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8L10.5 9.5"/></Icon>,
  Users: (p) => <Icon {...p}><circle cx="6" cy="6" r="2.5"/><path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4"/><circle cx="11" cy="5.5" r="2"/><path d="M10 13c2.8 0 4 -1.3 4-3"/></Icon>,
  Gear: (p) => <Icon {...p}><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4"/></Icon>,
  Search: (p) => <Icon {...p}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 L14 14"/></Icon>,
  Plus: (p) => <Icon {...p}><path d="M8 3v10M3 8h10"/></Icon>,
  Check: (p) => <Icon {...p}><path d="M3 8.5 L6.5 12 L13 4"/></Icon>,
  X: (p) => <Icon {...p}><path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5"/></Icon>,
  Dots: (p) => <Icon {...p}><circle cx="3.5" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="12.5" cy="8" r="1" fill="currentColor"/></Icon>,
  ChevRight: (p) => <Icon {...p}><path d="M6 4 L10 8 L6 12"/></Icon>,
  ChevDown: (p) => <Icon {...p}><path d="M4 6 L8 10 L12 6"/></Icon>,
  Download: (p) => <Icon {...p}><path d="M8 2v8M4.5 7 L8 10.5 L11.5 7"/><path d="M3 12.5 V14 H13 V12.5"/></Icon>,
  FileText: (p) => <Icon {...p}><path d="M4 2h5l3 3v9H4Z"/><path d="M9 2v3h3M6 8h4M6 10.5h4M6 6h2"/></Icon>,
  FilePdf: (p) => <Icon {...p}><path d="M4 2h5l3 3v9H4Z"/><path d="M9 2v3h3"/><path d="M6 9.5h1.2c.4 0 .8-.3.8-.8s-.4-.7-.8-.7H6v3M9 11.5V8h1a1 1 0 011 1v1.5a1 1 0 01-1 1z" /></Icon>,
  Jira: (p) => (
    <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 16 16" fill="none" {...p}>
      <rect x="2" y="2" width="5.5" height="5.5" rx="0.5" fill="currentColor" opacity="0.35"/>
      <rect x="8.5" y="2" width="5.5" height="5.5" rx="0.5" fill="currentColor" opacity="0.6"/>
      <rect x="2" y="8.5" width="5.5" height="5.5" rx="0.5" fill="currentColor" opacity="0.6"/>
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  Sparkle: (p) => <Icon {...p}><path d="M8 2 L9 6 L13 8 L9 9.5 L8 14 L7 9.5 L3 8 L7 6 Z" fill="currentColor" stroke="none" opacity="0.9"/></Icon>,
  Key: (p) => <Icon {...p}><circle cx="5.5" cy="8" r="2.5"/><path d="M8 8h6v2M11.5 8v2"/></Icon>,
  Link: (p) => <Icon {...p}><path d="M6.5 9.5 L9.5 6.5"/><path d="M7 4.5 L8.5 3 a2.5 2.5 0 013.5 3.5 L10.5 8"/><path d="M9 11.5 L7.5 13 a2.5 2.5 0 01-3.5-3.5 L5.5 8"/></Icon>,
  Bolt: (p) => <Icon {...p}><path d="M9 1.5 L4 9 h3.5 L6.5 14.5 L12 7 H8.5 Z" fill="currentColor" stroke="none"/></Icon>,
  Copy: (p) => <Icon {...p}><rect x="5" y="5" width="8" height="8" rx="1"/><path d="M10.5 5V4a1 1 0 00-1-1H4a1 1 0 00-1 1v5.5a1 1 0 001 1H5"/></Icon>,
  Refresh: (p) => <Icon {...p}><path d="M2.5 7.5 A5.5 5.5 0 0112.5 5.5"/><path d="M13.5 8.5 A5.5 5.5 0 013.5 10.5"/><path d="M11 2.5v3.5h-3.5M5 13.5v-3.5h3.5"/></Icon>,
  Book: (p) => <Icon {...p}><path d="M3 3h4a2 2 0 012 2v8a2 2 0 00-2-2H3zM13 3H9a2 2 0 00-2 2v8a2 2 0 012-2h4z"/></Icon>,
  Warning: (p) => <Icon {...p}><path d="M8 2 L14.5 13.5 H1.5 Z"/><path d="M8 6.5v3M8 11.5v0.1"/></Icon>,
  Dot: (p) => <Icon {...p}><circle cx="8" cy="8" r="2" fill="currentColor"/></Icon>,
  Command: (p) => <Icon {...p}><path d="M5 3.5a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 11-1.5 1.5h6a1.5 1.5 0 111.5-1.5V5a1.5 1.5 0 11-1.5-1.5z"/></Icon>,
  Moon: (p) => <Icon {...p}><path d="M13 9.5 A5.5 5.5 0 016.5 3 A5.5 5.5 0 1013 9.5 Z" fill="currentColor" stroke="none"/></Icon>,
  Sun: (p) => <Icon {...p}><circle cx="8" cy="8" r="3"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1"/></Icon>,
  External: (p) => <Icon {...p}><path d="M6.5 3.5h-3v9h9v-3M9 3h4v4M8 8 L13 3"/></Icon>,
  Pin: (p) => <Icon {...p}><path d="M9 2.5 L13.5 7 L11 7.5 L8.5 10 L6 7.5 L8.5 5 Z"/><path d="M6 10 L2.5 13.5 M8.5 10 L6 7.5"/></Icon>,
};

window.I = I;
window.Icon = Icon;
