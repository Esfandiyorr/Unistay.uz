# Unistay

Surxondaryo va xorijiy turpaketlar katalogi. Mijoz safar sanasi hamda kishilar sonini tanlaydi, bron so‘rovini yuboradi va kod orqali holatini tekshiradi. Admin turpaketlar, rasmlar, to‘lov rekvizitlari va bronlarni boshqaradi.

[Unistay bronlash saytini ochish](https://unistay-turlar.sturdyfig15.chatgpt.site)

## Boshqarish

- `/admin` sahifasiga sayt egasining ChatGPT hisobi bilan kiring.
- **Turpaketlar** bo‘limida paket qo‘shing, JPG, PNG yoki WebP rasm yuklang va kerakli paketlarni e’lon qiling.
- **To‘lov sozlamalari** bo‘limida oluvchi nomi, hisob raqami va mijozga ko‘rsatmani saqlang. Faol paketlarda shu rekvizitlar chiqadi.
- **Bronlar** bo‘limida so‘rovni ko‘ring, safarni tasdiqlang yoki bekor qiling. Pul tushganini tekshirgandan keyin to‘lov holatini belgilang.

Boshlang‘ich katalogdagi marshrutlar, narxlar va rasmlar namunaviy. Namunaviy paketlar sinov bronini qabul qiladi va haqiqiy to‘lov rekvizitlarini ko‘rsatmaydi. Haqiqiy paket e’lon qilish uchun ma’lumotlarni tekshirib, turpaket sozlamasidagi **Namunaviy tur sifatida ko‘rsatish** belgisini olib tashlang.

## Ishga tushirish

Node.js 22 yoki yangirog‘i bilan:

```bash
npm ci
npm run dev
```

`npm run dev` Worker’ni yig‘adi va mahalliy D1 migratsiyalarini qo‘llaydi. Odatdagi manzil `http://127.0.0.1:4173`. Mahalliy ishga tushirish katalog va bron shaklini sinash uchun yetarli. Admin kirishi Sites tomonidan tekshirilgan ChatGPT sessiyasidan foydalanadi.

Yig‘ilgan Worker `dist/server/index.js` da, D1 migratsiyalari `drizzle/` da. Hosting `DB` (D1) va `BUCKET` (R2) ulanishlarini hamda egasining elektron pochtasini saqlaydigan `UNISTAY_ADMIN_EMAIL` server qiymatini taqdim etadi. Admin identifikatsiyasi uchun ishonchli Sites dispatch qatlami `oai-authenticated-user-id` va `oai-authenticated-user-email` sarlavhalarini o‘zi biriktiradi. Boshqa hostingga ko‘chirishda o‘sha hosting uchun autentifikatsiya qatlamini moslang.

Sayt brauzerdan to‘lov kartasi ma’lumotlarini olmaydi. Bank o‘tkazmasini admin qo‘lda tekshiradi. GitHub repozitoriysi kodni saqlaydi, sayt esa serverda ishlaydigan Worker’ni talab qiladi.

## Kodni GitHub’ga sinxronlash

ChatGPT Sites manba repozitoriysini ochgandan keyin `npm run git:sync` ni ishga tushiring. Shu ish nusxasidan `git push origin main` kodni Sites manbasiga va `Esfandiyorr/Unistay.uz` repozitoriysiga bir xil commit bilan yuboradi. Ikki repozitoriyda ham commit saqlanganini tekshirib, o‘sha commit asosida Sites’da yangi versiyani nashr qiling.

## Cloudflare Workers’ga ko‘chirish

Xuddi shu Worker Cloudflare’da ham ishlaydi: D1 (`unistay-db`) va R2 (`unistay-media`) to‘g‘ridan-to‘g‘ri ishlatiladi, rasmlar va uslublar Workers Static Assets orqali beriladi. Admin panelga **Google hisobi** bilan kiriladi. Buni `wrangler.json` dagi `ADMIN_AUTH = "google"` yoqadi: bu rejimda tashqaridan kelgan `oai-authenticated-*` sarlavhalari olib tashlanadi va faqat `UNISTAY_ADMIN_EMAIL` dagi manzillar kira oladi. ChatGPT Sites’da bu qiymat yo‘q, u yerda kirish avvalgidek ishlaydi.

### 1. GitHub’dan Cloudflare’ga ulash

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Import a repository** → GitHub orqali `Esfandiyorr/Unistay.uz` ni tanlang.
2. Sozlamalar:
   - **Project name:** `unistay` (`wrangler.json` dagi nom bilan bir xil bo‘lishi shart)
   - **Build command:** bo‘sh qoldiring
   - **Deploy command:** `npm run deploy:cloudflare`
3. **Deploy**. Skript `unistay-db` D1 bazasini nomi bo‘yicha topadi yoki yaratadi, `drizzle/` migratsiyalarini qo‘llaydi va Worker’ni joylaydi. `unistay-media` R2 ombori birinchi deploy’da o‘zi yaratiladi. Shu nomli baza va ombor oldindan yaratilgan bo‘lsa, ular ishlatiladi.
4. Bundan keyin `main` ga yuborilgan har bir commit avtomatik deploy qilinadi.

### 2. Google orqali admin kirishi

1. [Google Cloud Console](https://console.cloud.google.com/) → yangi loyiha → **Google Auth Platform**: ilova nomi `Unistay`, turi **External**. **Audience** bo‘limida o‘z Gmail manzilingizni **Test users** ga qo‘shing (yoki ilovani **Publish** qiling; `openid` va `email` uchun tekshiruv talab qilinmaydi).
2. **Clients** → **Create client** → **Web application** → **Authorized redirect URIs**:
   - `https://unistay.<hisobingiz>.workers.dev/admin/google/callback`
   - `https://unistay.uz/admin/google/callback` (domen ulangandan keyin)
3. Cloudflare → Worker `unistay` → **Settings → Variables and Secrets** → har birini **Secret** turida qo‘shing:

   | Nomi | Qiymati |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | Google bergan Client ID |
   | `GOOGLE_CLIENT_SECRET` | Google bergan Client secret |
   | `UNISTAY_ADMIN_EMAIL` | Admin Gmail manzili (bir nechta bo‘lsa vergul bilan) |
   | `SESSION_SECRET` | Ixtiyoriy: uzun tasodifiy matn; o‘zgartirilsa, barcha admin sessiyalari tugaydi |

4. `/admin` → **Google orqali kirish**.

### 3. unistay.uz domeni

Domen Cloudflare’ga qo‘shilgan bo‘lishi kerak (**Add a domain** → Cloudflare bergan nameserver’larni domen sotib olingan joyda kiriting). So‘ng Worker → **Settings → Domains & Routes** → **Add** → **Custom domain** → `unistay.uz`.

### Eslatmalar

- Yangi D1 bazasi bo‘sh boshlanadi: 5 ta boshlang‘ich tur **Namuna** bo‘lib chiqadi, to‘lov sozlamalari bo‘sh. Sites’dagi bronlar va rekvizitlar o‘zi ko‘chmaydi. Admin panelda **To‘lov sozlamalari** ni to‘ldiring va turlardagi **Namunaviy tur sifatida ko‘rsatish** belgisini olib tashlang. Bronlar eksport fayli bo‘lsa, uni `npx wrangler d1 execute unistay-db --remote --file=<fayl>.sql` bilan yuklash mumkin. Mijozlar ma’lumoti bor faylni GitHub’ga qo‘shmang.
- Mahalliy sinov: `npm run build:cloudflare`, keyin `npx wrangler d1 migrations apply unistay-db --local` va `npx wrangler dev --local`. Google qiymatlarini `.dev.vars` fayliga yozing (u GitHub’ga yuborilmaydi).
