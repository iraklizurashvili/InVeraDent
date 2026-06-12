// js/reviews.js — Patient reviews: load from localStorage, submit via real POST
const STORAGE_KEY = 'ivd_reviews';
const POST_URL    = 'https://jsonplaceholder.typicode.com/posts';

// ── Seed data — shown on first visit ───────────────────────
const SEED = [
  { id: 1, name: 'ნინო მამულაშვილი',  rating: 5, text: 'საოცარი კლინიკა! ექიმი ძალიან ყურადღებიანი იყო და პროცედურა სრულიად უტკივარი. ვინირები ზუსტად ისეთი გამოვიდა, როგორც მინდოდა.', date: '15 მაი, 2026' },
  { id: 2, name: 'გიორგი კვარაცხელია', rating: 5, text: 'იმპლანტი ჩამიდო — პირველი ვიზიტიდანვე ვიგრძენი პროფესიონალიზმი. ახლა ვუყვარვარ ჩემს ღიმილს!', date: '2 ივნ, 2026' },
  { id: 3, name: 'მარიამ ჯაფარიძე',   rating: 5, text: 'ბრეკეტები ჩამიდეს — ახსნეს ყველაფერი მარტივ ენაზე. კაბინეტი ძალიან თანამედროვე. ფასი-ხარისხი — მშვენიერია.', date: '28 მაი, 2026' },
  { id: 4, name: 'დავით ბერიძე',       rating: 4, text: 'ბავშვს კარიესი გაუკეთეს. ექიმი ბავშვებთან კარგად ურთიერთობს, სულ არ ყოფილა შიშში. მივალთ ისევ!', date: '10 ივნ, 2026' },
  { id: 5, name: 'ანა ხარაიშვილი',    rating: 5, text: 'გათეთრება გავიარე — შედეგი ელვარებს! ათი გრადუსით გათეთრდა. ახლა ყოველთვის ვიღიმები 😊', date: '5 ივნ, 2026' },
];

// ── Module-level state (closure over this module) ───────────
let reviews = (function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* corrupt data — fall through */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
  return [...SEED];
}());

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

// ── Rendering helpers ───────────────────────────────────────
function starsHtml(n) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < n ? 'star--on' : ''}" aria-hidden="true">★</span>`
  ).join('');
}

function buildCard(review) {
  const article = document.createElement('article');
  article.className = 'review-card reveal';

  const header = document.createElement('div');
  header.className = 'review-card__header';

  const avatar = document.createElement('div');
  avatar.className    = 'review-card__avatar';
  avatar.textContent  = review.name.charAt(0);
  avatar.setAttribute('aria-hidden', 'true');

  const meta = document.createElement('div');
  const nameEl = document.createElement('strong');
  nameEl.className   = 'review-card__name';
  nameEl.textContent = review.name;

  const dateEl = document.createElement('span');
  dateEl.className   = 'review-card__date';
  dateEl.textContent = review.date;

  meta.appendChild(nameEl);
  meta.appendChild(dateEl);
  header.appendChild(avatar);
  header.appendChild(meta);

  const stars = document.createElement('div');
  stars.className = 'review-card__stars';
  stars.setAttribute('aria-label', `${review.rating} ვარსკვლავი 5-დან`);
  stars.innerHTML = starsHtml(review.rating);

  const text = document.createElement('p');
  text.className   = 'review-card__text';
  text.textContent = review.text;

  article.appendChild(header);
  article.appendChild(stars);
  article.appendChild(text);
  return article;
}

function renderAll(grid) {
  grid.innerHTML = '';
  reviews.forEach(r => grid.appendChild(buildCard(r)));
}

// ── Interactive star rating builder ────────────────────────
function buildStarWidget(container, hiddenInput) {
  let selected = 0; // private — closed over by each listener

  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'star-btn';
    btn.dataset.v = i;
    btn.setAttribute('aria-label', `${i} ვარსკვლავი`);
    btn.textContent = '★';

    btn.addEventListener('mouseenter', () => paint(container, i));
    btn.addEventListener('mouseleave', () => paint(container, selected));
    btn.addEventListener('click', () => {
      selected = i;
      hiddenInput.value = i;
      paint(container, selected);
    });

    container.appendChild(btn);
  }
}

function paint(container, value) {
  container.querySelectorAll('.star-btn').forEach((btn, i) =>
    btn.classList.toggle('star-btn--on', i < value)
  );
}

// ── Public init ─────────────────────────────────────────────
export function initReviews() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  renderAll(grid);

  // Build star widget
  const starContainer = document.getElementById('starRating');
  const hiddenRating  = document.getElementById('reviewRating');
  if (starContainer && hiddenRating) buildStarWidget(starContainer, hiddenRating);

  // Form submit
  const form = document.getElementById('reviewForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name   = document.getElementById('reviewName')?.value.trim()  ?? '';
    const rating = parseInt(document.getElementById('reviewRating')?.value ?? '0', 10);
    const text   = document.getElementById('reviewText')?.value.trim()  ?? '';
    const banner = document.getElementById('reviewBanner');

    // Client-side validation
    if (name.length < 2)  return showReviewBanner(banner, '⚠️ შეიყვანეთ სახელი', 'error');
    if (rating === 0)     return showReviewBanner(banner, '⚠️ აირჩიეთ შეფასება', 'error');
    if (text.length < 10) return showReviewBanner(banner, '⚠️ კომენტარი მინ. 10 სიმბოლო', 'error');

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ იგზავნება…';

    try {
      // Real async POST — demonstrates fetch + await + error handling
      await submitReviewPost({ name, rating, text });

      const newReview = {
        id:     Date.now(),
        name,
        rating,
        text,
        date: new Date().toLocaleDateString('ka-GE', { day: 'numeric', month: 'short', year: 'numeric' }),
      };

      reviews = [newReview, ...reviews];
      persist();
      renderAll(grid);
      form.reset();
      document.getElementById('starRating').querySelectorAll('.star-btn')
        .forEach(b => b.classList.remove('star-btn--on'));
      document.getElementById('reviewRating').value = '0';
      showReviewBanner(banner, '✅ შეფასება დამატებულია! გმადლობთ 🦷', 'success');
    } catch (err) {
      showReviewBanner(banner, `⚠️ ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 გაგზავნა';
    }
  });
}

async function submitReviewPost(data) {
  const res = await fetch(POST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`გაგზავნა ვერ მოხერხდა (${res.status})`);
  return res.json();
}

function showReviewBanner(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className   = `form-banner form-banner--${type}`;
  el.hidden      = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 5000);
}
