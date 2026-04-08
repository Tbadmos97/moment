import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0A0A',
          secondary: '#111111',
          card: '#1A1A1A',
          hover: '#222222',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#AAAAAA',
          muted: '#666666',
        },
        accent: {
          gold: '#C9A84C',
          'gold-light': '#E8C96A',
          'gold-dark': '#A0832A',
        },
        border: {
          DEFAULT: '#2A2A2A',
          light: '#333333',
        },
        error: '#EF4444',
        success: '#10B981',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 400ms ease-out',
        slideUp: 'slideUp 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        scaleIn: 'scaleIn 300ms ease-out',
        shimmer: 'shimmer 1.8s infinite',
      },
      backgroundImage: {
        'luxury-radial': 'radial-gradient(circle at 20% 10%, rgba(201, 168, 76, 0.16), transparent 28%), radial-gradient(circle at 85% 0%, rgba(255, 255, 255, 0.06), transparent 22%)',
      },
    },
  },
  plugins: [],
};

export default config;
