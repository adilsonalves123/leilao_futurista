/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    // Preflight global quebra Pressable/Text nativos no login e no painel admin (web).
    preflight: false,
  },
  content: [
    './app/(auth)/_components/LevouWelcomeScreen.tsx',
    './components/welcome/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        levou: {
          bg: '#09071c',
          card: '#120e2e',
          border: '#231b54',
          purple: '#a855f7',
          'purple-deep': '#581c87',
          email: '#3b2d8f',
        },
      },
    },
  },
  plugins: [],
};
