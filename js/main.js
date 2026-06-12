// js/main.js — module entry point
import { fetchAppointments, createAppointment, deleteAppointment } from './api.js';
import { debounce, createSessionCounter, createPriceCalculator, formatDate, el } from './utils.js';
import { initMap } from './map.js';
import { initReviews } from './reviews.js';
import { initTheme } from './theme.js';

// ─────────────────────────────────────────────────────────────
// Application State  (array of objects, kept at module scope)
// ─────────────────────────────────────────────────────────────
const state = {
  appointments: [],          // full list from API
  filteredAppointments: [],  // current filtered/searched subset
  searchQuery: '',
  currentFilter: 'all',
};

// ─────────────────────────────────────────────────────────────
// Session Counter  (closure — private `count` variable)
// ─────────────────────────────────────────────────────────────
const bookingCounter = createSessionCounter('bookingCount');

// ─────────────────────────────────────────────────────────────
// Price Calculator Service Catalog
// ─────────────────────────────────────────────────────────────
const SERVICES = [
  { id: 'hygiene',      name: 'პროფ. ჰიგიენა',         price: 100,  category: 'therapy'  },
  { id: 'filling',      name: 'კომპ. ფილინგი',          price: 115,  category: 'therapy'  },
  { id: 'root_canal',   name: 'ფესვის არხი',            price: 230,  category: 'therapy'  },
  { id: 'extraction',   name: 'კბილის ამოღება',          price: 80,   category: 'surgery'  },
  { id: 'wisdom',       name: 'სიბრძნის კბილი',          price: 275,  category: 'surgery'  },
  { id: 'implant',      name: 'კბილის იმპლანტი',         price: 1100, category: 'implant'  },
  { id: 'braces_metal', name: 'მეტ. ბრეკეტები',          price: 1200, category: 'ortho'    },
  { id: 'invisalign',   name: 'Invisalign',              price: 3500, category: 'ortho'    },
  { id: 'whitening',    name: 'კბილების გათეთრება',       price: 350,  category: 'cosmetic' },
  { id: 'veneer',       name: 'ვინირი (1 კბ.)',           price: 750,  category: 'cosmetic' },
];

// ─────────────────────────────────────────────────────────────
// Navbar & Scroll
// ─────────────────────────────────────────────────────────────
function initNavbar() {
  const navbar    = document.querySelector('.navbar');
  const hamburger = document.querySelector('.nav-hamburger');
  const drawer    = document.querySelector('.nav-drawer');
  if (!navbar) return;

  // scroll event — adds shadow when page scrolls past 20px
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });

  if (hamburger && drawer) {
    // click event — toggle mobile drawer
    hamburger.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // click event — close drawer when a link is tapped
    drawer.querySelectorAll('a, button').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Scroll Reveal  (IntersectionObserver)
// ─────────────────────────────────────────────────────────────
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!els.length) return;
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }),
    { threshold: 0.1 }
  );
  els.forEach(e => obs.observe(e));
}

// ─────────────────────────────────────────────────────────────
// Booking Form  (contact.html)
// ─────────────────────────────────────────────────────────────
function initBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  const fname = document.getElementById('fname');
  const phone = document.getElementById('phone');
  const email = document.getElementById('email');
  const msgArea = document.getElementById('notes');
  const charCount = document.getElementById('msg-char-count');

  // input event — real-time validation feedback per field
  fname?.addEventListener('input', () =>
    setFieldState(fname, fname.value.trim().length >= 2, 'სახელი მინ. 2 სიმბოლო')
  );
  phone?.addEventListener('input', () => {
    const clean = phone.value.replace(/\D/g, '');
    setFieldState(phone, /^[0-9]{9}$/.test(clean), 'სწორი ფორმატი: 9 ციფრი');
  });
  email?.addEventListener('input', () => {
    const ok = !email.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
    setFieldState(email, ok, 'მაგ: example@gmail.com');
  });

  // input event — textarea character counter
  if (msgArea && charCount) {
    msgArea.addEventListener('input', () => {
      charCount.textContent = `${msgArea.value.length} / 500`;
    });
  }

  // keydown event — Escape closes the mobile drawer
  form.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelector('.nav-drawer')?.classList.remove('open');
      document.querySelector('.nav-hamburger')?.classList.remove('open');
    }
  });

  // submit event — e.preventDefault() + validation + visible feedback
  form.addEventListener('submit', e => {
    e.preventDefault();
    handleFormSubmit(form);
  });
}

function setSubmitLoading(isLoading) {
  const btn     = document.getElementById('submitBtn');
  const spinner = document.getElementById('submitSpinner');
  if (!btn) return;
  btn.disabled = isLoading;
  spinner?.classList.toggle('form--hidden', !isLoading);
}

function setFieldState(input, isValid, errorMsg) {
  const wrap = input.parentElement;
  wrap.querySelector('.field-error')?.remove();
  input.classList.toggle('input--valid',   !!input.value && isValid);
  input.classList.toggle('input--invalid', !!input.value && !isValid);
  if (input.value && !isValid) {
    wrap.appendChild(el('span', 'field-error', errorMsg));
  }
}

async function handleFormSubmit(form) {
  const fname   = document.getElementById('fname')?.value.trim()             ?? '';
  const lname   = document.getElementById('lname')?.value.trim()             ?? '';
  const phone   = document.getElementById('phone')?.value.replace(/\D/g,'') ?? '';
  const email   = document.getElementById('email')?.value.trim()             ?? '';
  const service = document.getElementById('service')?.value                  ?? '';
  const date    = document.getElementById('date')?.value                     ?? '';
  const notes   = document.getElementById('notes')?.value.trim()             ?? '';

  // Client-side validation
  if (fname.length < 2)           return showBanner('⚠️ შეიყვანეთ სახელი (მინ. 2 სიმბოლო)', 'error');
  if (!/^[0-9]{9}$/.test(phone)) return showBanner('⚠️ ტელეფონი: 9 ციფრი (მაგ. 599932616)', 'error');
  if (!service)                   return showBanner('⚠️ აირჩიეთ სერვისი', 'error');
  if (!date)                      return showBanner('⚠️ აირჩიეთ სასურველი თარიღი', 'error');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                                  return showBanner('⚠️ ელ-ფოსტა არასწორია', 'error');

  // Persist last-used preferences (not PII — just UX convenience)
  localStorage.setItem('lastService', service);

  // Send the booking to the real backend so it appears on the dashboard
  setSubmitLoading(true);
  try {
    await createAppointment({
      name:    `${fname} ${lname}`.trim(),
      service,
      date,
      status:  'pending',
      phone,
      notes,
    });
  } catch (err) {
    setSubmitLoading(false);
    return showBanner(`⚠️ ${err.message}. სცადეთ თავიდან.`, 'error');
  }
  setSubmitLoading(false);

  // Count how many bookings this session via closure-based counter
  const count = bookingCounter.increment();
  console.info(`[InVeraDent] Session bookings: ${count}`);

  // Show inline success — no redirect needed
  form.classList.add('form--hidden');
  const successEl = document.getElementById('formSuccess');
  if (successEl) {
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: 'smooth' });
  }

  showBanner('✅ ჩაწერა წარმატებით გაიგზავნა! გისურვებთ ჯანმრთელობას 🦷', 'success');
}

function showBanner(msg, type = 'error') {
  let banner = document.getElementById('formBanner');
  if (!banner) {
    banner = el('div', 'form-banner');
    banner.id = 'formBanner';
    document.getElementById('bookingForm')?.before(banner);
  }
  banner.className = `form-banner form-banner--${type}`;
  banner.textContent = msg;
  banner.hidden = false;
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => { banner.hidden = true; }, 5000);
}

// ─────────────────────────────────────────────────────────────
// Dashboard  (dashboard.html) — public, no auth required
// ─────────────────────────────────────────────────────────────
async function initDashboard() {
  const list = document.getElementById('appointments-list');
  if (!list) return;

  // input event — debounced search (closure: timeoutId private inside debounce)
  const searchInput = document.getElementById('appointmentSearch');
  if (searchInput) {
    searchInput.value = localStorage.getItem('lastSearch') || '';
    state.searchQuery = searchInput.value.toLowerCase();

    const onSearch = debounce(e => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      localStorage.setItem('lastSearch', state.searchQuery);
      filterAndRender();
    }, 300);

    searchInput.addEventListener('input', onSearch);

    // keydown event — Escape clears search field
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        state.searchQuery = '';
        localStorage.removeItem('lastSearch');
        filterAndRender();
      }
    });
  }

  // change event — service category filter, persisted across reloads
  const filterSelect = document.getElementById('serviceFilter');
  if (filterSelect) {
    state.currentFilter = localStorage.getItem('lastFilter') || 'all';
    filterSelect.value  = state.currentFilter;
    filterSelect.addEventListener('change', e => {
      state.currentFilter = e.target.value;
      localStorage.setItem('lastFilter', state.currentFilter);
      filterAndRender();
    });
  }

  // click event — manual refresh
  document.getElementById('refreshBtn')?.addEventListener('click', loadAppointments);

  await loadAppointments();
}

async function loadAppointments() {
  const spinner  = document.getElementById('loading-spinner');
  const errorDiv = document.getElementById('error-message');
  const list     = document.getElementById('appointments-list');

  if (spinner)  spinner.hidden  = false;
  if (list)     list.innerHTML  = '';
  if (errorDiv) errorDiv.hidden = true;

  try {
    const data = await fetchAppointments(); // real external API — async/await
    state.appointments = data;              // stored in module-level state array
    filterAndRender();
  } catch (err) {
    if (errorDiv) {
      errorDiv.textContent = `⚠️ მონაცემების ჩატვირთვა ვერ მოხერხდა: ${err.message}`;
      errorDiv.hidden = false;
    }
  } finally {
    if (spinner) spinner.hidden = true;
  }
}

function filterAndRender() {
  const { appointments, searchQuery, currentFilter } = state;

  state.filteredAppointments = appointments.filter(a => {
    const matchQ = !searchQuery ||
      a.service?.toLowerCase().includes(searchQuery) ||
      a.name?.toLowerCase().includes(searchQuery);
    const matchF = currentFilter === 'all' || a.service === currentFilter;
    return matchQ && matchF;
  });

  renderCards(state.filteredAppointments);
  updateStats();
}

function renderCards(list) {
  const container = document.getElementById('appointments-list');
  if (!container) return;
  container.innerHTML = '';

  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('span');
    icon.className   = 'empty-state__icon';
    icon.textContent = '🦷';
    const msg = document.createElement('p');
    msg.textContent  = 'ვიზიტები ვერ მოიძებნა';
    empty.appendChild(icon);
    empty.appendChild(msg);
    container.appendChild(empty);
    return;
  }

  // forEach: each card's click handler closes over its own `appt` object
  list.forEach((appt, idx) => {
    const card = buildCard(appt, idx);
    card.addEventListener('click', () => showModal(appt));
    container.appendChild(card);
  });
}

function buildCard(appt, idx) {
  const card = document.createElement('div');
  // CSS nth-child handles staggered animation-delay — no inline style needed
  card.className = 'appt-card appt-card--anim reveal';
  card.dataset.idx = idx; // data attribute only, not style=""

  const statusClass = appt.status === 'completed' ? 'status--done'
    : appt.status === 'cancelled'                 ? 'status--cancel'
    : 'status--pending';

  const service = document.createElement('span');
  service.className   = 'appt-card__service';
  service.textContent = appt.service || 'სერვისი';

  const name = document.createElement('span');
  name.className   = 'appt-card__name';
  name.textContent = appt.name || '—';

  const date = document.createElement('span');
  date.className   = 'appt-card__date';
  date.textContent = formatDate(appt.date);

  const badge = document.createElement('span');
  badge.className   = `appt-card__status ${statusClass}`;
  badge.textContent = appt.status || 'მოლოდინში';

  const body = document.createElement('div');
  body.className = 'appt-card__body';
  [service, name, date, badge].forEach(c => body.appendChild(c));

  // 🗑️ delete button — DELETE request, stops the card's modal click
  const delBtn = document.createElement('button');
  delBtn.className = 'appt-card__delete';
  delBtn.type = 'button';
  delBtn.textContent = '🗑️';
  delBtn.setAttribute('aria-label', 'ჩაწერის წაშლა');
  delBtn.addEventListener('click', e => {
    e.stopPropagation();
    handleDeleteAppointment(appt, card);
  });

  card.appendChild(delBtn);
  card.appendChild(body);
  card.setAttribute('title', 'დეტალების სანახავად დააწექით');
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  return card;
}

async function handleDeleteAppointment(appt, card) {
  if (!confirm(`წავშალო ${appt.name || 'ეს'}-ის ჩაწერა?`)) return;
  card.classList.add('appt-card--deleting');
  try {
    await deleteAppointment(appt.id);
    // Drop it from module state and re-render so stats stay in sync
    state.appointments = state.appointments.filter(a => a.id !== appt.id);
    filterAndRender();
  } catch (err) {
    card.classList.remove('appt-card--deleting');
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = `⚠️ ${err.message}`;
      errorDiv.hidden = false;
    }
  }
}

function updateStats() {
  const total     = document.getElementById('stat-total');
  const filtered  = document.getElementById('stat-filtered');
  const confirmed = document.getElementById('stat-confirmed');
  const pending   = document.getElementById('stat-pending');
  if (total)     total.textContent     = state.appointments.length;
  if (filtered)  filtered.textContent  = state.filteredAppointments.length;
  if (confirmed) confirmed.textContent = state.appointments.filter(a => a.status === 'completed').length;
  if (pending)   pending.textContent   = state.appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length;
}

function showModal(appt) {
  document.getElementById('apptModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id        = 'apptModal';
  overlay.className = 'modal-overlay';

  const card = document.createElement('div');
  card.className = 'modal-card';

  const closeBtn = document.createElement('button');
  closeBtn.className   = 'modal-close';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'დახურვა');

  const icon  = el('div', 'modal-icon', '🦷');
  const title = el('h3', 'modal-title', appt.service || 'ვიზიტი');

  const dl = document.createElement('dl');
  dl.className = 'modal-details';
  [
    ['👤 პაციენტი', appt.name  || '—'],
    ['📅 თარიღი',   formatDate(appt.date)],
    ['📊 სტატუსი',  appt.status || 'მოლოდინში'],
  ].forEach(([dt, dd]) => {
    const dtEl = document.createElement('dt'); dtEl.textContent = dt;
    const ddEl = document.createElement('dd'); ddEl.textContent = dd;
    dl.appendChild(dtEl);
    dl.appendChild(ddEl);
  });

  const bookLink = el('a', 'btn btn-primary btn-sm modal-cta', '📅 ახალი ვიზიტი →');
  bookLink.href = 'contact.html';

  [closeBtn, icon, title, dl, bookLink].forEach(n => card.appendChild(n));
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // click — close on backdrop
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  closeBtn.addEventListener('click', () => overlay.remove());

  // keydown — close with Escape
  const onKey = e => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
  closeBtn.focus();
}

// ─────────────────────────────────────────────────────────────
// Price Calculator  (prices.html)
// ─────────────────────────────────────────────────────────────
function initPriceCalculator() {
  const grid = document.getElementById('calcGrid');
  if (!grid) return;

  const calculator = createPriceCalculator(SERVICES); // closure — private Set
  const totalEl    = document.getElementById('calcTotal');
  const resetBtn   = document.getElementById('calcReset');

  // Dynamically build a labelled checkbox for every service
  SERVICES.forEach(svc => {
    const label = document.createElement('label');
    label.className = 'calc-item';
    label.htmlFor   = `calc_${svc.id}`;

    const cb = document.createElement('input');
    cb.type      = 'checkbox';
    cb.id        = `calc_${svc.id}`;
    cb.className = 'calc-checkbox';
    cb.checked   = calculator.isSelected(svc.id);

    const text  = document.createElement('div');
    text.className = 'calc-item__text';

    const name  = document.createElement('span');
    name.className   = 'calc-item__name';
    name.textContent = svc.name;

    const price = document.createElement('span');
    price.className   = 'calc-item__price';
    price.textContent = svc.price.toLocaleString() + ' ₾';

    text.appendChild(name);
    text.appendChild(price);
    label.appendChild(cb);
    label.appendChild(text);

    if (calculator.isSelected(svc.id)) label.classList.add('calc-item--active');

    // change event — toggle + update total
    cb.addEventListener('change', () => {
      const total = calculator.toggle(svc.id);
      updateTotal(total);
      label.classList.toggle('calc-item--active', calculator.isSelected(svc.id));
    });

    grid.appendChild(label);
  });

  updateTotal(calculator.getTotal());

  // click event — reset all selections
  resetBtn?.addEventListener('click', () => {
    calculator.reset();
    grid.querySelectorAll('.calc-checkbox').forEach(c => { c.checked = false; });
    grid.querySelectorAll('.calc-item').forEach(i => i.classList.remove('calc-item--active'));
    updateTotal(0);
  });

  function updateTotal(amount) {
    if (totalEl) totalEl.textContent = amount.toLocaleString() + ' ₾';
  }
}

// ─────────────────────────────────────────────────────────────
// FAQ Accordion  (contact.html)
// ─────────────────────────────────────────────────────────────
function initFaq() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item   = q.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Service Pills  (services.html)
// ─────────────────────────────────────────────────────────────
function initServicePills() {
  const pills = document.querySelectorAll('.service-pill[href^="#"]');
  if (!pills.length) return;

  // click event — smooth scroll to section
  pills.forEach(pill => {
    pill.addEventListener('click', e => {
      e.preventDefault();
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      document.querySelector(pill.getAttribute('href'))
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // scroll event — highlight pill matching current viewport section
  const ids = [...pills].map(p => p.getAttribute('href').slice(1));
  window.addEventListener('scroll', () => {
    let current = ids[0];
    ids.forEach(id => {
      const s = document.getElementById(id);
      if (s && window.scrollY >= s.offsetTop - 140) current = id;
    });
    pills.forEach(p =>
      p.classList.toggle('active', p.getAttribute('href') === '#' + current)
    );
  }, { passive: true });
}

// ─────────────────────────────────────────────────────────────
// Animated Stat Counters  (index.html hero)
// Counts each .stat-num up from 0 to its data-target when it
// first scrolls into view, then keeps the optional data-suffix.
// ─────────────────────────────────────────────────────────────
function initStatCounters() {
  const nums = document.querySelectorAll('.stat-num[data-target]');
  if (!nums.length) return;

  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.4 });

  nums.forEach(n => obs.observe(n));
}

function animateCount(elNum) {
  const target   = Number(elNum.dataset.target) || 0;
  const suffix   = elNum.dataset.suffix || '';
  const duration = 1400;
  const start    = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    elNum.textContent = Math.round(target * eased).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─────────────────────────────────────────────────────────────
// Bootstrap — runs after DOM is ready
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavbar();
  initScrollReveal();
  initStatCounters();
  initBookingForm();
  initDashboard();
  initFaq();
  initServicePills();
  initPriceCalculator();
  initMap();
  initReviews();
});
