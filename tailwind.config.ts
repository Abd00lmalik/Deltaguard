import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sora: ['var(--font-sora)'],
        manrope: ['var(--font-manrope)'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        background: '#030303',
        'surface-1': '#0B0B0B',
        'surface-2': '#111111',
        'surface-3': '#151515',
        'border-subtle': 'rgba(255,255,255,0.07)',
        'border-active': 'rgba(156,255,0,0.35)',
        'accent-lime': '#9CFF00',
        'accent-lime-dim': 'rgba(156,255,0,0.12)',
        'accent-lime-glow': 'rgba(156,255,0,0.06)',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8A8A8A',
        'text-muted': '#555555',
        danger: '#FF4444',
        'danger-dim': 'rgba(255,68,68,0.12)',
        warning: '#F59E0B',
        'warning-dim': 'rgba(245,158,11,0.12)',
        positive: '#9CFF00'
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)'
      },
      animation: {
        scan: 'scan 1.4s ease-in-out infinite',
        'slow-spin': 'spin 60s linear infinite',
        pulseglow: 'pulseglow 4s ease-in-out infinite'
      },
      keyframes: {
        scan: {
          '0%, 100%': { opacity: '0.35', transform: 'translateX(-12%)' },
          '50%': { opacity: '1', transform: 'translateX(12%)' }
        },
        pulseglow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.65' },
          '50%': { transform: 'scale(1.08)', opacity: '1' }
        }
      }
    }
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        '.glow-lime': {
          filter: 'drop-shadow(0 0 12px rgba(156,255,0,0.5))'
        },
        '.glow-card': {
          boxShadow: '0 0 60px rgba(156,255,0,0.04)'
        },
        '.glow-danger': {
          filter: 'drop-shadow(0 0 12px rgba(255,68,68,0.4))'
        }
      });
    })
  ]
};

export default config;
