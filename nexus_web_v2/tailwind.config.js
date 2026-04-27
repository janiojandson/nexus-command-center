/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#0a0e17',
          surface: '#111827',
          border: '#1e293b',
          accent: '#00f0ff',
          accentDim: '#0891b2',
          text: '#e2e8f0',
          textMuted: '#64748b',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
