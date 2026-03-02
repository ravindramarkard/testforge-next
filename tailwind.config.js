/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'forge-bg':      '#0d0f14',
        'forge-surface': '#131720',
        'forge-surface2':'#1a2030',
        'forge-border':  '#1e2a3a',
        'forge-text':    '#e2e8f0',
        'forge-muted':   '#64748b',
        'forge-dim':     '#374151',
        'forge-accent':  '#00c8f0',
        'forge-violet':  '#818cf8',
        'forge-green':   '#34d399',
        'forge-red':     '#f87171',
        'forge-amber':   '#fbbf24',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        shimmer:     'shimmer 2s linear infinite',
        'fade-up':   'fade-up 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
