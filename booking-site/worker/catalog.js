const sampleTours = [
  {
    id: 'boysun', title: 'Boysun tog‘lari', category: 'domestic', location: 'Boysun',
    days: 2, price: 790000, image: '/assets/boysun.webp',
    summary: 'Tog‘ yo‘llari, qadimiy qishloqlar va Surxonning o‘ziga xos mehmondo‘stligi.',
    itinerary: '1-kun · Boysun markazi, mahalliy bozor va hunarmandlar bilan tanishuv.\n2-kun · Tog‘ etagidagi sayr va manzarali to‘xtash joylari.',
    included: 'Mahalliy gid\nMarshrut bo‘yicha transport\nBir kecha mehmon uyida',
  },
  {
    id: 'termiz', title: 'Qadimiy Termiz', category: 'domestic', location: 'Termiz',
    days: 1, price: 390000, image: '/assets/termiz.webp',
    summary: 'Sulton Saodat majmuasi va Termiz arxeologiya muzeyi orqali tarixga sayohat.',
    itinerary: 'Ertalab · Sulton Saodat me’moriy majmuasiga tashrif.\nKunduzi · Termiz arxeologiya muzeyi va shahar bo‘ylab sayr.',
    included: 'Mahalliy gid\nMarshrut bo‘yicha transport',
  },
  {
    id: 'sangardak', title: 'Sangardak sharsharasi', category: 'domestic', location: 'Sariosiyo',
    days: 1, price: 450000, image: '/assets/sangardak.webp',
    summary: 'Sariosiyoning yashil darasi, salqin sharshara va tabiat qo‘ynida hordiq.',
    itinerary: 'Ertalab · Sangardak qishlog‘iga yo‘l.\nKunduzi · Sharshara tomon piyoda yurish va tabiat qo‘ynida dam olish.',
    included: 'Mahalliy gid\nMarshrut bo‘yicha transport',
  },
  {
    id: 'istanbul', title: 'Istanbul va Bosfor', category: 'international', location: 'Istanbul, Turkiya',
    days: 4, price: 4890000, image: '/assets/istanbul.webp',
    summary: 'Sultonahmet, eski bozorlar va ikki qit’a orasidagi Bosfor manzaralari.',
    itinerary: '1-kun · Istanbulga yetib kelish.\n2-kun · Sultonahmet maydoni va tarixiy markaz.\n3-kun · Bosfor bo‘yida sayr va Misr bozori.\n4-kun · Erkin vaqt va qaytish.',
    included: 'Mehmonxonada 3 kecha\nShahar bo‘ylab ekskursiya\nAeroport transferi',
  },
  {
    id: 'tbilisi', title: 'Tbilisi va Mtsxeta', category: 'international', location: 'Tbilisi, Gruziya',
    days: 4, price: 4290000, image: '/assets/tbilisi.webp',
    summary: 'Tbilisining eski mahallalari, Kavkaz manzaralari va Mtsxetaning tarixiy markazi.',
    itinerary: '1-kun · Tbilisiga yetib kelish.\n2-kun · Eski Tbilisi va Narikala tepaligi.\n3-kun · Mtsxetaga bir kunlik sayohat.\n4-kun · Erkin vaqt va qaytish.',
    included: 'Mehmonxonada 3 kecha\nEkskursiya va gid\nAeroport transferi',
  },
];

export async function ensureCatalog(db) {
  const ready = await db.prepare("SELECT 1 FROM site_settings WHERE key = 'catalog_seeded'").first();
  if (ready) return;
  const createdAt = new Date().toISOString();
  const inserts = sampleTours.map((tour, order) => db.prepare(`
    INSERT INTO tours
      (id, title, category, location, days, price, summary, itinerary, included, image, sample, published, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).bind(
    tour.id, tour.title, tour.category, tour.location, tour.days, tour.price, tour.summary,
    tour.itinerary, tour.included, tour.image, order + 1, createdAt,
  ));
  await db.batch([
    ...inserts,
    db.prepare("INSERT INTO site_settings (key, value) VALUES ('catalog_seeded', '1') ON CONFLICT(key) DO NOTHING"),
  ]);
}
