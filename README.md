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

## Vercel’da ishga tushirish

Sayt ChatGPT Sites’dan tashqari Vercel’da ham ishlaydi. `worker/` kodi o‘zgarmaydi. `vercel/` papkasidagi adapter uni bitta Vercel funksiyasi sifatida ishga tushiradi:

- D1 o‘rniga **Turso** (libSQL, SQLite bilan mos) ishlatiladi. `drizzle/` migratsiyalari birinchi so‘rovda avtomatik qo‘llanadi.
- Yuklangan turpaket rasmlari ham shu Turso bazasida saqlanadi (R2 o‘rniga).
- Admin panelga **Google hisobi** orqali kiriladi. Faqat `UNISTAY_ADMIN_EMAIL` dagi manzillarga ruxsat beriladi.
- `assets/` fayllari Vercel CDN orqali beriladi. Build: `npm run build:vercel` (`.vercel/output`, Build Output API).

### 1. Vercel loyihasi va baza

1. [vercel.com/new](https://vercel.com/new) → `Esfandiyorr/Unistay.uz` repozitoriysini **Import** qiling. Sozlamalar `vercel.json` da bor, hech narsani o‘zgartirmasdan **Deploy** bosing.
2. Loyiha → **Storage** → **Create Database** → **Turso** → bazani yarating va shu loyihaga ulang. Vercel `TURSO_DATABASE_URL` va `TURSO_AUTH_TOKEN` qiymatlarini o‘zi qo‘shadi. (Bazani [turso.tech](https://turso.tech) da yaratsangiz, shu ikki qiymatni **Settings → Environment Variables** ga qo‘lda kiriting.)

### 2. Google orqali admin kirishi

1. [Google Cloud Console](https://console.cloud.google.com/) → yangi loyiha yarating → **Google Auth Platform** (OAuth consent screen): ilova nomi `Unistay`, turi **External**. **Audience** bo‘limida o‘z Gmail manzilingizni **Test users** ga qo‘shing (yoki ilovani **Publish** qiling; `openid` va `email` uchun tekshiruv talab qilinmaydi).
2. **Clients** → **Create client** → **Web application**. **Authorized redirect URIs** ga sayt ochiladigan har bir manzil uchun qo‘shing:
   - `https://<loyiha>.vercel.app/admin/google/callback`
   - `https://unistay.uz/admin/google/callback` (domen ulangandan keyin)
3. Vercel → **Settings → Environment Variables**:

   | Nomi | Qiymati |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | Google bergan Client ID |
   | `GOOGLE_CLIENT_SECRET` | Google bergan Client secret |
   | `UNISTAY_ADMIN_EMAIL` | Admin Gmail manzili (bir nechta bo‘lsa vergul bilan) |
   | `SESSION_SECRET` | Ixtiyoriy: uzun tasodifiy matn. O‘zgartirilsa, barcha admin sessiyalari tugaydi |

4. **Deployments** → oxirgi deploy → **Redeploy**. So‘ng `/admin` → **Google orqali kirish**.

### 3. unistay.uz domeni

Vercel → **Settings → Domains** → `unistay.uz` ni qo‘shing va Vercel ko‘rsatgan DNS yozuvlarini domen sotib olingan joyda kiriting.

### Eslatmalar

- Yangi Turso bazasi bo‘sh boshlanadi: 5 ta boshlang‘ich tur **Namuna** bo‘lib chiqadi, to‘lov sozlamalari bo‘sh. ChatGPT Sites bazasidagi bronlar va rekvizitlar avtomatik ko‘chmaydi. Admin panelda **To‘lov sozlamalari** ni to‘ldiring va turlardagi **Namunaviy tur sifatida ko‘rsatish** belgisini olib tashlang.
- Vercel funksiyasiga yuboriladigan so‘rov 4,5 MB bilan cheklangan, shuning uchun Vercel’da rasmlarni 4 MB gacha yuklang.
- Funksiya va Turso bazasi bir hududda bo‘lsa, sayt tezroq ishlaydi (masalan, Vercel **Settings → Functions → Function Region** va Turso bazasi ikkalasi Frankfurt).
- Mahalliy sinov: `.env.example` ni `.env.local` ga nusxalang va `npm run dev:vercel` ni ishga tushiring (`http://127.0.0.1:4174`, Turso o‘rniga SQLite fayl).
