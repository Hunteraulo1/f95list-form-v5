import type { ThemePreference } from '#lib/profile.ts';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = document.documentElement.dataset.theme;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

let theme = $state<Theme>(
  typeof document === 'undefined' ? 'light' : getInitialTheme(),
);

export function getTheme() {
  return theme;
}

export function setTheme(next: Theme) {
  theme = next;
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
}

export function toggleTheme() {
  setTheme(theme === 'dark' ? 'light' : 'dark');
}

//? Applique le thème choisi dans les paramètres du compte. « system » retire le choix gardé sur
//? l'appareil : la page suit de nouveau le réglage du navigateur.
export function applyThemePreference(preference: ThemePreference) {
  if (preference !== 'system') return setTheme(preference);

  delete document.documentElement.dataset.theme;
  localStorage.removeItem('theme');
  theme = getInitialTheme();
}
