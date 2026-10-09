import { Link } from 'react-router-dom';
import InfoPageLayout, { InfoSection } from '../components/InfoPageLayout';

export default function TermsPage() {
  return (
    <InfoPageLayout
      title="Kullanim sartlari"
      tag="kullanim sartlari"
      intro="Veritas'i kullanarak bu sartlari kabul etmis olursunuz. Sartlar platformun amacini ve taraflarin sorumluluklarini tanimlar."
    >
      <InfoSection heading="Hesap">
        <p>
          Hesabinizin guvenliginden siz sorumlusunuz. Tek kisi tek hesap kullanir; birden fazla hesap
          acarak sistemi etkilemeye calismak hesabin kapatilmasina yol acar.
        </p>
      </InfoSection>

      <InfoSection heading="Icerik ve haklar">
        <p>
          Paylastiginiz icerigin size ait oldugunu veya paylasma hakkiniz oldugunu beyan edersiniz.
          Icerigin telif hakki sizde kalir; Veritas&apos;a icerigi platformda gosterme ve
          puanlama/isleme hakki verirsiniz. Kurallara aykiri icerik kaldirilabilir.
        </p>
      </InfoSection>

      <InfoSection heading="Yapay zeka puanlamasi">
        <p>
          Delil puanlari bir yapay zeka modeli tarafindan uretilir ve hata icerebilir. Puanlar bir
          gorus olup hukuki ya da bilimsel bir kesinlik iddiasi tasimaz. Puanlamanin tek belirleyicisi
          delil ve kaynaklardir; kullanici oylari ve yorumlari puani degistirmez.
        </p>
      </InfoSection>

      <InfoSection heading="Odul puani">
        <p>
          Odul puani yalnizca uygulama ici bir puandir. Su an para, kripto para veya baska bir
          ekonomik degere donusturulemez ve bir alacak hakki dogurmaz. Odeme altyapisi acilirsa{' '}
          <Link to="/rewards" className="text-brass underline">
            odul programi
          </Link>{' '}
          sayfasindaki uygunluk sartlarinin tamami ayni anda saglanmak zorundadir. Hile tespit edilen
          hesaplarin puanlari iptal edilebilir.
        </p>
      </InfoSection>

      <InfoSection heading="Hizmetin sunumu">
        <p>
          Veritas &quot;oldugu gibi&quot; sunulur. Kesintisiz veya hatasiz calisma garantisi
          verilmez; hizmet, ozellikler ve bu sartlar onceden bildirilmeksizin degistirilebilir.
          Platformun kullanimindan dogan dolayli zararlardan sorumluluk kabul edilmez.
        </p>
      </InfoSection>

      <InfoSection heading="Hesabin kapatilmasi">
        <p>
          Kurallari ihlal eden hesaplar kisitlanabilir veya kapatilabilir. Diledigeniz zaman
          kullanmayi birakabilir, hesabinizin silinmesini talep edebilirsiniz.
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
