import { Link } from 'react-router-dom';
import InfoPageLayout, { InfoSection } from '../components/InfoPageLayout';

export default function HowItWorksPage() {
  return (
    <InfoPageLayout
      title="Nasil calisir"
      tag="nasil calisir"
      intro="Veritas'ta her tartisma bir dava gibi iki tarafa ayrilir. Taraflar delil sunar, yapay zeka her delilin kalitesini olcer. Kazanan taraf kalabaligin degil delilin gucuyle belirlenir."
    >
      <InfoSection heading="1. Dava acilir">
        <p>
          Bir kullanici bir baslik, aciklama, kategori ve iki taraf etiketi yazarak dava acar. Dava
          moderasyon onayindan sonra gundemde gorunur.
        </p>
      </InfoSection>

      <InfoSection heading="2. Delil sunulur">
        <p>
          Giris yapan herkes bir tarafa delil ekleyebilir. Delil metni ve varsa kaynak baglantisi
          istenir. Kaynagi olan, dogrulanabilir ve somut deliller belirgin sekilde daha yuksek
          puan alir.
        </p>
      </InfoSection>

      <InfoSection heading="3. Yapay zeka puanlar">
        <p>
          Her delil kuyruga alinir ve yapay zeka tarafindan 100 uzerinden puanlanir. Puan bes
          bilesene ayrilir:
        </p>
        <ul className="font-mono text-xs space-y-1 mt-2">
          <li>kaynak guvenilirligi &mdash; 35</li>
          <li>dogrulanabilirlik &mdash; 25</li>
          <li>konuya alaka &mdash; 20</li>
          <li>somutluk &mdash; 15</li>
          <li>guncellik ve baglam &mdash; 5</li>
        </ul>
        <p>
          Puanla birlikte yapay zekanin gerekcesi de yayinlanir, boylece puanin nedeni gorulebilir.
        </p>
      </InfoSection>

      <InfoSection heading="4. Oylar ve yorumlar puani degistirmez">
        <p>
          Kullanici oylari ve yorumlar delil kalite puanini ve odul puanini <strong>etkilemez</strong>.
          Oylar yalnizca topluluk gorusunu gosterir; sikayetler ise bir delili yeniden
          degerlendirmeye sokabilen inceleme sinyalidir. Bu sayede orgutlu oy gruplari sonucu
          degistiremez.
        </p>
      </InfoSection>

      <InfoSection heading="5. Taraf toplami ve onde olan taraf">
        <p>
          Her tarafin puani, o tarafa sunulan delillerin kalite puanlarindan olusur. Toplami yuksek
          olan taraf davada onde gorunur.
        </p>
      </InfoSection>

      <InfoSection heading="6. Odul puani">
        <p>
          Kaliteli delil odul puani kazandirir: 60-69 icin 4, 70-79 icin 8, 80-89 icin 12, 90-100
          icin 20 puan. Ayrintilar ve odeme uygunlugu sartlari{' '}
          <Link to="/rewards" className="text-brass underline">
            odul programi
          </Link>{' '}
          sayfasindadir.
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
