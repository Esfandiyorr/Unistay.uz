import { duration, languages, localizedPath, translate } from './i18n.js';

export const categoryNames = { domestic: 'Ichki turizm', international: 'Tashqi turizm' };
export const statusNames = { pending: 'Tasdiq kutilmoqda', confirmed: 'Tasdiqlangan', cancelled: 'Bekor qilingan' };
const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const iconPaths = {
  down: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  pin: '<path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  ticket: '<path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6Z"/><path d="M14 5v2m0 3v4m0 3v2"/>',
  mountain: '<path d="m3 19 7-13 4 7 2-4 5 10H3Zm4.5-8.5 2.5 2 2-2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3.5 12h17"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  wallet: '<path d="M3 6a2 2 0 0 1 2-2h12v4H5a2 2 0 0 1 0-4m-2 2v12a2 2 0 0 0 2 2h15v-6m0-2V8h-3"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 4H6a2 2 0 0 0-2 2v10"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  list: '<path d="M10 6h10M10 12h10M10 18h10M4 6h1m-1 6h1m-1 6h1"/>',
};

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
}

export const currency = (language) => language === 'uz' ? 'so‘m' : 'UZS';
export const money = (value, language = 'uz') => {
  const separator = { uz: '\u00A0', en: ',', de: '.' }[language];
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, separator)} ${currency(language)}`;
};
const readableDate = (value, language) => {
  const [year, month, day] = value.split('-');
  if (language === 'de') return `${day}.${month}.${year}`;
  if (language === 'en') {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' })
      .format(new Date(`${value}T12:00:00Z`));
  }
  return `${Number(day)}-${months[Number(month) - 1]} ${year}`;
};
const lines = (value) => String(value).split('\n').map((line) => line.trim()).filter(Boolean);
const location = (tour, language) => tour.category === 'domestic' ? `${tour.location}, ${language === 'en' ? 'Surkhandarya' : 'Surxondaryo'}` : tour.location;
const sampleBadge = (label = 'Namuna') => `<span class="tag tag--sample">${label}</span>`;

function brand(language) {
  const t = (text) => translate(language, text);
  return `<a href="${localizedPath('/', language)}" class="brand" aria-label="${t('Unistay bosh sahifasi')}">
    <img src="/assets/unistay.svg" alt="" width="42" height="42">
    <span>Unistay<span class="brand-dot">.</span></span>
  </a>`;
}

export function layout(title, body, { description, admin = false, language = 'uz', current = '/' } = {}) {
  const t = (text) => translate(language, text);
  const href = (path) => localizedPath(path, language);
  const languageNav = Object.entries(languages).map(([key, label]) => `
    <a href="${escapeHtml(localizedPath(current, key))}" lang="${key}" hreflang="${key}"
      aria-label="${label}" ${key === language ? 'aria-current="true"' : ''}>${key.toUpperCase()}</a>`).join('');
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f9f6ef">
  <meta name="description" content="${escapeHtml(description || t('Unistay — Surxondaryo va xorij bo‘ylab turpaketlar va bronlash xizmati.'))}">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/assets/unistay.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/style.css?v=languages">
  <script src="/assets/site.js?v=languages" defer></script>
</head>
<body>
  <a href="#asosiy" class="skip-link">${t('Asosiy mazmunga o‘tish')}</a>
  <header class="site-header">
    <div class="wrap header-inner">
      ${brand(language)}
      <nav aria-label="${t('Asosiy menyu')}" class="main-nav">
        <a href="${href('/#turpaketlar')}">${t('Turpaketlar')}</a>
        <a href="${href('/#bronlash')}">${t('Bronlash tartibi')}</a>
      </nav>
      <div class="header-tools">
      ${admin ? '' : `<nav class="language-nav" aria-label="${t('Til')}">${languageNav}</nav>`}
      <a class="button button--outline header-action" href="${href(admin ? '/' : '/bron-holati')}" aria-label="${admin ? 'Saytga qaytish' : t('Bron holati')}">
        ${icon(admin ? 'back' : 'ticket')} <span>${admin ? 'Saytga qaytish' : t('Bron holati')}</span>
      </a>
      </div>
    </div>
  </header>
  <main id="asosiy">${body}</main>
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <div>${brand(language)}<p>${t('Surxondaryo va xorij bo‘ylab sayohatlar.')}</p></div>
      <nav aria-label="${t('Quyi menyu')}">
        <a href="${href('/#turpaketlar')}">${t('Turpaketlar')}</a>
        <a href="${href('/bron-holati')}">${t('Bron holati')}</a>
        <a href="/admin" class="footer-admin">${icon('lock')} ${t('Admin panel')}</a>
      </nav>
    </div>
  </footer>
</body>
</html>`;
}

function tourCard(tour, active, language) {
  const t = (text) => translate(language, text);
  return `<a class="tour-card" data-category="${tour.category}" href="${localizedPath(`/turlar/${tour.id}`, language)}" ${active ? '' : 'hidden'}>
    <div class="card-image">
      <img src="${escapeHtml(tour.image)}" alt="" width="640" height="434" loading="lazy">
      ${tour.sample ? sampleBadge(t('Namuna')) : ''}
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span>${icon('pin')}${escapeHtml(tour.location)}</span>
        <span>${icon('calendar')}${duration(tour.days, language)}</span>
      </div>
      <h3>${escapeHtml(tour.title)}</h3>
      <p>${escapeHtml(tour.summary)}</p>
      <div class="card-bottom">
        <div><strong>${money(tour.price, language)}</strong><span> / ${t('kishi')}</span></div>
        <span class="card-arrow" aria-hidden="true">${icon('arrow')}</span>
      </div>
    </div>
  </a>`;
}

export function home(tours, category, language = 'uz') {
  const t = (text) => translate(language, text);
  const current = category === 'domestic' ? '/' : '/?tur=international';
  const choices = Object.entries(categoryNames).map(([key, title]) => `
    <a class="filter" data-filter="${key}" href="${escapeHtml(localizedPath(`/?tur=${key}#turpaketlar`, language))}" ${key === category ? 'aria-current="true"' : ''}>
      ${icon(key === 'domestic' ? 'mountain' : 'globe')}${t(title)}
    </a>`).join('');
  const steps = [
    ['mountain', 'Turpaketni tanlang', 'Yo‘nalish, narx va safar dasturi bilan tanishing.'],
    ['calendar', 'Bron qiling', 'Safar sanasi va sayohatchilar sonini kiriting.'],
    ['ticket', 'Bron holatini kuzating', 'Kuzatuv kodini saqlang. Tur tasdiqlanganda holat shu yerda yangilanadi.'],
  ];
  return layout(t('Unistay — Surxondan dunyoga'), `
    <section class="hero wrap" aria-labelledby="hero-title">
      <img class="hero-image" src="/assets/boysun.webp" alt="" width="1600" height="1067" fetchpriority="high">
      <div class="hero-shade"></div>
      <div class="hero-content">
        <span class="hero-label">${icon('pin')} ${t('SAYOHAT VA BRONLASH')}</span>
        <h1 id="hero-title">${t('Surxondan')}<br><span>${t('dunyoga.')}</span></h1>
        <p>${t('Boysun tog‘laridan Bosfor sohillarigacha. Sayohatingizni tanlang va joyingizni bron qiling.')}</p>
        <a class="button button--hero" href="#turpaketlar">${t('Turpaketlarni ko‘rish')} ${icon('down')}</a>
      </div>
      <div class="hero-location"><span class="ornament">✦</span> Boysun · ${t('Illyustratsiya')}</div>
    </section>
    <section class="catalog wrap" id="turpaketlar" aria-labelledby="catalog-title">
      <div class="section-head">
        <div>
          <p class="eyebrow"><span></span> ${t('YO‘NALISHLAR')}</p>
          <h2 id="catalog-title">${t('Turpaketlar')}</h2>
        </div>
        <nav class="filters" aria-label="${t('Turpaket toifasi')}">${choices}</nav>
      </div>
      <p class="category-copy" data-category-copy="domestic" ${category === 'domestic' ? '' : 'hidden'}>${t('Surxondaryoning tog‘lari, sharsharalari va tarixiy shaharlari.')}</p>
      <p class="category-copy" data-category-copy="international" ${category === 'international' ? '' : 'hidden'}>${t('Xorij bo‘ylab sayohat yo‘nalishlari.')}</p>
      <div class="tour-grid">
        ${tours.map((tour) => tourCard(tour, tour.category === category, language)).join('')}
      </div>
      <p class="empty" data-empty ${tours.some((tour) => tour.category === category) ? 'hidden' : ''}>${t('Bu bo‘limda hozircha turpaketlar yo‘q.')}</p>
    </section>
    <section class="guide wrap" id="bronlash" aria-labelledby="guide-title">
      <div class="guide-head"><p class="eyebrow"><span></span> ${t('BRONLASH')}</p><h2 id="guide-title">${t('Sayohatga uch qadam')}</h2></div>
      <ol class="step-grid">
        ${steps.map(([name, title, copy]) => `<li>
          <span class="step-icon">${icon(name)}</span>
          <h3>${t(title)}</h3><p>${t(copy)}</p>
        </li>`).join('')}
      </ol>
    </section>
  `, { language, current });
}

export function alert(message) {
  return message ? `<p class="alert" role="alert">${escapeHtml(message)}</p>` : '';
}

function paymentInfo(payment, sample, language) {
  const t = (text) => translate(language, text);
  let content;
  if (sample) {
    content = `<p>${t('Bu namunaviy turpaket. Sinov broniga to‘lov talab qilinmaydi.')}</p>`;
  } else if (payment) {
    content = `<dl class="payment-details">
      <div><dt>${t('Qabul qiluvchi')}</dt><dd>${escapeHtml(payment.recipient)}</dd></div>
      <div><dt>${t('Hisob raqami yoki rekvizit')}</dt><dd>${escapeHtml(payment.account)}</dd></div>
    </dl>
    ${payment.note ? `<p class="multiline">${escapeHtml(payment.note)}</p>` : ''}
    <p class="fine-print">${t('Izohga bron kodini yozing. To‘lov tekshirilgach holat yangilanadi.')}</p>`;
  } else {
    content = `<p>${t('To‘lov rekvizitlari hali kiritilmagan. Bronni yuborishingiz mumkin.')}</p>`;
  }
  return `<div class="payment-info"><h3>${icon('wallet')}${t('To‘lov ma’lumotlari')}</h3>${content}</div>`;
}

export function tourDetail(tour, { payment, today, code, values = {}, error, language = 'uz' } = {}) {
  const t = (text) => translate(language, text);
  const current = `/turlar/${tour.id}`;
  const groupSize = /^[0-9]+$/.test(values.people ?? '') && Number(values.people) >= 1 && Number(values.people) <= 20
    ? Number(values.people) : 1;
  return layout(`${tour.title} — Unistay`, `
    <div class="wrap inside">
      <a class="back-link" href="${escapeHtml(localizedPath(`/?tur=${tour.category}#turpaketlar`, language))}">${icon('back')} ${t('Turpaketlarga qaytish')}</a>
      <div class="detail-head">
        <div class="inline-tags">
          <span class="tag">${t(categoryNames[tour.category])}</span>
          ${tour.sample ? sampleBadge(t('Namunaviy tur')) : ''}
        </div>
        <h1>${escapeHtml(tour.title)}</h1>
        <div class="detail-meta"><span>${icon('pin')}${escapeHtml(location(tour, language))}</span><span>${icon('calendar')}${duration(tour.days, language)}</span></div>
        <a class="button button--primary detail-jump" href="#bron-forma">${t('Bron formasiga o‘tish')} ${icon('down')}</a>
      </div>
      <div class="detail-grid">
        <article class="tour-story">
          <img class="detail-image" src="${escapeHtml(tour.image)}" alt="${escapeHtml(tour.sample ? tour.title + ' · ' + t('Illyustratsiya') : tour.title)}" width="960" height="620">
          <p class="detail-summary">${escapeHtml(tour.summary)}</p>
          <div class="story-block"><h2>${t('Sayohat dasturi')}</h2>
            <ul class="itinerary">${lines(tour.itinerary).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
          </div>
          <div class="story-block"><h2>${t('Narxga nimalar kiradi?')}</h2>
            <ul class="included">${lines(tour.included).map((line) => `<li>${icon('check')}${escapeHtml(line)}</li>`).join('')}</ul>
          </div>
        </article>
        <aside class="booking-card" aria-labelledby="booking-title" id="bron-forma">
          <div class="booking-price"><strong>${money(tour.price, language)}</strong><span> / ${t('kishi')}</span></div>
          <h2 id="booking-title">${t('Sayohatni bron qiling')}</h2>
          <form method="post" action="${localizedPath(current + '/bron', language)}" data-booking-form data-price="${tour.price}" data-currency="${currency(language)}">
            ${alert(error && t(error))}
            <input type="hidden" name="code" value="${escapeHtml(code)}">
            <input type="hidden" name="price" value="${tour.price}">
            <input type="hidden" name="sample" value="${tour.sample ? 1 : 0}">
            <div class="form-grid">
              <label>${t('Safar sanasi')} <input required type="date" name="date" min="${today}" value="${escapeHtml(values.date)}"></label>
              <label>${t('Kishilar soni')}
                <input required type="number" name="people" value="${groupSize}" min="1" max="20" inputmode="numeric">
              </label>
            </div>
            <label>${t('Ism va familiya')} <input required maxlength="100" name="customer" autocomplete="name" placeholder="${t('Ism Familiya')}" value="${escapeHtml(values.customer)}"></label>
            <label>${t('Telefon raqami')} <input required type="tel" maxlength="32" name="phone" autocomplete="tel" placeholder="+998 90 123 45 67" value="${escapeHtml(values.phone)}"></label>
            <p class="fine-print">${t('Ism va telefon raqamingiz bronni boshqarish va siz bilan bog‘lanish uchun ishlatiladi.')}</p>
            <div class="total"><span>${t('Jami')}</span><strong data-total aria-live="polite">${money(tour.price * groupSize, language)}</strong></div>
            <button class="button button--primary full-width" type="submit">${t(tour.sample ? 'Sinov bronini yuborish' : 'Bron qilish')} ${icon('arrow')}</button>
          </form>
          ${paymentInfo(payment, tour.sample, language)}
        </aside>
      </div>
    </div>
  `, { description: tour.summary, language, current });
}

export function bookingResult(booking, payment, language = 'uz') {
  const t = (text) => translate(language, text);
  const href = (path) => localizedPath(path, language);
  const confirmed = booking.status === 'confirmed';
  const cancelled = booking.status === 'cancelled';
  const heading = t(cancelled ? 'Bron bekor qilindi' : confirmed ? 'Bron tasdiqlandi!' : 'Bron qilindi!');
  const note = cancelled ? 'Yangi safar uchun turpaketlar katalogiga qayting.'
    : confirmed ? 'Safaringiz tasdiqlandi. Safar ma’lumotlarini saqlab qo‘ying.'
      : 'So‘rovingiz qabul qilindi. Yakuniy tasdiq holati shu sahifada yangilanadi.';
  return layout(`${heading} — Unistay`, `
    <section class="wrap narrow inside">
      <article class="result-card">
        <span class="result-icon">${icon(cancelled ? 'ticket' : 'check')}</span>
        <h1>${heading}</h1>
        <p>${t(note)}</p>
        <div class="inline-tags centered">
          <span class="tag state--${booking.status}">${t(statusNames[booking.status])}</span>
          ${booking.sample ? sampleBadge(t('Sinov broni')) : ''}
        </div>
        <section class="booking-receipt" aria-label="${t('Bron ma’lumotlari')}">
          <h2>${escapeHtml(booking.tour_title)}</h2>
          <dl>
            <div><dt>${t('Safar sanasi')}</dt><dd>${readableDate(booking.date, language)}</dd></div>
            <div><dt>${t('Kishilar soni')}</dt><dd>${booking.people}</dd></div>
            <div><dt>${t('Jami')}</dt><dd>${money(booking.total, language)}</dd></div>
            ${booking.sample ? '' : `<div><dt>${t('To‘lov holati')}</dt><dd>${t(booking.paid ? 'To‘langan' : 'Kutilmoqda')}</dd></div>`}
          </dl>
          <div class="receipt-code">
            <div><span>${t('Bron kodi')}</span><strong id="booking-code">${booking.code}</strong></div>
            <button class="button button--outline" type="button" data-copy="booking-code" data-copied="${t('Nusxalandi')}" data-selected="${t('Kod belgilandi')}" aria-label="${t('Bron kodini nusxalash')}">${icon('copy')}<span>${t('Nusxalash')}</span></button>
          </div>
          <p class="fine-print">${t('Holatni qayta tekshirish uchun ushbu kodni saqlab qo‘ying.')}</p>
        </section>
        ${cancelled || booking.paid ? '' : paymentInfo(payment, booking.sample, language)}
        <a class="button button--primary full-width" href="${href('/#turpaketlar')}">${t('Turpaketlarga qaytish')} ${icon('arrow')}</a>
      </article>
    </section>
  `, { language, current: `/bron/${booking.code}` });
}

export function lookupPage({ error, code, language = 'uz' } = {}) {
  const t = (text) => translate(language, text);
  const current = '/bron-holati';
  return layout(`${t('Bron holati')} — Unistay`, `
    <section class="wrap narrow inside">
      <article class="result-card">
        <span class="result-icon">${icon('ticket')}</span>
        <h1>${t('Bron holati')}</h1>
        <p>${t('Bron qilganingizda berilgan kodni kiriting.')}</p>
        <form method="post" action="${localizedPath(current, language)}" class="lookup-form">
          ${alert(error && t(error))}
          <label>${t('Bron kodi')} <input name="code" required maxlength="32" spellcheck="false" autocapitalize="characters" autocomplete="off" placeholder="US-XXXX-XXXX-XXXX-XXXX" value="${escapeHtml(code)}"></label>
          <button class="button button--primary full-width" type="submit">${t('Holatni tekshirish')} ${icon('arrow')}</button>
        </form>
      </article>
    </section>
  `, { language, current });
}

export function infoPage(title, message, { admin = false, signIn = false, language = 'uz' } = {}) {
  const t = (text) => translate(language, text);
  return layout(`${t(title)} — Unistay`, `
    <section class="wrap narrow inside">
      <article class="result-card">
        <h1>${escapeHtml(t(title))}</h1>
        <p>${escapeHtml(t(message))}</p>
        ${signIn ? `<a class="button button--primary" href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">ChatGPT orqali kirish ${icon('arrow')}</a>`
          : `<a class="button button--primary" href="${localizedPath('/', language)}">${t('Bosh sahifa')} ${icon('arrow')}</a>`}
      </article>
    </section>`, { admin, language });
}
