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
