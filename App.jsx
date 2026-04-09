import React, { useState, useEffect } from 'react';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg: '#0f1510', sidebar: '#111a13', card: '#151e17', input: '#1a251c',
  border: '#1e2e22', borderInput: '#233028', borderHover: '#2a4a30',
  text: '#e8f0ea', textPrimary: '#d4e8d8', textSecondary: '#c4d8c8',
  textMuted: '#8aaa92', textSubtle: '#6a8a72', textDim: '#5a7a62', textFaint: '#4a6650',
  accent: '#4ade80',
  approved: '#4ade80', review: '#facc15', flagged: '#f87171', draft: '#94a3b8',
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: ${C.bg}; font-family: 'DM Sans', sans-serif; color: ${C.textPrimary}; overflow: hidden; }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-10px) } to { opacity:1; transform:translateX(0) } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.97) } to { opacity:1; transform:scale(1) } }
  @keyframes slideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  ::-webkit-scrollbar { width:5px; height:5px }
  ::-webkit-scrollbar-track { background:${C.sidebar} }
  ::-webkit-scrollbar-thumb { background:${C.borderHover}; border-radius:3px }
  input, textarea, select { outline:none; }
  button { cursor:pointer; border:none; background:none; }
`;

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Icon = ({ children, size = 16, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>{children}</svg>
);

const Icons = {
  Grid: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Icon>,
  DocCheck: (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></Icon>,
  Plus: (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>,
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>,
  Shield: (p) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>,
  Check: (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>,
  Clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>,
  Alert: (p) => <Icon {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>,
  ChevDown: (p) => <Icon {...p}><polyline points="6 9 12 15 18 9"/></Icon>,
  ChevRight: (p) => <Icon {...p}><polyline points="9 18 15 12 9 6"/></Icon>,
  X: (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>,
  File: (p) => <Icon {...p}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></Icon>,
  User: (p) => <Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>,
  Tool: (p) => <Icon {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Icon>,
  Export: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Icon>,
  Eye: (p) => <Icon {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Icon>,
  Book: (p) => <Icon {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></Icon>,
  Star: (p) => <Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>,
};

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
const AI_CATALOG = [
  { id: 't1', name: 'Runway Gen-3', category: 'Video Generation', vendor: 'Runway ML' },
  { id: 't2', name: 'Midjourney v7', category: 'Image Generation', vendor: 'Midjourney Inc.' },
  { id: 't3', name: 'ElevenLabs', category: 'Voice Synthesis', vendor: 'ElevenLabs' },
  { id: 't4', name: 'Stability SDXL', category: 'Image Generation', vendor: 'Stability AI' },
  { id: 't5', name: 'Suno v4', category: 'Music Generation', vendor: 'Suno AI' },
  { id: 't6', name: 'Adobe Firefly', category: 'Image Generation', vendor: 'Adobe' },
  { id: 't7', name: 'Synthesia', category: 'Video/Avatar', vendor: 'Synthesia' },
  { id: 't8', name: 'Respeecher', category: 'Voice Conversion', vendor: 'Respeecher' },
];

const REGULATIONS = [
  { id: 'r1', name: 'California AB 853', region: 'United States — California', status: 'Active', short: 'AB 853', description: 'Requires studios to disclose AI-generated content in entertainment productions and obtain consent from performers whose likeness is replicated.' },
  { id: 'r2', name: 'EU AI Act Art. 50', region: 'European Union', status: 'Active', short: 'EU AI Act', description: 'Mandates transparency obligations for AI systems generating synthetic media, requiring visible disclosure when AI creates or manipulates images, audio, or video.' },
  { id: 'r3', name: 'SAG-AFTRA AI Rider', region: 'United States — Industry', status: 'Active', short: 'SAG-AFTRA', description: 'Contractual requirement to notify and compensate performers when AI is used to generate, replicate, or alter their voice or likeness in production.' },
  { id: 'r4', name: 'AMPTP AI Guidelines', region: 'United States — Industry', status: 'Draft', short: 'AMPTP', description: 'Proposed guidelines from the Alliance of Motion Picture and Television Producers for responsible AI use in production workflows. Currently in negotiation phase.' },
];

const INIT_PASSPORTS = [
  {
    id: 'p1',
    name: 'Hero Transformation VFX',
    status: 'approved',
    project: 'Nebula Rising',
    studio: 'Paramount',
    assetType: 'VFX / Visual',
    department: 'Visual Effects',
    createdDate: '2026-01-14',
    notes: '',
    tools: [
      { toolId: 't1', purpose: 'Generate hero transformation sequence (frame interpolation)', usedBy: 'VFX Team', date: '2026-01-10', status: 'approved' },
      { toolId: 't4', purpose: 'Background environment concept generation for alien planet', usedBy: 'Art Department', date: '2026-01-11', status: 'approved' },
    ],
    approvals: [
      { stage: 'Department Lead', approver: 'Sasha Kim', date: '2026-01-15', status: 'approved' },
      { stage: 'Legal Review', approver: 'Marcus Webb', date: '2026-01-17', status: 'approved' },
      { stage: 'Compliance Sign-off', approver: 'Robert Torres', date: '2026-01-18', status: 'approved' },
    ],
    regulations: ['r1', 'r2', 'r4'],
  },
  {
    id: 'p2',
    name: 'Episode 3 Background Score',
    status: 'in-review',
    project: 'The Last Signal',
    studio: 'Netflix',
    assetType: 'Audio / Music',
    department: 'Music & Sound',
    createdDate: '2026-02-05',
    notes: '',
    tools: [
      { toolId: 't5', purpose: 'Generate ambient background score for space sequences', usedBy: 'Sound Design', date: '2026-02-03', status: 'approved' },
    ],
    approvals: [
      { stage: 'Department Lead', approver: 'Priya Nair', date: '2026-02-07', status: 'approved' },
      { stage: 'Legal Review', approver: 'Marcus Webb', date: null, status: 'pending' },
      { stage: 'Compliance Sign-off', approver: 'Robert Torres', date: null, status: 'pending' },
    ],
    regulations: ['r1', 'r3'],
  },
  {
    id: 'p3',
    name: 'Villain Voice Modulation',
    status: 'flagged',
    project: 'Crimson Veil',
    studio: 'Marvel',
    assetType: 'Audio / Voice',
    department: 'Post Production',
    createdDate: '2026-02-18',
    notes: 'FLAGGED: Performer consent agreement not on file for voice replication. SAG-AFTRA AI Rider compliance requires signed consent from the original performer (David Chen) before ElevenLabs output can be used in final cut. Immediate action required.',
    tools: [
      { toolId: 't3', purpose: 'Villain voice modulation and pitch adjustment', usedBy: 'Sound Dept.', date: '2026-02-15', status: 'flagged' },
      { toolId: 't8', purpose: 'Voice conversion from scratch recording to stylized villain tone', usedBy: 'Post Production', date: '2026-02-16', status: 'flagged' },
    ],
    approvals: [
      { stage: 'Department Lead', approver: 'Sasha Kim', date: '2026-02-20', status: 'approved' },
      { stage: 'Legal Review', approver: 'Marcus Webb', date: '2026-02-22', status: 'flagged' },
      { stage: 'Compliance Sign-off', approver: 'Robert Torres', date: null, status: 'pending' },
    ],
    regulations: ['r1', 'r2', 'r3'],
  },
  {
    id: 'p4',
    name: 'Marketing Key Art #2',
    status: 'draft',
    project: 'Nebula Rising',
    studio: 'Paramount',
    assetType: 'Image / Marketing',
    department: 'Marketing',
    createdDate: '2026-03-10',
    notes: '',
    tools: [
      { toolId: 't2', purpose: 'Generate key art poster variants for A/B testing campaign', usedBy: 'Marketing Team', date: '2026-03-09', status: 'pending' },
    ],
    approvals: [
      { stage: 'Department Lead', approver: 'Priya Nair', date: null, status: 'pending' },
      { stage: 'Legal Review', approver: 'Marcus Webb', date: null, status: 'pending' },
      { stage: 'Compliance Sign-off', approver: 'Robert Torres', date: null, status: 'pending' },
    ],
    regulations: ['r2', 'r4'],
  },
];

const ACTIVITY = [
  { id: 1, text: 'Hero Transformation VFX received final compliance sign-off', status: 'approved', time: '2 hours ago', project: 'Nebula Rising' },
  { id: 2, text: 'Villain Voice Modulation flagged — performer consent missing', status: 'flagged', time: '5 hours ago', project: 'Crimson Veil' },
  { id: 3, text: 'Episode 3 Background Score submitted for Legal Review', status: 'in-review', time: 'Yesterday', project: 'The Last Signal' },
  { id: 4, text: 'Marketing Key Art #2 passport created as draft', status: 'draft', time: '3 days ago', project: 'Nebula Rising' },
  { id: 5, text: 'EU AI Act Art. 50 documentation updated', status: 'approved', time: '1 week ago', project: 'System' },
];

// ── UTILITY HELPERS ───────────────────────────────────────────────────────────
const statusColor = (s) => ({ approved: C.approved, 'in-review': C.review, flagged: C.flagged, draft: C.draft, pending: C.draft }[s] || C.draft);
const statusLabel = (s) => ({ approved: 'Approved', 'in-review': 'In Review', flagged: 'Flagged', draft: 'Draft', pending: 'Pending' }[s] || s);
const findTool = (id) => AI_CATALOG.find(t => t.id === id) || {};

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────
const Badge = ({ status, small }) => {
  const col = statusColor(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: small ? '2px 8px' : '4px 10px',
      borderRadius: 20,
      fontSize: small ? 11 : 12,
      fontWeight: 500,
      background: col + '18',
      color: col,
      border: `1px solid ${col}30`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
      {statusLabel(status)}
    </span>
  );
};

const Divider = ({ style = {} }) => <div style={{ height: 1, background: C.border, ...style }} />;

const useHover = () => {
  const [hovered, setHovered] = useState(false);
  return [hovered, { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }];
};

const Btn = ({ children, onClick, variant = 'primary', style = {}, icon }) => {
  const [h, hProps] = useHover();
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    transition: 'all 0.15s ease', cursor: 'pointer',
  };
  const variants = {
    primary: { background: h ? '#22c55e' : C.accent, color: '#0a1a0d', border: 'none' },
    secondary: { background: h ? C.input : 'transparent', color: C.textSecondary, border: `1px solid ${C.border}` },
    ghost: { background: h ? C.input : 'transparent', color: C.textMuted, border: 'none' },
    danger: { background: h ? '#dc2626' : '#ef444420', color: '#f87171', border: '1px solid #f8717130' },
  };
  return (
    <button onClick={onClick} {...hProps} style={{ ...base, ...variants[variant], ...style }}>
      {icon && icon}{children}
    </button>
  );
};

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const Sidebar = ({ view, setView, passportCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: Icons.Grid },
    { id: 'passports', label: 'Asset Passports', Icon: Icons.DocCheck, badge: passportCount },
    { id: 'regulations', label: 'Regulations', Icon: Icons.Book },
  ];

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: C.sidebar,
      borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0,
      animation: 'slideIn 0.3s ease',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, #22c55e20, #4ade8030)',
            border: `1px solid ${C.accent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.accent,
          }}>
            <Icons.Shield size={18} />
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: '-0.3px' }}>Verity</div>
            <div style={{
              fontSize: 10, fontWeight: 500,
              background: 'linear-gradient(90deg, #4ade80, #22c55e)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '0.05em',
            }}>COMPLIANCE TRACKER</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.textFaint, letterSpacing: '0.08em', padding: '4px 8px 8px', textTransform: 'uppercase' }}>Navigation</div>
        {navItems.map(({ id, label, Icon: NavIcon, badge }) => {
          const active = view === id || (view === 'detail' && id === 'passports');
          return (
            <NavItem key={id} label={label} Icon={NavIcon} active={active} badge={badge} onClick={() => setView(id)} />
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 14px 16px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e40, #4ade8060)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, color: C.accent,
          }}>RT</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Robert Torres</div>
            <div style={{ fontSize: 11, color: C.textFaint }}>Compliance Lead</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const NavItem = ({ label, Icon, active, badge, onClick }) => {
  const [h, hProps] = useHover();
  return (
    <button onClick={onClick} {...hProps} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      width: '100%', padding: '8px 10px', borderRadius: 7, marginBottom: 2,
      background: active ? `${C.accent}18` : h ? `${C.border}80` : 'transparent',
      color: active ? C.accent : h ? C.textSecondary : C.textMuted,
      border: active ? `1px solid ${C.accent}30` : '1px solid transparent',
      transition: 'all 0.15s ease', textAlign: 'left',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: active ? 500 : 400 }}>
        <Icon size={15} /> {label}
      </span>
      {badge != null && (
        <span style={{ fontSize: 11, background: active ? `${C.accent}30` : C.borderInput, color: active ? C.accent : C.textMuted, borderRadius: 10, padding: '1px 7px', fontWeight: 500 }}>
          {badge}
        </span>
      )}
    </button>
  );
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
const DonutChart = ({ passports }) => {
  const total = passports.reduce((s, p) => s + p.tools.length, 0);
  const approved = passports.reduce((s, p) => s + p.tools.filter(t => t.status === 'approved').length, 0);
  const pct = total > 0 ? approved / total : 0;
  const r = 52, cx = 68, cy = 68, stroke = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '8px 0' }}>
      <div style={{ position: 'relative', width: 136, height: 136, flexShrink: 0 }}>
        <svg width="136" height="136">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.borderInput} strokeWidth={stroke} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.accent} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: C.text }}>{Math.round(pct * 100)}%</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>compliant</div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 4 }}>AI Tool Usage Compliance</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>Approved vs. pending across all active passports</div>
        </div>
        {[
          { label: 'Approved', count: approved, color: C.approved },
          { label: 'Pending / Flagged', count: total - approved, color: C.draft },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.textSecondary, flex: 1 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{count}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>{total} total AI tool usage{total !== 1 ? 's' : ''} logged</span>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, icon: IconComp, delay = 0 }) => {
  const [h, hProps] = useHover();
  return (
    <div {...hProps} style={{
      background: C.card, border: `1px solid ${h ? C.borderHover : C.border}`,
      borderRadius: 12, padding: '18px 20px',
      animation: `slideUp 0.4s ease ${delay}ms both`,
      transition: 'border-color 0.2s, transform 0.2s',
      transform: h ? 'translateY(-2px)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          <IconComp size={17} />
        </div>
      </div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 600, color: C.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>{label}</div>
    </div>
  );
};

const DashboardView = ({ passports, setView, setSelectedId }) => {
  const approved = passports.filter(p => p.status === 'approved').length;
  const inReview = passports.filter(p => p.status === 'in-review').length;
  const flagged = passports.filter(p => p.status === 'flagged').length;

  const projects = [
    { name: 'Nebula Rising', studio: 'Paramount', color: '#818cf8', passports: passports.filter(p => p.project === 'Nebula Rising') },
    { name: 'The Last Signal', studio: 'Netflix', color: '#fb923c', passports: passports.filter(p => p.project === 'The Last Signal') },
    { name: 'Crimson Veil', studio: 'Marvel', color: '#f87171', passports: passports.filter(p => p.project === 'Crimson Veil') },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: C.text, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: C.textMuted }}>Compliance overview across all active projects</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Passports" value={passports.length} color={C.textMuted} icon={Icons.File} delay={0} />
        <StatCard label="Approved" value={approved} color={C.approved} icon={Icons.Check} delay={60} />
        <StatCard label="In Review" value={inReview} color={C.review} icon={Icons.Clock} delay={120} />
        <StatCard label="Flagged" value={flagged} color={C.flagged} icon={Icons.Alert} delay={180} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Donut */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px', animation: 'slideUp 0.4s ease 240ms both' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 14 }}>Compliance Rate</div>
          <DonutChart passports={passports} />
        </div>

        {/* Activity */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px', animation: 'slideUp 0.4s ease 300ms both' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 14 }}>Recent Activity</div>
          <div>
            {ACTIVITY.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: i < ACTIVITY.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(a.status), flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: C.textFaint, marginTop: 3 }}>{a.time} · {a.project}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px', animation: 'slideUp 0.4s ease 360ms both' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 14 }}>Projects Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {projects.map(({ name, studio, color, passports: pp }) => {
            const [h, hProps] = useHover();
            return (
              <div key={name} {...hProps} onClick={() => setView('passports')} style={{
                background: C.input, border: `1px solid ${h ? C.borderHover : C.borderInput}`,
                borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                transition: 'all 0.15s', transform: h ? 'translateY(-1px)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary }}>{name}</div>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>{studio}</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div><div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: C.text }}>{pp.length}</div><div style={{ fontSize: 11, color: C.textFaint }}>Passports</div></div>
                  <div><div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: C.flagged }}>{pp.filter(p => p.status === 'flagged').length}</div><div style={{ fontSize: 11, color: C.textFaint }}>Flagged</div></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── PASSPORT LIST ─────────────────────────────────────────────────────────────
const PassportsView = ({ passports, onSelect, onNew }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const tabs = ['all', 'approved', 'in-review', 'flagged', 'draft'];

  const filtered = passports.filter(p => {
    const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.project.toLowerCase().includes(query.toLowerCase());
    const matchF = filter === 'all' || p.status === filter;
    return matchQ && matchF;
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: C.text, marginBottom: 4 }}>Asset Passports</h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>{passports.length} passports across all projects</p>
        </div>
        <Btn onClick={onNew} icon={<Icons.Plus size={14} />} style={{ background: 'linear-gradient(135deg, #22c55e, #4ade80)', color: '#0a1a0d', fontWeight: 600 }}>New Passport</Btn>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }}>
            <Icons.Search size={14} />
          </div>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search passports or projects…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: C.input, border: `1px solid ${C.borderInput}`, borderRadius: 8, color: C.textPrimary, fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', gap: 4, background: C.input, borderRadius: 9, padding: 4, border: `1px solid ${C.borderInput}` }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: filter === t ? C.card : 'transparent',
              color: filter === t ? C.textPrimary : C.textFaint,
              border: filter === t ? `1px solid ${C.border}` : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              {t === 'all' ? 'All' : statusLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: C.textFaint, fontSize: 14 }}>No passports found</div>
        )}
        {filtered.map((p, i) => <PassportRow key={p.id} passport={p} onClick={() => onSelect(p.id)} delay={i * 40} />)}
      </div>
    </div>
  );
};

const PassportRow = ({ passport: p, onClick, delay }) => {
  const [h, hProps] = useHover();
  const toolCount = p.tools.length;
  const typeIcons = { 'VFX / Visual': '🎬', 'Audio / Music': '🎵', 'Audio / Voice': '🎤', 'Image / Marketing': '🖼️' };

  return (
    <div {...hProps} onClick={onClick} style={{
      background: C.card, border: `1px solid ${h ? C.borderHover : C.border}`,
      borderRadius: 10, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 16,
      cursor: 'pointer', transition: 'all 0.15s ease',
      transform: h ? 'translateY(-1px)' : 'none',
      animation: `slideUp 0.3s ease ${delay}ms both`,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: C.input, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {typeIcons[p.assetType] || '📄'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 3 }}>{p.name}</div>
        <div style={{ fontSize: 12, color: C.textMuted }}>{p.project} · {p.studio} · {p.assetType}</div>
      </div>
      <Badge status={p.status} small />
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, color: C.textSecondary }}>{toolCount} AI tool{toolCount !== 1 ? 's' : ''}</div>
        <div style={{ fontSize: 11, color: C.textFaint }}>{p.createdDate}</div>
      </div>
      <div style={{ color: C.textFaint }}><Icons.ChevRight size={16} /></div>
    </div>
  );
};

// ── PASSPORT DETAIL ───────────────────────────────────────────────────────────
const PassportDetail = ({ passport: p, onBack, onApproveAll }) => {
  const [tab, setTab] = useState('tools');
  const tabs = [
    { id: 'tools', label: 'AI Tools', icon: Icons.Tool },
    { id: 'approvals', label: 'Approvals', icon: Icons.Check },
    { id: 'regulations', label: 'Regulations', icon: Icons.Book },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Back */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 13, marginBottom: 20, background: 'none', cursor: 'pointer', padding: '4px 0', transition: 'color 0.15s' }}
        onMouseEnter={e => e.target.style.color = C.textPrimary} onMouseLeave={e => e.target.style.color = C.textMuted}>
        <Icons.ChevRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to Passports
      </button>

      {/* Header card */}
      <div style={{ background: C.card, border: `1px solid ${p.status === 'flagged' ? C.flagged + '50' : C.border}`, borderRadius: 12, padding: '22px 24px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: C.text }}>{p.name}</h1>
              <Badge status={p.status} />
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: C.textMuted }}>
              <span><span style={{ color: C.textFaint }}>Project:</span> {p.project} / {p.studio}</span>
              <span><span style={{ color: C.textFaint }}>Type:</span> {p.assetType}</span>
              <span><span style={{ color: C.textFaint }}>Dept:</span> {p.department}</span>
              <span><span style={{ color: C.textFaint }}>Created:</span> {p.createdDate}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {p.status !== 'approved' && (
              <Btn onClick={onApproveAll} icon={<Icons.Check size={13} />}>Approve All</Btn>
            )}
            <Btn variant="secondary" icon={<Icons.Export size={13} />}>Export</Btn>
          </div>
        </div>

        {p.notes && (
          <div style={{ background: '#f8717115', border: '1px solid #f8717140', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10 }}>
            <Icons.Alert size={16} style={{ color: C.flagged, flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>{p.notes}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: C.card, borderRadius: 10, padding: 5, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {tabs.map(({ id, label, icon: TIcon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 7,
            fontSize: 13, fontWeight: tab === id ? 500 : 400,
            background: tab === id ? C.input : 'transparent',
            color: tab === id ? C.textPrimary : C.textMuted,
            border: tab === id ? `1px solid ${C.border}` : '1px solid transparent',
            transition: 'all 0.15s',
          }}>
            <TIcon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'fadeIn 0.2s ease' }}>
        {tab === 'tools' && <ToolsTab tools={p.tools} />}
        {tab === 'approvals' && <ApprovalsTab approvals={p.approvals} />}
        {tab === 'regulations' && <RegulationsTab regIds={p.regulations} passportStatus={p.status} />}
      </div>
    </div>
  );
};

const ToolsTab = ({ tools }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {tools.map((t, i) => {
      const tool = findTool(t.toolId);
      const [h, hProps] = useHover();
      return (
        <div key={i} {...hProps} style={{
          background: C.card, border: `1px solid ${h ? C.borderHover : C.border}`,
          borderRadius: 10, padding: '16px 18px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
          gap: 16, alignItems: 'center',
          transition: 'border-color 0.15s',
          animation: `slideUp 0.3s ease ${i * 60}ms both`,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 3 }}>{tool.name}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{tool.category}</div>
            <div style={{ fontSize: 11, color: C.textFaint }}>{tool.vendor}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 4 }}>PURPOSE</div>
            <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4 }}>{t.purpose}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 4 }}>USED BY · DATE</div>
            <div style={{ fontSize: 12, color: C.textSecondary }}>{t.usedBy}</div>
            <div style={{ fontSize: 11, color: C.textFaint }}>{t.date}</div>
          </div>
          <Badge status={t.status} small />
        </div>
      );
    })}
  </div>
);

const ApprovalsTab = ({ approvals }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
    <div style={{ position: 'relative' }}>
      {/* Vertical line */}
      <div style={{ position: 'absolute', left: 15, top: 20, bottom: 20, width: 2, background: C.border, zIndex: 0 }} />
      {approvals.map((a, i) => {
        const col = statusColor(a.status);
        const StatusIcon = a.status === 'approved' ? Icons.Check : a.status === 'flagged' ? Icons.Alert : Icons.Clock;
        return (
          <div key={i} style={{ display: 'flex', gap: 20, marginBottom: i < approvals.length - 1 ? 24 : 0, position: 'relative', zIndex: 1, animation: `slideIn 0.35s ease ${i * 80}ms both` }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: col + '20', border: `2px solid ${col}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, flexShrink: 0 }}>
              <StatusIcon size={14} />
            </div>
            <div style={{ flex: 1, paddingTop: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 3 }}>{a.stage}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{a.approver}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge status={a.status} small />
                  {a.date && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>{a.date}</div>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const RegulationsTab = ({ regIds, passportStatus }) => {
  const regs = REGULATIONS.filter(r => regIds.includes(r.id));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {regs.map((r, i) => (
        <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', animation: `slideUp 0.3s ease ${i * 60}ms both` }}>
          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary }}>{r.name}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{r.region}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge status={passportStatus === 'approved' ? 'approved' : passportStatus === 'flagged' ? 'flagged' : 'in-review'} small />
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: r.status === 'Active' ? '#4ade8015' : '#94a3b815', color: r.status === 'Active' ? C.accent : C.draft, border: `1px solid ${r.status === 'Active' ? C.accent + '30' : C.draft + '30'}` }}>{r.status}</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{r.description}</div>
        </div>
      ))}
    </div>
  );
};

// ── REGULATIONS VIEW ──────────────────────────────────────────────────────────
const RegulationsView = () => (
  <div style={{ animation: 'fadeIn 0.3s ease' }}>
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: C.text, marginBottom: 4 }}>Regulations</h1>
      <p style={{ fontSize: 14, color: C.textMuted }}>Active and upcoming AI compliance frameworks for entertainment production</p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {REGULATIONS.map((r, i) => {
        const [h, hProps] = useHover();
        return (
          <div key={r.id} {...hProps} style={{
            background: C.card, border: `1px solid ${h ? C.borderHover : C.border}`,
            borderRadius: 12, padding: '20px 22px',
            transition: 'all 0.15s', transform: h ? 'translateY(-1px)' : 'none',
            animation: `slideUp 0.35s ease ${i * 80}ms both`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent }}>
                  <Icons.Book size={17} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{r.region}</div>
                </div>
              </div>
              <span style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
                background: r.status === 'Active' ? '#4ade8018' : '#94a3b818',
                color: r.status === 'Active' ? C.accent : C.draft,
                border: `1px solid ${r.status === 'Active' ? C.accent + '35' : C.draft + '35'}`,
              }}>{r.status}</span>
            </div>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.65 }}>{r.description}</p>
          </div>
        );
      })}
    </div>
  </div>
);

// ── CREATE PASSPORT MODAL ─────────────────────────────────────────────────────


const CreateModal = ({ onClose, onCreate }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    assetType: '',
    project: '',
    department: '',
    region: '',
    notes: ''
  });
  const [selectedTools, setSelectedTools] = useState({});
  const [errors, setErrors] = useState({});

  const assetTypes = ['VFX / Visual', 'Audio / Music', 'Audio / Voice', 'Image / Marketing', 'Motion Graphics', 'Script / Text'];
  const projects = ['Nebula Rising', 'The Last Signal', 'Crimson Veil', 'New Project'];
  const regions = ['California', 'European Union', 'Other'];

  const Field = ({ label, name, type = 'text', options, rows }) => {
    const inputStyle = {
      width: '100%',
      padding: '9px 12px',
      background: C.input,
      border: `1px solid ${errors[name] ? C.flagged + '80' : C.borderInput}`,
      borderRadius: 8,
      color: C.textPrimary,
      fontSize: 13,
      transition: 'border-color 0.15s'
    };

    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 6 }}>
          {label}
          {name === 'name' && <span style={{ color: C.flagged }}> *</span>}
        </label>

        {type === 'select' ? (
          <select
            value={form[name]}
            onChange={e => setForm({ ...form, [name]: e.target.value })}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            <option value="">Select {label.toLowerCase()}…</option>
            {options.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        ) : rows ? (
          <textarea
            value={form[name]}
            onChange={e => setForm({ ...form, [name]: e.target.value })}
            rows={rows}
            placeholder="Add notes or context…"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        ) : (
          <input
            type={type}
            value={form[name]}
            onChange={e => {
              setForm({ ...form, [name]: e.target.value });
              if (errors[name]) setErrors({ ...errors, [name]: false });
            }}
            style={inputStyle}
            placeholder={`Enter ${label.toLowerCase()}…`}
          />
        )}

        {errors[name] && (
          <div style={{ fontSize: 11, color: C.flagged, marginTop: 4 }}>
            This field is required
          </div>
        )}
      </div>
    );
  };

  const toggleTool = (id) => {
    setSelectedTools(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = '';
      return next;
    });
  };

  const handleNext = () => {
    if (!form.name.trim()) {
      setErrors({ name: true });
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    const firstToolId = Object.keys(selectedTools)[0];
const firstTool = AI_CATALOG.find(t => t.id === firstToolId);

const apiPayload = {
  asset_name: { value: form.name, source: 'api' },
  tool_used: { value: firstTool?.name || 'Unknown', source: 'synthetic' },
  region: { value: form.region || 'Other', source: 'api' }
};

let result = null;

try {
  const response = await fetch('http://127.0.0.1:8000/evaluate-asset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiPayload)
  });

  result = await response.json();
  console.log("API RESULT:", result);

} catch (err) {
  console.error("API failed", err);
}
    const tools = Object.entries(selectedTools).map(([toolId, purpose]) => ({
      toolId,
      purpose: purpose || 'Purpose not specified',
      usedBy: form.department || 'Unknown',
      date: new Date().toISOString().slice(0, 10),
      status: 'pending',
    }));

    const regs = tools.some(t => ['t3', 't8', 't7'].includes(t.toolId))
      ? ['r1', 'r2', 'r3']
      : ['r1', 'r2'];


onCreate({
  id: 'p' + Date.now(),
  name: form.name,
  status: result?.status === 'Needs Review' ? 'in-review' : 'approved',
  project: form.project || 'Unassigned',
  studio: '—',
  assetType: form.assetType || 'Other',
  department: form.department || '—',
  createdDate: new Date().toISOString().slice(0, 10),
  notes: result?.disclosure || form.notes,
  region: form.region || 'Other',
  tools,
  approvals: [
    { stage: 'Department Lead', approver: '—', date: null, status: 'pending' },
    { stage: 'Legal Review', approver: 'Marcus Webb', date: null, status: 'pending' },
    { stage: 'Compliance Sign-off', approver: 'Robert Torres', date: null, status: 'pending' },
  ],
  regulations: regs,
  compliance: result,
});

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleIn 0.2s ease',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: C.text }}>
              Create Asset Passport
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              Step {step} of 2 — {step === 1 ? 'Asset Details' : 'AI Tool Usage'}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              color: C.textMuted,
              padding: 4,
              borderRadius: 6,
              transition: 'color 0.15s, background 0.15s',
              background: 'none'
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
          >
            <Icons.X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}
        >
          {[1, 2].map(s => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    background: step >= s ? C.accent : C.input,
                    color: step >= s ? '#0a1a0d' : C.textFaint,
                    border: `1px solid ${step >= s ? C.accent : C.border}`,
                    transition: 'all 0.2s'
                  }}
                >
                  {s > step ? s : <Icons.Check size={12} />}
                </div>
                <span style={{ fontSize: 12, color: step === s ? C.textPrimary : C.textFaint }}>
                  {s === 1 ? 'Asset Details' : 'AI Tools'}
                </span>
              </div>
              {s === 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: step > 1 ? C.accent + '60' : C.border,
                    transition: 'background 0.3s'
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <Field label="Asset Name" name="name" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Asset Type" name="assetType" type="select" options={assetTypes} />
                <Field label="Project" name="project" type="select" options={projects} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Department" name="department" />
                <Field label="Region" name="region" type="select" options={regions} />
              </div>

              <Field label="Notes" name="notes" rows={3} />
            </div>
          )}

          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
                Select the AI tools used in creating this asset. For each selected tool, describe its specific purpose.
              </div>


              {AI_CATALOG.map((tool, i) => {
  const selected = Object.prototype.hasOwnProperty.call(selectedTools, tool.id);

  return (
    <div
  key={tool.id}
  style={{ marginBottom: 10 }}
  onClick={() => toggleTool(tool.id)}
>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 14px',
          background: selected ? `${C.accent}10` : C.input,
          border: `1px solid ${selected ? C.accent + '50' : C.borderInput}`,
          borderRadius: selected ? '8px 8px 0 0' : 8,
          cursor: 'pointer',
        }}
      >
        <input
  type="checkbox"
  checked={selected}
  onClick={(e) => {
    e.stopPropagation();
    toggleTool(tool.id);
  }}
  readOnly
  style={{ width: 16, height: 16 }}
/>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {tool.name}
          </div>
          <div style={{ fontSize: 11, color: C.textFaint }}>
            {tool.category} · {tool.vendor}
          </div>
        </div>
      </label>

      {selected && (
        <div style={{ padding: '10px 14px' }}>
          <input
            value={selectedTools[tool.id]}
            onChange={e =>
              setSelectedTools(prev => ({ ...prev, [tool.id]: e.target.value }))
            }
            placeholder="Describe how this tool was used…"
            style={{
              width: '100%',
              padding: '7px 10px',
              background: C.input,
              border: `1px solid ${C.borderInput}`,
              borderRadius: 6,
              color: C.textPrimary,
              fontSize: 12
            }}
          />
        </div>
      )}
    </div>
  );
})}

            </div>
          )}
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Btn variant="ghost" onClick={step === 1 ? onClose : () => setStep(1)}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Btn>

          {step === 1 ? (
            <Btn onClick={handleNext}>
              Next: AI Tools <Icons.ChevRight size={13} />
            </Btn>
          ) : (
            <Btn onClick={handleCreate} icon={<Icons.Check size={13} />}>
              Create Passport
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
};



// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('dashboard');
  const [passports, setPassports] = useState(INIT_PASSPORTS);
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Inject styles
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = FONTS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const selectedPassport = passports.find(p => p.id === selectedId);

  const handleSelect = (id) => { setSelectedId(id); setView('detail'); };
  const handleBack = () => setView('passports');
  const handleCreate = (passport) => setPassports(prev => [passport, ...prev]);
  const handleApproveAll = () => {
    const today = new Date().toISOString().slice(0, 10);
    setPassports(prev => prev.map(p => {
      if (p.id !== selectedId) return p;
      return {
        ...p, status: 'approved',
        tools: p.tools.map(t => ({ ...t, status: 'approved' })),
        approvals: p.approvals.map(a => ({ ...a, status: 'approved', date: a.date || today })),
      };
    }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden' }}>
      <Sidebar view={view} setView={(v) => { setView(v); if (v !== 'detail') setSelectedId(null); }} passportCount={passports.length} />

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, overflowY: 'auto', padding: '32px 36px', minHeight: '100vh' }}>
        {view === 'dashboard' && <DashboardView passports={passports} setView={setView} setSelectedId={setSelectedId} />}
        {view === 'passports' && <PassportsView passports={passports} onSelect={handleSelect} onNew={() => setShowModal(true)} />}
        {view === 'detail' && selectedPassport && (
          <PassportDetail passport={selectedPassport} onBack={handleBack} onApproveAll={handleApproveAll} key={selectedPassport.id + selectedPassport.status} />
        )}
        {view === 'regulations' && <RegulationsView />}
      </main>

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
