// Navigation model shared by the rail, the header and the mobile bars. Every entry owns a colour:
// the rail icon, the header and the page accent (--pri) all take it.
export const MODULES = [
  { key: 'map', to: '/map', label: 'Map', title: 'Site Map', sub: 'Sites, permits, weather and rain radar', icon: 'fa-solid fa-map-location-dot', color: '#2563eb', match: ['/map', '/site/', '/live-view'] },
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard', title: 'Operations', sub: 'What happened, why, and what to do next', icon: 'fa-solid fa-chart-pie', color: '#7c3aed', match: ['/dashboard'] },
  { key: 'monitoring', to: '/monitoring', label: 'Monitoring', title: 'Compliance Monitoring', sub: 'Documents, dockets, agency visits', icon: 'fa-solid fa-shield-halved', color: '#0d9488', match: ['/monitoring', '/reports'] },
  { key: 'attendance', to: '/attendance', label: 'Attendance', title: 'Attendance', sub: 'Personnel monitoring across all offices', icon: 'fa-solid fa-user-clock', color: '#ea580c', match: ['/attendance'] },
  { key: 'ess', to: '/ess', label: 'Self-Service', title: 'Self-Service', sub: 'Layan Diri Pekerja', icon: 'fa-solid fa-id-card-clip', color: '#db2777', match: ['/ess'] },
]
export const SETTINGS = [
  { key: 'account', to: '/account', label: 'Account', title: 'Account Settings', sub: 'Your profile and password', icon: 'fa-solid fa-gear', color: '#475569', match: ['/account'] },
  { key: 'sites', to: '/site-management', label: 'Sites', title: 'Site Management', sub: 'Sites, contractors and permits', icon: 'fa-solid fa-location-dot', color: '#475569', match: ['/site-management'] },
  { key: 'users', to: '/user-management', label: 'Users', title: 'User Management', sub: 'Accounts and roles', icon: 'fa-solid fa-users-gear', color: '#475569', match: ['/user-management'] },
]
// Self-service items (labels in Malay — used by all staff)
export function essGroups(state) {
  const approver = state.home?.roles?.approver
  return [
    { t: 'Utama', items: [
      { to: '/ess', l: 'Papan Utama', i: 'fa-solid fa-house', color: '#db2777', exact: true },
      { to: '/ess/attendance', l: 'Kehadiran', i: 'fa-solid fa-fingerprint', color: '#2563eb' },
      { to: '/ess/leave', l: 'Cuti', i: 'fa-solid fa-umbrella-beach', color: '#0891b2' },
      { to: '/ess/overtime', l: 'Kerja Lebih Masa', i: 'fa-solid fa-business-time', color: '#7c3aed' },
      { to: '/ess/timeoff', l: 'Time-off', i: 'fa-solid fa-person-walking-arrow-right', color: '#0d9488' },
      { to: '/ess/claims', l: 'Tuntutan', i: 'fa-solid fa-receipt', color: '#059669' },
      { to: '/ess/requests', l: 'Semua Permohonan', i: 'fa-solid fa-folder-open', color: '#475569' },
    ] },
    { t: 'Pengurusan', items: approver ? [
      { to: '/ess/approvals', l: 'Kelulusan', i: 'fa-solid fa-stamp', color: '#ea580c', badge: state.approvals },
      { to: '/ess/hr', l: 'Pemantauan Kehadiran', i: 'fa-solid fa-map-location-dot', color: '#0f766e' },
    ] : [] },
    { t: 'Maklumat', items: [
      { to: '/ess/memos', l: 'Memo Syarikat', i: 'fa-solid fa-bullhorn', color: '#b45309', badge: state.memos },
      { to: '/ess/notifications', l: 'Notifikasi', i: 'fa-solid fa-bell', color: '#e11d48', badge: state.unread },
      { to: '/ess/policies', l: 'Polisi HR & Tanya', i: 'fa-solid fa-scale-balanced', color: '#c026d3' },
      { to: '/ess/team', l: 'Kalendar & Pasukan', i: 'fa-solid fa-calendar-days', color: '#4f46e5' },
      { to: '/ess/reports', l: 'Laporan Saya', i: 'fa-solid fa-chart-pie', color: '#0369a1' },
      { to: '/ess/profile', l: 'Profil & Akaun', i: 'fa-solid fa-id-badge', color: '#475569' },
    ] },
  ]
}
export const essOn = (n, path) => n.exact ? path === n.to : path.startsWith(n.to)
export function moduleFor(path) {
  return [...MODULES, ...SETTINGS].find(m => m.match.some(p => path === p || path.startsWith(p))) || MODULES[0]
}
