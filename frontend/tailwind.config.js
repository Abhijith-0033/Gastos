/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000',
          dark: '#1A1A1A',
          active: '#333333',
          light: '#F5F5F5',
          muted: '#D4D4D4',
        },
        danger: {
          DEFAULT: '#DC2626',
          bg: '#FFF5F5',
          border: '#FECACA',
        },
        success: {
          DEFAULT: '#16A34A',
          bg: '#F0FDF4',
          border: '#BBF7D0',
        },
        warning: {
          DEFAULT: '#B45309',
          bg: '#FFFBEB',
          border: '#FDE68A',
        },
        border: '#E5E5E5',
        'border-strong': '#D4D4D4',
        muted: '#737373',
        surface: '#FAFAFA',
        'surface-alt': '#F5F5F5',
        neutral: {
          50:  '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
        // Keep slate for the admin banner since the user requested bg-slate-900 there
        slate: {
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Courier New', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06)',
        modal: '0 8px 24px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};
