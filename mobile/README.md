# Veritas Mobil

Veritas'in React Native (Expo) istemcisi. Web uygulamasiyla ayni backend'i
kullanir: `https://veritas-production-aa2b.up.railway.app`

## Ekranlar

| Sekme | Ne yapar |
|---|---|
| Gundem | Dava listesi, arama, kategori filtresi, sayfalama; davaya girer |
| Dava detayi | Taraflar, guc puani, kanitlar, kalite bilesenleri, oy verme |
| Odul | Puan kazanim tablosu ve odeme uygunluk kontrol listesi |
| Bildirim | Bildirim listesi, okundu isaretleme |
| Giris/Hesap | Kayit, giris, cikis |

## Calistirma

```bash
npm install
npm start          # Expo Go ile telefonda ac
npm run android    # Android emulator
npm run ios        # iOS simulator (macOS)
```

Baska bir backend'e baglanmak icin:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3001 npm start
```

Adres verilmezse canli backend kullanilir.

## Dogrulama

```bash
npm run typecheck    # TypeScript
npm run build:web    # web bundle derlenebiliyor mu
npm run verify:api   # canli API sozlesmesi ekranlarin bekledigi alanlari donuyor mu
```

`verify:api` betigi, her ekranin okudugu alanlari canli backend'e karsi tek tek
kontrol eder; bir alan API'den kalkarsa derleme degil bu betik yakalar.

## Oturum yonetimi

Token'lar AsyncStorage'da tutulur. Access token 15 dakikada dolar; uygulama
acilisinda once mevcut token denenir, reddedilirse refresh token ile yenilenir,
ikisi de gecersizse oturum temizlenir.

## Not: CORS

Canli API yalnizca web uygulamasinin adresine CORS izni verir. Bu nedenle
`expo start --web` ile tarayicida calistirinca istekler engellenir; native
derlemelerde CORS diye bir kavram olmadigi icin sorun cikmaz. Tarayicida
denemek isterseniz yerel bir backend adresi verin.
