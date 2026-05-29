/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#264A67",
        secondary: "#FF6600",
        theme: {
          page: "var(--bg-page)",
          surface: {
            DEFAULT: "var(--bg-surface)",
            hover: "var(--bg-surface-hover)",
          },
          main: "var(--text-main)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
          border: {
            subtle: "var(--border-subtle)",
            strong: "var(--border-strong)",
          },
          accent: {
            blue: "var(--accent-blue)",
            indigo: "var(--accent-indigo)",
          }
        },
      },
      boxShadow: {
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-lg': 'var(--shadow-lg)',
        'glow': 'var(--shadow-glow)',
      },
      animation: {
        'gradient': 'gradient 8s linear infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}
