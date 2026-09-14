# Veritas

Yapay zeka destekli, tarafsız delil/tartışma platformu. İki tarafın delillerini
sunduğu, yapay zekanın delil gücüne göre sıraladığı, güçlü içerik üretenlerin
kazandığı bir sistem.

## Mimari

- **Backend:** NestJS + Prisma + PostgreSQL + Redis (BullMQ) — Railway'de çalışır
- **Web:** React — Vercel'de yayınlanır
- **Mobil:** React Native (Expo) — Android/iOS
- **AI:** Anthropic API ile delil güç puanlaması

## Durum

- [x] Auth & Users modülü (kayıt, giriş, JWT access/refresh token, profil)
- [ ] Topics & Sides & Evidences modülü
- [ ] AI delil puanlama kuyruğu (BullMQ)
- [ ] Realtime yorumlar (Socket.io)
- [ ] Gelir/ödül sistemi
- [ ] Web frontend
- [ ] Mobil uygulama
