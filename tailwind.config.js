/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // o app é sempre escuro; 'class' evita o NativeWind brigar com o esquema de cores na web
  darkMode: 'class',
  theme: {
    extend: {
      // mesma paleta do Nitrate web (src/app/globals.css)
      colors: {
        background: '#141517',
        foreground: '#ECEDEE',
        surface: '#1D1F22',
        'surface-strong': '#272A2E',
        'brand-slate': '#9A9EA5',
        'brand-orange': '#FF7A33',
        'brand-blue': '#8FB3FF',
        'brand-btn': '#FF6A1C',
        'brand-btn-text': '#141517',
        'brand-violet': '#A78BFA',
        'brand-crimson': '#F06A6A',
        'brand-emerald': '#4ADE80',
        'brand-charcoal': '#0D0E10',
        'brand-teal': '#38BDF8',
      },
      fontFamily: {
        serif: ['SourceSerif4_600SemiBold'],
        'serif-regular': ['SourceSerif4_400Regular'],
        'serif-italic': ['SourceSerif4_400Regular_Italic'],
      },
    },
  },
  plugins: [],
};
