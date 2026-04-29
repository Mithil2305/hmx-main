/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35', // Orange
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#FF6B35', 
          600: '#FF4D30', // Deep Orange/Red
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        sidebar: {
          bg: '#212126',
          active: '#FF6B35',
          text: '#A0A0A0',
        },
        header: {
          bg: '#FFFFFF',
        },
        background: {
          light: '#F8F8FA',
        }
      },
      backgroundImage: {
        'hmx-gradient': 'linear-gradient(135deg, #FF4D30 0%, #FF9430 100%)',
        'hmx-gradient-hover': 'linear-gradient(135deg, #FF6B35 0%, #FFA852 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'hmx': '0 4px 20px rgba(0, 0, 0, 0.05)',
        'hmx-lg': '0 10px 30px rgba(255, 77, 48, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};