import { languageFor, localizedPath } from './i18n.js';
import { bookingTitle, localizeTour, tourTextLimits, translatedTourFields } from './tour-text.js';
import { assets } from 'unistay:assets';
import { ensureCatalog } from './catalog.js';
import { cloudflareAdminAllowed } from './admin-access.js';
import { adminBookings, adminPayment, adminTourForm, adminTours } from './admin-views.js';
import { bookingResult, categoryNames, home, infoPage, lookupPage, statusNames, tourDetail } from './views.js';

const MAX_PHOTO = 5 * 1024 * 1024;
const MAX_FORM = 48 * 1024;
const PER_PAGE = 25;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^US(?:-[A-HJ-NP-Z2-9]{4}){4}$/;
const ID_RE = /^[a-z0-9-]{1,64}$/;
const MEDIA_RE = /^\/media\/([a-f0-9-]{36}\.(?:jpg|png|webp))$/;
const todayFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tashkent', dateStyle: 'short' });
const mediaTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function reply(body, status, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function html(body, status = 200) {
  return reply(body, status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'",
  });
}

const redirect = (path) => reply(null, 303, { Location: path });
const today = () => todayFormatter.format(new Date());
const clean = (form, field, max = 2500) => String(form.get(field) ?? '').trim().slice(0, max + 1);
const inRange = (value, min, max) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;
const inEnum = (values, key) => Object.hasOwn(values, key);
const list = async (stmt) => (await stmt.all()).results;

function codeForBooking() {
  const characters = Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => ALPHABET[n % ALPHABET.length]);
  return 'US-' + characters.join('').match(/.{4}/g).join('-');
}

function dateIsValid(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < today()) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function assetResponse(request, pathname) {
  const asset = assets[pathname];
  if (!asset) return notFound();
  const body = request.method === 'HEAD' ? null : asset.base64
    ? Uint8Array.from(atob(asset.base64), (c) => c.charCodeAt(0)) : asset.text;
  return reply(body, 200, {
    'Content-Type': asset.type,
    'Cache-Control': 'public, max-age=600',
    'Content-Length': String(asset.size),
  });
}

async function mediaResponse(request, env, pathname) {
  const key = pathname.match(MEDIA_RE)?.[1];
  if (!key) return notFound();
  const object = await (request.method === 'HEAD' ? env.BUCKET.head(key) : env.BUCKET.get(key));
  if (!object) return notFound();
  return reply(request.method === 'HEAD' ? null : object.body, 200, {
    'Content-Type': mediaTypes[key.split('.').at(-1)],
    'Content-Length': String(object.size),
    'Cache-Control': 'public, max-age=86400',
  });
}

function notFound(message = 'Bu sahifa topilmadi.', language = 'uz') {
  return html(infoPage('Sahifa topilmadi', message, { language }), 404);
}

async function paymentSettings(db) {
  const row = await db.prepare("SELECT value FROM site_settings WHERE key = 'payment'").first();
  if (!row) return null;
  const settings = JSON.parse(row.value);
  return settings.recipient && settings.account ? settings : null;
}

async function showTour(db, id, options = {}) {
  const tour = await db.prepare('SELECT * FROM tours WHERE id = ? AND published = 1').bind(id).first();
  if (!tour) return notFound('Bu turpaket katalogda mavjud emas.', options.language);
  return html(tourDetail(localizeTour(tour, options.language ?? 'uz'), {
    today: today(),
    code: codeForBooking(),
    payment: !tour.sample && await paymentSettings(db),
    ...options,
  }), options.status ?? 200);
}

async function findBooking(db, code) {
  if (!CODE_RE.test(code)) return null;
  return db.prepare(`
    SELECT code, tour_id, tour_title, tour_translations, date, people, total, sample, status, paid
    FROM bookings WHERE code = ?
  `).bind(code).first();
}

async function saveBooking(db, id, form, language) {
  const code = clean(form, 'code', 26).toUpperCase();
  const values = {
    date: clean(form, 'date', 10),
    people: clean(form, 'people', 3),
    customer: clean(form, 'customer', 100),
    phone: clean(form, 'phone', 32),
  };
  const errors = (error, status = 400) => showTour(db, id, {
    values, error, status, language, code: CODE_RE.test(code) ? code : codeForBooking(),
  });
  const phoneDigits = values.phone.replace(/\D/g, '').length;

  if (!CODE_RE.test(code)) return errors('Bron formasini qayta yuboring.');
  if (!dateIsValid(values.date)) return errors('Bugungi yoki undan keyingi sanani tanlang.');
  if (!inRange(values.people, 1, 20)) return errors('Kishilar soni 1 dan 20 gacha bo‘lishi kerak.');
  if (values.customer.length < 2 || values.customer.length > 100) return errors('Ism va familiyangizni kiriting.');
  if (!/^\+?[0-9][0-9 ()-]*$/.test(values.phone) || values.phone.length > 32 || phoneDigits < 7 || phoneDigits > 15) {
    return errors('Telefon raqamini to‘g‘ri formatda kiriting.');
  }

  const postedPrice = clean(form, 'price', 10);
  const sample = clean(form, 'sample', 1);
  if (!inRange(postedPrice, 1000, 1000000000) || !['0', '1'].includes(sample)) {
    return errors('Turpaket narxini tekshirib, formani qayta yuboring.');
  }
  const people = Number(values.people);
  const result = await db.prepare(`
    INSERT INTO bookings (code, tour_id, tour_title, tour_translations, date, people, customer, phone, total, sample, created_at)
    SELECT ?, id, title,
      json_object('en', json_extract(translations, '$.en.title'), 'de', json_extract(translations, '$.de.title')),
      ?, ?, ?, ?, price * ?, sample, ?
    FROM tours
    WHERE id = ? AND published = 1 AND price = ? AND sample = ?
    ON CONFLICT(code) DO NOTHING
  `).bind(
    code, values.date, people, values.customer, values.phone, people, new Date().toISOString(),
    id, Number(postedPrice), Number(sample),
  ).run();

  // A retry of the same form should resolve to the original booking.
  if (result.meta.changes === 0) {
    const prior = await db.prepare('SELECT 1 FROM bookings WHERE code = ? AND tour_id = ?').bind(code, id).first();
    if (!prior) return errors('Turpaket yangilandi. Narxni tekshirib, qayta yuboring.', 409);
  }
  return redirect(localizedPath(`/bron/${code}`, language));
}

async function adminAllowed(request, env) {
  const allowed = String(env.UNISTAY_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!allowed) return false;
  if (env.UNISTAY_ADMIN_AUTH === 'cloudflare-access') {
    return cloudflareAdminAllowed(request, env, allowed);
  }
  if (!request.headers.get('oai-authenticated-user-id')) return false;
  const actual = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  return actual === allowed;
}

function photoExtension(bytes) {
  const startsWith = (offset, signature) => signature.every((value, index) => bytes[offset + index] === value);
  if (startsWith(0, [255, 216, 255])) return 'jpg';
  if (startsWith(0, [137, 80, 78, 71, 13, 10, 26, 10])) return 'png';
  if (startsWith(0, [82, 73, 70, 70]) && startsWith(8, [87, 69, 66, 80])) return 'webp';
  return null;
}

async function saveTour(env, id, form) {
  const db = env.DB;
  const isNew = id === 'yangi';
  const tour = isNew ? undefined : await db.prepare('SELECT * FROM tours WHERE id = ?').bind(id).first();
  if (!isNew && !tour) return notFound();
  const values = {
    title: clean(form, 'title', 100),
    category: clean(form, 'category', 15),
    location: clean(form, 'location', 100),
    days: clean(form, 'days', 2),
    price: clean(form, 'price', 10),
    summary: clean(form, 'summary', 240),
    itinerary: clean(form, 'itinerary', 2500),
    included: clean(form, 'included', 1000),
    sample: form.has('sample'),
    published: form.has('published'),
  };

  const limits = Object.entries(tourTextLimits);
  const translations = Object.fromEntries(['en', 'de'].map((language) => {
    const existing = translatedTourFields(tour, language);
    const fields = limits.map(([key, limit]) => {
      const name = `${language}_${key}`;
      return [key, form.has(name) ? clean(form, name, limit) : existing[key] ?? ''];
    });
    return [language, Object.fromEntries(fields)];
  }));
  const invalid = (error) => html(adminTourForm({ tour, values, translations, error }), 400);
  if (limits.some(([key, limit]) => !values[key] || values[key].length > limit)) {
    return invalid('Nom, manzil, tavsif, dastur va xizmatlar maydonlarini to‘ldiring.');
  }
  if (Object.values(translations).some((content) => limits.some(([key, limit]) => content[key].length > limit))) {
    return invalid('Tarjima maydonlaridagi matnni qisqartiring.');
  }
  if (!inEnum(categoryNames, values.category)) return invalid('Turpaket bo‘limini tanlang.');
  if (!inRange(values.days, 1, 30)) return invalid('Davomiylik 1 dan 30 kungacha bo‘lishi kerak.');
  if (!inRange(values.price, 1000, 1000000000)) return invalid('Narx 1 000 dan 1 000 000 000 so‘mgacha bo‘lishi kerak.');

  const photo = form.get('photo');
  let image = null;
  if (photo instanceof File && photo.size) {
    if (photo.size > MAX_PHOTO) return invalid('Rasm 5 MB dan kichik bo‘lishi kerak.');
    const buffer = await photo.arrayBuffer();
    const extension = photoExtension(new Uint8Array(buffer));
    if (!extension) return invalid('JPG, PNG yoki WebP rasmini tanlang.');
    const key = `${crypto.randomUUID()}.${extension}`;
    await env.BUCKET.put(key, buffer, { httpMetadata: { contentType: mediaTypes[extension] } });
    image = `/media/${key}`;
  } else if (isNew) {
    return invalid('Turpaketga rasm yuklang.');
  }

  const fields = [
    values.title, values.category, values.location, Number(values.days), Number(values.price),
    values.summary, values.itinerary, values.included, Number(values.sample), Number(values.published), JSON.stringify(translations),
  ];
  if (isNew) {
    await db.prepare(`
      INSERT INTO tours (title, category, location, days, price, summary, itinerary, included, sample, published, translations, image, id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(...fields, image, crypto.randomUUID(), new Date().toISOString()).run();
  } else {
    await db.prepare(`
      UPDATE tours
      SET title = ?, category = ?, location = ?, days = ?, price = ?, summary = ?, itinerary = ?, included = ?,
        sample = ?, published = ?, translations = ?, image = coalesce(?, image)
      WHERE id = ?
    `).bind(...fields, image, id).run();
  }
  return redirect('/admin?bolim=turlar&saqlandi=1');
}

async function savePayment(db, form) {
  const values = { recipient: clean(form, 'recipient', 150), account: clean(form, 'account', 150), note: clean(form, 'note', 700) };
  if (values.recipient.length > 150 || values.account.length > 150 || values.note.length > 700
    || (Boolean(values.recipient) !== Boolean(values.account)) || (values.note && !values.recipient)) {
    return html(adminPayment({ values, error: 'Qabul qiluvchi va hisob raqamini birga kiriting yoki barcha maydonni bo‘sh qoldiring.' }), 400);
  }
  await db.prepare(`
    INSERT INTO site_settings (key, value) VALUES ('payment', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).bind(JSON.stringify(values)).run();
  return redirect('/admin?bolim=tolov&saqlandi=1');
}

function pageNumber(value) {
  return value && inRange(value, 1, 1000000) ? Number(value) : 1;
}

async function adminRoute(request, env, url, form, authorized) {
  if (!authorized) {
    if (env.UNISTAY_ADMIN_AUTH === 'cloudflare-access') {
      return html(infoPage('Admin panel', 'Cloudflare Access orqali administrator hisobingiz bilan kiring.', { admin: true }), 403);
    }
    const signedIn = Boolean(request.headers.get('oai-authenticated-user-id'));
    return html(infoPage(
      'Admin panel', signedIn ? 'Bu ChatGPT hisobida admin panelga kirish huquqi yo‘q.' : 'Turpaketlarni boshqarish uchun ChatGPT hisobingiz orqali kiring.',
      { admin: true, signIn: !signedIn },
    ), signedIn ? 403 : 401);
  }

  const db = env.DB;
  const [, , collection, id, extra] = url.pathname.split('/');
  if (extra !== undefined) return notFound();
  if (!form && collection === 'bronlar' && id === 'bildirishnoma') {
    const counts = await db.prepare(`
      SELECT coalesce(max(rowid), 0) AS latest,
        count(CASE WHEN status = 'pending' THEN 1 END) AS pending
      FROM bookings
    `).first();
    return reply(JSON.stringify(counts), 200, { 'Content-Type': 'application/json; charset=utf-8' });
  }
  if (!collection || collection === 'turlar') await ensureCatalog(db);

  if (form) {
    if (collection === 'turlar' && ID_RE.test(id ?? '')) return saveTour(env, id, form);
    if (collection === 'tolov' && id === undefined) return savePayment(db, form);
    if (collection === 'bronlar' && CODE_RE.test(id ?? '')) {
      const status = clean(form, 'status', 12);
      if (!inEnum(statusNames, status)) return html(infoPage('Holatni tanlang', 'Bron uchun mavjud holatlardan birini tanlang.', { admin: true }), 400);
      const result = await db.prepare('UPDATE bookings SET status = ?, paid = CASE WHEN sample = 1 THEN 0 ELSE ? END WHERE code = ?')
        .bind(status, Number(form.has('paid')), id).run();
      if (!result.meta.changes) return notFound('Bu bron topilmadi.');
      return redirect(`/admin?bolim=bronlar&sahifa=${pageNumber(clean(form, 'page', 7))}&saqlandi=1`);
    }
    return notFound();
  }

  if (collection === 'turlar' && ID_RE.test(id ?? '')) {
    if (id === 'yangi') return html(adminTourForm());
    const tour = await db.prepare('SELECT * FROM tours WHERE id = ?').bind(id).first();
    return tour ? html(adminTourForm({ tour })) : notFound('Bu turpaket topilmadi.');
  }

  if (collection) return notFound();
  const section = url.searchParams.get('bolim');
  const notice = url.searchParams.has('saqlandi') ? 'O‘zgarishlar saqlandi.' : undefined;
  if (section === 'tolov') return html(adminPayment({ values: await paymentSettings(db) ?? {}, notice }));
  if (section === 'bronlar') {
    const page = pageNumber(url.searchParams.get('sahifa'));
    const bookings = await list(db.prepare('SELECT * FROM bookings ORDER BY created_at DESC, code DESC LIMIT ? OFFSET ?')
      .bind(PER_PAGE + 1, (page - 1) * PER_PAGE));
    return html(adminBookings(bookings.slice(0, PER_PAGE), { page, hasNext: bookings.length > PER_PAGE, notice }));
  }
  return html(adminTours(await list(db.prepare('SELECT * FROM tours ORDER BY sort_order, created_at DESC')), notice));
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const method = request.method;
  const language = languageFor(url);
  if (!['GET', 'HEAD', 'POST'].includes(method)) return reply('Method not allowed', 405, { Allow: 'GET, HEAD, POST' });
  const isAdmin = path === '/admin' || path.startsWith('/admin/');

  if (method !== 'POST' && path.startsWith('/assets/')) return assetResponse(request, path);
  if (method !== 'POST' && path.startsWith('/media/')) return mediaResponse(request, env, path);

  let form;
  let authorized;
  if (method === 'POST') {
    const origin = request.headers.get('Origin');
    // Our referrer policy can omit the origin of a same-origin browser form.
    const sameOriginForm = origin === 'null' && request.headers.get('Sec-Fetch-Site') === 'same-origin';
    if (origin !== url.origin && !sameOriginForm) {
      return html(infoPage('So‘rov rad etildi', 'Formani Unistay sahifasidan qayta yuboring.', { language }), 403);
    }
    const adminUpload = path.startsWith('/admin/turlar/');
    if (isAdmin) {
      authorized = await adminAllowed(request, env);
      if (!authorized) return adminRoute(request, env, url, undefined, false);
    }
    if (Number(request.headers.get('content-length')) > (adminUpload ? MAX_PHOTO + MAX_FORM : MAX_FORM)) {
      return html(infoPage('Fayl juda katta', adminUpload ? 'Rasmni 5 MB gacha kichraytirib qayta yuklang.' : 'Formani tekshirib, qayta yuboring.', { language: adminUpload ? 'uz' : language }), 413);
    }
    try {
      form = await request.formData();
    } catch {
      return html(infoPage('Forma o‘qilmadi', 'Ma’lumotlarni qayta yuboring.', { language }), 400);
    }
  }

  url.pathname = path;
  if (isAdmin) return adminRoute(request, env, url, form, authorized ?? await adminAllowed(request, env));

  const db = env.DB;
  if (path === '/' && !form) {
    await ensureCatalog(db);
    const category = url.searchParams.get('tur') === 'international' ? 'international' : 'domestic';
    const tours = await list(db.prepare('SELECT * FROM tours WHERE published = 1 ORDER BY sort_order, created_at DESC'));
    return html(home(tours.map((tour) => localizeTour(tour, language)), category, language));
  }

  if (path === '/bron-holati') {
    if (!form) return html(lookupPage({ language }));
    const code = clean(form, 'code', 32).toUpperCase();
    if (await findBooking(db, code)) return redirect(localizedPath(`/bron/${code}`, language));
    return html(lookupPage({ code, language, error: 'Bu kod bilan bron topilmadi. Kodni tekshirib qayta kiriting.' }), 404);
  }

  const itinerary = path.match(/^\/turlar\/([a-z0-9-]{1,64})(\/bron)?$/);
  if (itinerary) {
    await ensureCatalog(db);
    if (!form && !itinerary[2]) return showTour(db, itinerary[1], { language });
    if (form && itinerary[2]) return saveBooking(db, itinerary[1], form, language);
  }

  if (path.startsWith('/bron/') && !form) {
    const booking = await findBooking(db, path.slice('/bron/'.length));
    return booking
      ? html(bookingResult({ ...booking, tour_title: bookingTitle(booking, language) },
        !booking.sample && !booking.paid && booking.status !== 'cancelled' && await paymentSettings(db), language))
      : notFound('Bu bron kodi topilmadi.', language);
  }
  return notFound(undefined, language);
}

export default {
  async fetch(request, env) {
    try {
      const response = await handle(request, env);
      return request.method === 'HEAD' ? new Response(null, response) : response;
    } catch (error) {
      console.error('Unistay request failed', error instanceof Error ? error.message : 'Unknown error');
      return html(infoPage('Vaqtinchalik xatolik', 'Bir ozdan so‘ng qayta urinib ko‘ring.', { language: languageFor(new URL(request.url)) }), 500);
    }
  },
};
