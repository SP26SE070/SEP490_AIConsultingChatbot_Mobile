export const COLORS = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceLight: '#334155',
  border: '#475569',
  accent: '#10b981',
  accentDark: '#059669',
  accentSoft: 'rgba(16, 185, 129, 0.15)',
  accentLight: 'rgba(16, 185, 129, 0.08)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  danger: '#f87171',
  dangerSoft: 'rgba(248, 113, 113, 0.15)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251, 191, 36, 0.15)',
  info: '#60a5fa',
  infoSoft: 'rgba(96, 165, 250, 0.15)',
  userBubble: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  assistantBubble: '#1e293b',
  success: '#22c55e',
  successSoft: 'rgba(34, 197, 94, 0.15)',
};

export const LAYOUT = {
  sidebarWidth: 280,
  tabletBreakpoint: 768,
  /** Bottom tab bar height — kept fixed so it never shrinks */
  tabBarHeight: 60,
  /** Safe area top/bottom helpers (used with SafeAreaView edges) */
  safeTop: ['top'] as const,
  safeBottom: ['bottom'] as const,
  safeAll: ['top', 'bottom', 'left', 'right'] as const,
};
