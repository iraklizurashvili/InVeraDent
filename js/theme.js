// js/theme.js — light/dark theme toggle, persisted to localStorage.
// Leans on the project's CSS custom properties: a [data-theme="dark"]
// block redefines the tokens, so almost no per-component JS is needed.

const STORAGE_KEY = 'ivd_theme';

/** Read the saved theme, falling back to the OS preference. */
function preferredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Apply a theme to the document root. */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function iconFor(theme) {
  return theme === 'dark' ? '☀️' : '🌙';
}

/** Build the toggle button and wire it up. */
function buildToggle() {
  const host = document.querySelector('.nav-cta');
  if (!host) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle btn btn-ghost btn-sm';
  btn.setAttribute('aria-label', 'ღია/მუქი თემის გადართვა');
  btn.textContent = iconFor(document.documentElement.getAttribute('data-theme'));

  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    btn.textContent = iconFor(next);
  });

  host.insertBefore(btn, host.firstChild);
}

export function initTheme() {
  applyTheme(preferredTheme());
  buildToggle();
}
