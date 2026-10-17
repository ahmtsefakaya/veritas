# Katkı rehberi

1. Her iş için `main`'den dal aç: `feat/...`, `fix/...`, `chore/...`, `docs/...`, `test/...`, `refactor/...` — `main`'e doğrudan push yok.
2. Commit mesajı Türkçe ve ne değiştiğini anlatır (örnek: `Mobil uyum: telefonda giriş yapılamıyordu`); tek iş = tek commit.
3. Göndermeden önce `cd backend && npm ci && npm run lint && npm test && npm run test:e2e` yeşil olmalı; CI aynılarını `main`'e açılan PR'da tekrar koşar (`.github/workflows/ci.yml`).
4. Backend davranışı değiştiyse `cd backend && node test/live-journey.mjs` (34 kontrol) koş ve çıktıyı PR'a ekle.
5. Şema, ortam değişkeni, deploy ayarı veya ödeme akışına dokunan değişiklik PR'da ayrıca belirtilir ve proje sahibinin onayı olmadan birleştirilmez.
