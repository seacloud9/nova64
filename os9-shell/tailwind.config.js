/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
          hover: 'var(--glass-hover)',
          tile: 'var(--glass-tile)',
          'tile-hover': 'var(--glass-tile-hover)',
          text: 'var(--glass-text)',
          muted: 'var(--glass-muted)',
          accent: 'var(--glass-accent)',
        },
      },
      backdropBlur: {
        glass: 'var(--glass-blur)',
      },
      boxShadow: {
        glass: 'var(--glass-shadow)',
        'glass-focus': 'var(--glass-focus-ring)',
        'glass-tile': 'var(--glass-tile-shadow)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.28s cubic-bezier(0.33, 1, 0.68, 1)',
        'slide-in-right': 'slideInRight 0.28s cubic-bezier(0.33, 1, 0.68, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
