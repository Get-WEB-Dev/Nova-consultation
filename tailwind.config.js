/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Nova Health Consultancy — brand palette from logo
        primary: {
          50: '#eef4fa',
          100: '#d5e3f2',
          200: '#afc8e5',
          300: '#82a7d4',
          400: '#5586c3',
          500: '#2d6aaf',
          600: '#1B3A5C',   // main navy
          700: '#162f4a',
          800: '#112438',
          900: '#0c1926',
        },
        accent: {
          50: '#edf7ef',
          100: '#d4ecd7',
          200: '#a9d9af',
          300: '#7ec788',
          400: '#53b460',
          500: '#2E8B3D',   // main green
          600: '#257031',
          700: '#1c5525',
          800: '#133a19',
          900: '#0a1f0c',
        },
        gold: {
          50: '#fdf7e8',
          100: '#faecc5',
          200: '#f5d98b',
          300: '#f0c651',
          400: '#E9A825', // main gold
          500: '#d4941d',
          600: '#b07917',
          700: '#8c5f12',
          800: '#68460d',
          900: '#442d08',
        },
        brand: {
          light: '#eef4fa',
          DEFAULT: '#1B3A5C',
          dark: '#112438',
        },
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'sans-serif'],
        display: ['var(--font-sora)', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 2px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.10)',
        'glass': '0 4px 30px rgba(0,0,0,0.06)',
        'glow-brand': '0 0 24px rgba(27,58,92,0.2)',
        'glow-accent': '0 0 24px rgba(46,139,61,0.2)',
        'glow-gold': '0 0 24px rgba(233,168,37,0.25)',
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.1)',
        'elevated': '0 12px 40px rgba(27,58,92,0.12)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.32,0.72,0,1) both',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
        'scale-in': 'scaleIn 0.2s ease both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
};
