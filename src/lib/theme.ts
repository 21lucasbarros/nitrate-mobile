import { DarkTheme, type Theme } from 'expo-router';

// mesma paleta do tailwind.config.js, para onde className não chega (ícones, inputs, navegação)
export const colors = {
  background: '#141517',
  foreground: '#ECEDEE',
  surface: '#1D1F22',
  surfaceStrong: '#272A2E',
  slate: '#9A9EA5',
  orange: '#FF7A33',
  blue: '#8FB3FF',
  btn: '#FF6A1C',
  btnText: '#141517',
  violet: '#A78BFA',
  crimson: '#F06A6A',
  emerald: '#4ADE80',
  charcoal: '#0D0E10',
  teal: '#38BDF8',
} as const;

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.orange,
    background: colors.background,
    card: colors.background,
    text: colors.foreground,
    border: 'rgba(236, 237, 238, 0.08)',
    notification: colors.orange,
  },
};
