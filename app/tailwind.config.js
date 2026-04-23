/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#6C63FF',
          dark: '#5A52D5',
          light: '#8B84FF',
        },
        secondary: '#FF6B6B',
        accent: '#4ECDC4',
        success: '#4ADE80',
        warning: '#FBBF24',
        dark: {
          bg: '#0B0B1A',
          card: '#141428',
          'card-hover': '#1A1A35',
          input: '#1E1E3A',
        },
        muted: '#8888AA',
        dim: '#555577',
        border: '#2A2A4A',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-ring': 'pulse-ring 1.5s ease-in-out infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(108,99,255,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(108,99,255,0)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
}
