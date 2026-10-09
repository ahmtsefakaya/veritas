import InfoPageLayout, { InfoSection } from '../components/InfoPageLayout';

export default function PrivacyPage() {
  return (
    <InfoPageLayout
      title="Gizlilik"
      tag="gizlilik politikasi"
      intro="Veritas yalnizca platformun calismasi icin gereken verileri toplar. Bu sayfa hangi verinin neden tutuldugunu ve ne kadar sure sakladigimizi anlatir."
    >
      <InfoSection heading="Toplanan veriler">
        <ul className="list-disc pl-5 space-y-1">
          <li>Hesap verileri: e-posta adresi, kullanici adi, gorunen ad, biyografi, avatar
            baglantisi ve secilen ulke kodu.</li>
          <li>Icerik: actiginiz davalar, sundugunuz deliller, yorumlar, oylar ve sikayetler.</li>
          <li>Teknik veriler: kotuye kullanimi onlemek icin istek hizi ve IP bazli limit kayitlari.</li>
        </ul>
        <p>
          Sifreniz yalnizca geri dondurulemez bir ozet (hash) olarak saklanir. E-posta dogrulama ve
          sifre sifirlama jetonlari da yalnizca SHA-256 ozeti olarak tutulur, tek kullanimliktir ve
          suresi dolunca gecersizlesir.
        </p>
      </InfoSection>

      <InfoSection heading="Kullanim amaci">
        <ul className="list-disc pl-5 space-y-1">
          <li>Hesabinizi olusturmak ve oturumunuzu surdurmek.</li>
          <li>Delilleri yapay zeka ile puanlamak ve itibar/odul puanini hesaplamak.</li>
          <li>Bildirim gondermek, kurallari uygulamak ve kotuye kullanimi engellemek.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="Ucuncu taraflar">
        <p>
          Delil metinleri puanlama icin OpenAI&apos;a (gpt-4o-mini) gonderilir. E-posta gonderimi
          yapilandirilmis bir SMTP saglayicisi uzerinden yapilir. Uygulama altyapisi Railway ve
          Vercel uzerinde barindirilir. Verilerinizi reklam amaciyla ucuncu taraflara satmiyoruz.
        </p>
      </InfoSection>

      <InfoSection heading="Herkese acik olan veriler">
        <p>
          Kullanici adiniz, gorunen adiniz, biyografiniz, actiginiz davalar, delilleriniz,
          yorumlariniz, itibar puaniniz ve siralamadaki yeriniz herkese aciktir. E-posta adresiniz,
          ulke kodunuz ve odeme uygunlugu ayrintilariniz yalnizca size gosterilir.
        </p>
      </InfoSection>

      <InfoSection heading="Saklama ve silme">
        <p>
          Silinen yorumlar iplik yapisini korumak icin yazar ve icerik bilgisi dondurulmeden tutulur.
          Odul puani hareketleri denetlenebilirlik icin degistirilemez bir kayit defterinde saklanir.
          Hesabinizin ve verilerinizin silinmesini talep etmek icin bizimle iletisime gecebilirsiniz.
        </p>
      </InfoSection>

      <InfoSection heading="Cerezler">
        <p>
          Reklam veya takip cerezi kullanmiyoruz. Oturum bilgileri tarayicinizin yerel depolamasinda
          (localStorage) tutulur ve cikis yaptiginizda silinir.
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
