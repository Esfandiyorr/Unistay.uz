# Unistay’ni Cloudflare’ga ko‘chirish

## Resurslar

Cloudflare hisobida Unistay uchun alohida `unistayuz` D1 bazasi va
`unistay-media` R2 omborini yarating. Worker nomi `unistay-uz`. Birinchi
deploydan oldin shu nomdagi Worker boshqa loyihada ishlatilmasligini tekshiring.

Cloudflare Zero Trust’da Unistay domenining `/admin` va ichki admin yo‘llarini
qamrab oladigan Self-hosted Access ilovasini va administrator emailiga ruxsat
beradigan siyosatni yarating. Ilovaning Application Audience (AUD) qiymati va
`<team>.cloudflareaccess.com` manzilidagi `<team>` nomi kerak bo‘ladi.

## Build va deploy

Node.js 22 yoki yangirog‘idan foydalaning. Buyruqlarni repo ildizida, kerakli
Cloudflare hisobida autentifikatsiyadan o‘tgan terminalda bajaring.

```bash
npm ci
# UNISTAY_D1_DATABASE_ID o‘zgaruvchisiga unistayuz ID qiymatini bering.
npm run build:cloudflare
npx wrangler d1 migrations apply DB --config dist/server/wrangler.cloudflare.json --remote
npx wrangler deploy --config dist/server/wrangler.cloudflare.json
```

Worker sozlamalariga `UNISTAY_ACCESS_TEAM`, `UNISTAY_ACCESS_AUD` va
`UNISTAY_ADMIN_EMAIL` qiymatlarini kiriting. Worker Access imzosi,
auditoriyasi, emitenti, amal qilish muddati va administrator emailini tekshiradi.
Build konfiguratsiyasi `workers.dev` va preview manzillarini o‘chiradi.
Access siyosati va Worker sozlamalari tayyor bo‘lgach, alohida sinov
subdomenini Worker’ga ulang va Access ilovasiga shu subdomenning admin
yo‘llarini ham kiriting.

GitHub’dan avtomatik deploy sozlanganda Cloudflare Workers Builds’da
`Esfandiyorr/Unistay.uz` repozitoriysining `cloudflare-migration` tarmog‘ini tanlang.
Build o‘zgaruvchilarida `UNISTAY_D1_DATABASE_ID` qiymatini belgilang,
build buyrug‘i uchun `npm run build:cloudflare`, deploy uchun esa
`npx wrangler deploy --config dist/server/wrangler.cloudflare.json` ishlating.
D1 migratsiyalarini deploydan oldin alohida boshqaring.

## Ma’lumotlar va o‘tish

1. Sites’dagi D1 ma’lumotlari va R2 rasmlarini himoyalangan joyga eksport qiling.
   D1 eksportini yangi bazaga moslashtirish uchun uning sxemasi va migratsiya
   tarixini tekshiring. GitHub repozitoriysiga mijoz ma’lumotlari, to‘lov
   sozlamalari yoki eksport fayllarini joylamang.
2. Yangi bazaga ma’lumotlarni import qiling va rasmlarni R2’ga asl obyekt
   kalitlari bilan ko‘chiring. Katalog sahifalarini ochishdan oldin import
   qiling, chunki sayt bo‘sh katalogga namunaviy turlar qo‘shadi.
3. Sinov domenida katalog, yuklangan rasmlar, bron yuborish, bron holatini
   tekshirish va Cloudflare Access orqali admin kirishini sinang. Begona
   email bilan admin kirishi rad etilishini tekshiring.
4. Yakuniy eksport va domenni almashtirish orasida yangi bronlar eski bazaga
   tushib qolmasligi uchun o‘tish vaqtini kelishing. Yakuniy importdan keyin
   hozirgi jonli domenni yo‘naltiring va yangi saytda asosiy amallarni
   qayta tekshiring.
