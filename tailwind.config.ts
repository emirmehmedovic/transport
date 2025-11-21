import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Electric Blue - Matches the vibrant blue in the design reference
        electric: {
          50: '#e0f7ff',
          100: '#b3ecff',
          200: '#80dfff',
          300: '#4dd2ff',
          400: '#1ac6ff',
          500: '#00b2ff', // Main electric blue
          600: '#008ecc',
          700: '#006b99',
          800: '#004766',
          900: '#002433',
        },
        // Primary Blue - Keeping for compatibility but could be phased out
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Dark/Neutral Scale - Cooler Slate/Gray to match the clean UI
        dark: {
          50: '#f8fafc', // Cool white/gray background
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a', // Dark slate
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px', // Increased for that "soft" look
        '4xl': '32px',
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 30px rgba(0, 0, 0, 0.04)',
        'soft-xl': '0 20px 40px rgba(0, 0, 0, 0.05)',
        'primary': '0 4px 14px rgba(37, 99, 235, 0.2)',
        'primary-lg': '0 8px 25px rgba(37, 99, 235, 0.3)',
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
