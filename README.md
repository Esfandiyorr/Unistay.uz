# Unistay

Surxondaryo va xorijiy turpaketlar katalogi. Mijoz safar sanasi hamda kishilar sonini tanlaydi, bron so‘rovini yuboradi va kod orqali holatini tekshiradi. Admin turpaketlar, rasmlar, to‘lov rekvizitlari va bronlarni boshqaradi.

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
