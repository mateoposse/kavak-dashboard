/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'kavak-bg': '#0F172A',
        'kavak-card': '#1E293B',
        'kavak-border': '#334155',
        'kavak-text': '#F8FAFC',
        'kavak-muted': '#94A3B8',
        'kavak-sale': '#10B981',
        'kavak-purchase': '#3B82F6',
        'kavak-row-alt': '#253347',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
