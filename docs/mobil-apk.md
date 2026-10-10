# Mobil uygulama: gercek APK uretme (EAS)

Bu belge, Ahmet'in telefonuna kurabilecegi **gercek bir APK** uretmek icin
gereken adimlari anlatir. Yapilandirma (`app.json`, `eas.json`) hazir ve
Expo'nun kendi semasiyla dogrulanmis durumda; eksik olan tek sey **Expo hesabi
girisi**, cunku derleme Expo'nun bulut sunucularinda kosar.

## Hazir olan ve dogrulanan yapilandirma

`eas.json` uc profil tanimlar. Expo'nun `@expo/eas-json` semasiyla dogrulandi:

| Profil | Dagitim | Android cikti | Ne ise yarar |
|---|---|---|---|
| `development` | internal | **apk** | Gelistirme istemcisi (dev client), canli yeniden yukleme |
| `preview` | internal | **apk** | **Telefona elle kurulacak APK — Ahmet'in istedigi bu** |
| `production` | store | app-bundle (`.aab`) | Google Play'e yukleme |

> **Onemli:** EAS'in Android varsayilani `.aab`'dir ve `.aab` telefona elle
> KURULAMAZ, yalnizca Play Store'a yuklenir. Bu yuzden `preview` profilinde
> `"buildType": "apk"` acikca belirtildi.

Her profil `EXPO_PUBLIC_API_URL` degerini canli backend'e ayarlar, boylece
derlenen uygulama dogru API'ye baglanir:
`https://veritas-production-aa2b.up.railway.app`

`app.json` tarafinda derleme icin zorunlu olan alanlar dolduruldu:

- `android.package` / `ios.bundleIdentifier`: `com.kayaglobal.veritas`
  (varsayilan iskelet bunlari icermiyordu; ikisi olmadan EAS derleme yapmaz)
- `android.versionCode`, `ios.buildNumber`
- `name`: "Veritas", `slug`: "veritas" (onceden "mobile" idi)
- `scheme`: "veritas" (derin baglanti ve dev client icin gerekli)

## APK uretme adimlari

Expo hesabi girisi gerektirdigi icin bu adimlari Ahmet kendi calistirmali.

```bash
cd mobile
npm i -g eas-cli            # veya: npx eas-cli@latest

eas login                   # Expo hesabi (ucretsiz) -- INSAN ADIMI
eas init                    # projeyi Expo'ya baglar, app.json'a
                            # extra.eas.projectId ekler (commit edilmeli)

eas build --platform android --profile preview
```

Derleme Expo bulutunda ~10-20 dakika surer. Bitince terminalde bir indirme
baglantisi verir; ayrica `eas build:list` ile de gorulebilir. `.apk` dosyasini
telefona indirip acmak yeterli (Android "bilinmeyen kaynaklardan kuruluma izin
ver" onayi isteyecek).

Imzalama anahtari ilk derlemede Expo tarafindan otomatik uretilip saklanir
(`eas credentials` ile gorulebilir); elle bir sey yapmak gerekmez.

### Yerel derleme (Expo bulutu olmadan)

Android SDK + JDK kurulu bir makinede bulut olmadan da derlenebilir:

```bash
eas build --platform android --profile preview --local
```

Bu yol da `eas login` ister ama derleme kendi makinede kosar.

## Durum ve sinirlar

- Yapilandirma dogrulandi: `npx expo config --type public` temiz cozuluyor
  (SDK 57), `eas.json` Expo'nun semasindan gecti, `npm run typecheck` ve
  `npm run build:web` temiz.
- **Dogrulanmayan:** gercek bir APK uretilip telefona kurulmadi. Bu yalnizca
  Expo hesabi girisiyle yapilabilir ve kimlik bilgisi istemek kapsam disinda
  birakildi. Yapilandirmanin dogru oldugu semayla kanitlandi, ama "APK calisti"
  iddiasi ancak derlemeden sonra yapilabilir.
- `extra.eas.projectId` henuz yok; `eas init` onu ekleyecek. O satir
  commit edilmeli, yoksa her derlemede proje yeniden baglanmak ister.
- Bildirim (push notification) yapilandirilmadi; uygulama icindeki bildirimler
  API'den okunuyor, isletim sistemi bildirimi icin ayrica `expo-notifications`
  ve bir kimlik bilgisi gerekir.
