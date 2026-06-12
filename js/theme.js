// js/theme.js — light/dark theme toggle, persisted to localStorage.
// Leans on the project's CSS custom properties: a [data-theme="dark"]
// block redefines the tokens, so almost no per-component JS is needed.
//
// Two toggles are injected so the control is reachable at every width:
//   • the navbar CTA cluster (desktop, hidden < 769px)
//   • the mobile drawer footer (inside the hamburger menu)
// Both stay in sync via a shared setTheme() that updates every toggle icon.

const STORAGE_KEY = 'ivd_theme';

/** Read the saved theme, falling back to the OS preference. */
function preferredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function iconFor(theme) {
  return theme === 'dark' ? '☀️' : '🌙';
}

/** Apply a theme, persist it, and sync the icon on every toggle on the page. */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  document.querySelectorAll('.theme-toggle__icon').forEach(el => {
    el.textContent = iconFor(theme);
  });
}

/**
 * Build a toggle button inside `host`.
 * @param {Element|null} host
 * @param {{prepend?: boolean, label?: string, variant?: string}} opts
 */
function buildToggle(host, { prepend = false, label = '', variant = '' } = {}) {
  if (!host) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `theme-toggle btn ${variant}`.trim();
  btn.setAttribute('aria-label', 'ღია/მუქი თემის გადართვა');

  const icon = document.createElement('span');
  icon.className = 'theme-toggle__icon';
  icon.textContent = iconFor(currentTheme());
  btn.appendChild(icon);

  if (label) btn.appendChild(document.createTextNode(label));

  btn.addEventListener('click', () => {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  if (prepend) host.insertBefore(btn, host.firstChild);
  else host.appendChild(btn);
}

export function initTheme() {
  document.documentElement.setAttribute('data-theme', preferredTheme());

  // Desktop: compact icon button in the navbar CTA cluster
  buildToggle(document.querySelector('.nav-cta'), {
    prepend: true,
    variant: 'btn-ghost btn-sm',
  });

  // Mobile: full-width labelled button inside the hamburger drawer
  buildToggle(document.querySelector('.nav-drawer-footer'), {
    label: 'თემის შეცვლა',
    variant: 'btn-secondary btn-full theme-toggle--drawer',
  });
}
