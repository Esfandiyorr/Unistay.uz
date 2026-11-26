const filters = Array.from(document.querySelectorAll('[data-filter]'));

if (filters.length) {
  const cards = Array.from(document.querySelectorAll('[data-category]'));
  const descriptions = Array.from(document.querySelectorAll('[data-category-copy]'));
  const empty = document.querySelector('[data-empty]');
  const localeLinks = document.querySelectorAll('.language-nav a');
  const apply = (selected) => {
    for (const filter of filters) {
      if (filter.dataset.filter === selected) filter.setAttribute('aria-current', 'true');
      else filter.removeAttribute('aria-current');
    }
    for (const card of cards) card.hidden = card.dataset.category !== selected;
    for (const copy of descriptions) copy.hidden = copy.dataset.categoryCopy !== selected;
    empty.hidden = cards.some((card) => !card.hidden);
    for (const link of localeLinks) {
      const url = new URL(link.href);
      if (selected === 'international') url.searchParams.set('tur', selected);
      else url.searchParams.delete('tur');
      url.hash = '#turpaketlar';
      link.href = url.href;
    }
  };

  for (const filter of filters) {
    filter.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      if (filter.getAttribute('aria-current')) return;
      apply(filter.dataset.filter);
      window.history.pushState(null, '', filter.href);
    });
  }
  window.addEventListener('popstate', () => {
    const category = new URLSearchParams(window.location.search).get('tur');
    apply(category === 'international' ? 'international' : 'domestic');
  });
}

const bookingForm = document.querySelector('[data-booking-form]');
if (bookingForm) {
  const count = bookingForm.elements.namedItem('people');
  const total = bookingForm.querySelector('[data-total]');
  const separator = { uz: '\u00A0', en: ',', de: '.' }[document.documentElement.lang] ?? '\u00A0';
  const update = () => {
    const people = count.valueAsNumber;
    total.textContent = Number.isInteger(people) && people >= 1 && people <= 20
      ? `${String(Number(bookingForm.dataset.price) * people).replace(/\B(?=(\d{3})+(?!\d))/g, separator)} ${bookingForm.dataset.currency}`
      : '—';
  };
  count.addEventListener('input', update);
  update();
}

const photoForm = document.querySelector('[data-photo-form]');
if (photoForm) {
  const photo = photoForm.elements.namedItem('photo');
  const preview = photoForm.querySelector('[data-photo-preview]');
  const original = preview.getAttribute('src');
  const wasHidden = preview.hidden;
  let objectUrl;
  photo.addEventListener('change', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const selected = photo.files[0];
    if (selected) {
      objectUrl = URL.createObjectURL(selected);
      preview.src = objectUrl;
      preview.hidden = false;
    } else {
      preview.src = original;
      preview.hidden = wasHidden;
    }
  });
}

for (const trigger of document.querySelectorAll('[data-copy]')) {
  const target = document.getElementById(trigger.dataset.copy);
  const label = trigger.querySelector('span');
  if (!target || !label) continue;
  trigger.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      label.textContent = trigger.dataset.copied;
      trigger.setAttribute('aria-label', trigger.dataset.copied);
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      label.textContent = trigger.dataset.selected;
      trigger.setAttribute('aria-label', trigger.dataset.selected);
    }
  });
}

const formError = document.querySelector('form [role=alert]');
if (formError) {
  formError.tabIndex = -1;
  formError.focus();
}

const bookingNotice = document.querySelector('[data-booking-notice]');
if (bookingNotice) {
  const inbox = document.querySelector('[data-booking-inbox]');
  let latest;
  let hasNew = false;
  let busy = false;

  const checkBookings = async () => {
    if (document.hidden || busy) return;
    busy = true;
    try {
      const response = await fetch('/admin/bronlar/bildirishnoma', { cache: 'no-store' });
      if (!response.ok) return;
      const counts = await response.json();
      if (latest !== undefined && counts.latest > latest) hasNew = true;
      latest = Math.max(latest ?? 0, counts.latest);

      const pending = counts.pending ? `${counts.pending} ta bron tasdiq kutmoqda.` : '';
      const message = [hasNew ? 'Yangi bron keldi!' : '', pending].filter(Boolean).join(' ');
      if (bookingNotice.textContent !== message) bookingNotice.textContent = message;
      inbox.hidden = !message;
    } catch {
      // Keep the current notice during a temporary connection interruption.
    } finally {
      busy = false;
    }
  };

  checkBookings();
  window.setInterval(checkBookings, 12000);
  document.addEventListener('visibilitychange', checkBookings);
}
