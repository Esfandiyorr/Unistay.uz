import { alert, categoryNames, escapeHtml, icon, layout, money, statusNames } from './views.js';

const sections = { turlar: 'Turpaketlar', bronlar: 'Bronlar', tolov: 'To‘lov sozlamalari' };

function adminShell(title, active, body, { showNew = false, notice } = {}) {
  return layout(`${title} — Unistay admin`, `
    <section class="wrap inside admin-page">
      <div class="admin-head">
        <div><p class="eyebrow"><span></span> UNISTAY</p><h1>Admin panel</h1></div>
        ${showNew ? `<a class="button button--primary" href="/admin/turlar/yangi">${icon('plus')} Turpaket qo‘shish</a>` : ''}
      </div>
      <nav class="admin-nav" aria-label="Admin panel bo‘limlari">
        ${Object.entries(sections).map(([key, label]) => `<a href="/admin?bolim=${key}" ${active === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
      </nav>
      <div class="booking-notice">
        <p data-booking-notice role="status"></p>
        <a class="button button--outline" data-booking-inbox href="/admin?bolim=bronlar" hidden>Bronlarni ko‘rish ${icon('arrow')}</a>
      </div>
      ${notice ? `<p class="notice" role="status">${icon('check')} ${escapeHtml(notice)}</p>` : ''}
      ${body}
    </section>
  `, { admin: true });
}

export function adminTours(tours, notice) {
  return adminShell('Turpaketlar', 'turlar', `
    <div class="admin-panel">
      <h2>Turpaketlar</h2>
      ${tours.length ? `<ul class="admin-tour-list">
        ${tours.map((tour) => `<li>
          <img src="${escapeHtml(tour.image)}" alt="" loading="lazy" width="100" height="65">
          <div class="admin-tour-name"><strong>${escapeHtml(tour.title)}</strong>
            <small>${categoryNames[tour.category]} · ${money(tour.price)} / kishi</small></div>
          <div class="inline-tags">
            ${tour.sample ? '<span class="tag tag--sample">Namuna</span>' : ''}
            <span class="tag ${tour.published ? 'state--confirmed' : 'state--cancelled'}">${tour.published ? 'E’lon qilingan' : 'Yashirilgan'}</span>
          </div>
          <a class="button button--outline" href="/admin/turlar/${tour.id}" aria-label="${escapeHtml(tour.title)} turini tahrirlash">Tahrirlash</a>
        </li>`).join('')}
      </ul>` : '<p>Hozircha turpaketlar yo‘q.</p>'}
    </div>
  `, { showNew: true, notice });
}

function field(label, name, values, attributes = '') {
  return `<label>${label}<input name="${name}" ${attributes} value="${escapeHtml(values[name] ?? '')}"></label>`;
}

function area(label, name, values, { limit, required = true, help } = {}) {
  return `<label>${label}
    <textarea name="${name}" rows="3" maxlength="${limit}" ${required ? 'required' : ''}>${escapeHtml(values[name] ?? '')}</textarea>
    ${help ? `<small>${help}</small>` : ''}
  </label>`;
}

const checked = (value) => value ? 'checked' : '';

export function adminTourForm({ tour, values = tour ?? { category: 'domestic', days: 1, published: true }, error } = {}) {
  const heading = tour ? 'Turpaketni tahrirlash' : 'Yangi turpaket';
  return adminShell(heading, 'turlar', `
    <article class="admin-panel editor">
      <h2>${heading}</h2>
      <form method="post" enctype="multipart/form-data" action="/admin/turlar/${tour ? tour.id : 'yangi'}" data-photo-form>
        ${alert(error)}
        ${field('Turpaket nomi', 'title', values, 'required maxlength="100" placeholder="Boysun tog‘lari"')}
        <div class="form-grid">
          <label>Bo‘lim
            <select name="category" required>
              ${Object.entries(categoryNames).map(([key, label]) => `<option value="${key}" ${values.category === key ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
          </label>
          ${field('Manzil', 'location', values, 'required maxlength="100" placeholder="Boysun yoki Istanbul, Turkiya"')}
        </div>
        <div class="form-grid">
          ${field('Davomiyligi (kun)', 'days', values, 'type="number" required min="1" max="30"')}
          ${field('Bir kishi uchun narx (so‘m)', 'price', values, 'type="number" required min="1000" max="1000000000"')}
        </div>
        ${area('Qisqa tavsif', 'summary', values, { limit: 240 })}
        ${area('Sayohat dasturi', 'itinerary', values, { limit: 2500, help: 'Har bir kun yoki bosqichni yangi qatorda yozing.' })}
        ${area('Narxga kiradigan xizmatlar', 'included', values, { limit: 1000, help: 'Har bir xizmatni yangi qatorda yozing.' })}
        <div class="upload">
          <img data-photo-preview src="${escapeHtml(tour?.image || '/assets/unistay.svg')}" alt="Turpaket rasmi" width="144" height="96" ${tour ? '' : 'hidden'}>
          <label>${tour ? 'Rasmni almashtirish' : 'Turpaket rasmi'}
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" ${tour ? '' : 'required'}>
            <small>JPG, PNG yoki WebP. 5 MB gacha.</small>
          </label>
        </div>
        <div class="editor-flags">
          <label class="checkbox"><input type="checkbox" name="published" ${checked(values.published)}> Katalogda ko‘rsatish</label>
          <label class="checkbox"><input type="checkbox" name="sample" ${checked(values.sample)}> Namunaviy tur sifatida ko‘rsatish</label>
        </div>
        <div class="form-actions">
          <button class="button button--primary" type="submit">${icon('check')} Saqlash</button>
          <a class="button button--outline" href="/admin">Ortga qaytish</a>
        </div>
      </form>
    </article>
  `);
}

function bookingRow(booking, page) {
  return `<li class="admin-booking">
    <div>
      <span class="admin-code">${booking.code}</span>
      <h3>${escapeHtml(booking.tour_title)}</h3>
      <p>${booking.date} · ${booking.people} kishi · ${money(booking.total)}</p>
      <div class="inline-tags">
        <span class="tag state--${booking.status}">${statusNames[booking.status]}</span>
        ${booking.sample ? '<span class="tag tag--sample">Sinov broni</span>' : ''}
      </div>
    </div>
    <div class="admin-customer">
      <strong>${escapeHtml(booking.customer)}</strong>
      <a href="tel:${escapeHtml(booking.phone.replace(/[^+\d]/g, ''))}">${escapeHtml(booking.phone)}</a>
    </div>
    <form class="update-booking" method="post" action="/admin/bronlar/${booking.code}">
      <input type="hidden" name="page" value="${page}">
      <label>Bron holati
        <select name="status">
          ${Object.entries(statusNames).map(([key, label]) => `<option value="${key}" ${key === booking.status ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>
      ${booking.sample ? '' : `<label class="checkbox"><input type="checkbox" name="paid" ${checked(booking.paid)}> To‘lov qabul qilingan</label>`}
      <button class="button button--outline" type="submit">Saqlash</button>
    </form>
  </li>`;
}

export function adminBookings(bookings, { page, hasNext, notice }) {
  return adminShell('Bronlar', 'bronlar', `
    <div class="admin-panel">
      <h2>Bronlar</h2>
      ${bookings.length ? `<ul class="admin-booking-list">${bookings.map((booking) => bookingRow(booking, page)).join('')}</ul>`
        : '<p>Bu sahifada bronlar yo‘q.</p>'}
      <nav class="pagination" aria-label="Bronlar sahifalari">
        ${page > 1 ? `<a class="button button--outline" href="/admin?bolim=bronlar&amp;sahifa=${page - 1}">${icon('back')} Oldingi</a>` : ''}
        ${hasNext ? `<a class="button button--outline" href="/admin?bolim=bronlar&amp;sahifa=${page + 1}">Keyingi ${icon('arrow')}</a>` : ''}
      </nav>
    </div>
  `, { notice });
}

export function adminPayment({ values = {}, notice, error } = {}) {
  return adminShell('To‘lov sozlamalari', 'tolov', `
    <article class="admin-panel editor">
      <h2>To‘lov rekvizitlari</h2>
      <p>Bu ma’lumotlar mijozlarga faol turpaketlarda ko‘rinadi. Rekvizitlarni yashirish uchun maydonlarni bo‘sh qoldirib saqlang.</p>
      <form method="post" action="/admin/tolov">
        ${alert(error)}
        ${field('Qabul qiluvchi', 'recipient', values, 'maxlength="150" placeholder="Tashkilot yoki tadbirkor nomi"')}
        ${field('Hisob raqami yoki boshqa rekvizit', 'account', values, 'maxlength="150"')}
        ${area('Mijozga qo‘shimcha ko‘rsatma', 'note', values, { limit: 700, required: false })}
        <button class="button button--primary" type="submit">${icon('check')} Saqlash</button>
      </form>
    </article>
  `, { notice });
}
