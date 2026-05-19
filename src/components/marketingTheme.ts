import type { CSSProperties } from 'react';

export const marketingTheme = {
  bg: '#f8fafc',
  bgElevated: '#ffffff',
  bgCard: '#ffffff',
  bgSubtle: '#f1f5f9',
  border: 'rgba(15, 23, 42, 0.1)',
  borderAccent: 'rgba(79, 70, 229, 0.28)',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#4f46e5',
  primaryLight: '#6366f1',
  secondary: '#d97706',
  secondaryMuted: '#b45309',
  accentTeal: '#0d9488',
  gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
  gradientWarm: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  navBg: 'rgba(255, 255, 255, 0.92)',
  cardShadow: '0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04)',
};

export function marketingInputStyle(): CSSProperties {
  return {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: marketingTheme.bgElevated,
    border: `1px solid ${marketingTheme.border}`,
    borderRadius: '0.5rem',
    color: marketingTheme.text,
    fontSize: '1rem',
  };
}
