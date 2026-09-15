/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#ffb3b5",
        "primary-container": "#ff5165",
        "on-primary": "#680018",
        "primary-fixed": "#ffdada",
        "primary-fixed-dim": "#ffb3b5",
        "secondary": "#70ffba",
        "secondary-container": "#01e599",
        "on-secondary": "#003822",
        "secondary-fixed": "#4dffb2",
        "secondary-fixed-dim": "#00e297",
        "tertiary": "#47d6ff",
        "tertiary-container": "#009ec0",
        "on-tertiary": "#003543",
        "background": "#12131a",
        "surface": "#12131a",
        "surface-dim": "#12131a",
        "surface-bright": "#383940",
        "surface-container-lowest": "#0d0e14",
        "surface-container-low": "#1a1b22",
        "surface-container": "#1e1f26",
        "surface-container-high": "#282a31",
        "surface-container-highest": "#33343c",
        "on-surface": "#e2e1eb",
        "on-surface-variant": "#9ca3af",
        "outline": "#ae8788",
        "outline-variant": "#5d3f40",
        "error": "#ffb4ab",
        "error-container": "#93000a",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-red': '0 0 15px rgba(255, 81, 101, 0.4)',
        'neon-green': '0 0 15px rgba(1, 229, 153, 0.4)',
        'neon-blue': '0 0 15px rgba(71, 214, 255, 0.4)',
        'cyber-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
