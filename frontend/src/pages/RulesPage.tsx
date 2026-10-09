import InfoPageLayout, { InfoSection } from '../components/InfoPageLayout';

export default function RulesPage() {
  return (
    <InfoPageLayout
      title="Kurallar"
      tag="topluluk kurallari"
      intro="Veritas delil kalitesine dayanir. Asagidaki kurallar platformun bu temelini korur. Kurallari ihlal eden icerik kaldirilabilir, hesap kisitlanabilir."
    >
      <InfoSection heading="Delil kurallari">
        <ul className="list-disc pl-5 space-y-1">
          <li>Dogrulanabilir bir kaynak verin; kaynaksiz iddialar dusuk puan alir.</li>
          <li>Kaynagi carpitmayin, alintiyi baglamindan koparmayin.</li>
          <li>Ayni delili tekrar tekrar eklemeyin.</li>
          <li>Yapay zeka ile uretilmis uydurma kaynak ve baglanti paylasmayin.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="Davranis kurallari">
        <ul className="list-disc pl-5 space-y-1">
          <li>Hakaret, tehdit, nefret soylemi ve taciz yasaktir.</li>
          <li>Baskalarinin ozel bilgilerini paylasmayin.</li>
          <li>Reklam ve istenmeyen tanitim iceriklerine yer yoktur.</li>
          <li>Tartisin, kisileri degil iddialari hedef alin.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="Manipulasyon">
        <ul className="list-disc pl-5 space-y-1">
          <li>Birden fazla hesap acarak oy veya puan toplamak yasaktir.</li>
          <li>Oy ve yorumlar kalite puanini degistirmedigi icin oy orgutlemek sonucu etkilemez.</li>
          <li>Haksiz sikayet gondermek de kural ihlalidir.</li>
          <li>Gunluk dava, delil, yorum ve odul puani kotalari uygulanir.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="Moderasyon">
        <p>
          Yeni davalar yayinlanmadan once incelenir. Sikayet edilen deliller moderasyon kuyruguna
          duser; yeterli sayida farkli kullanici sikayet ederse delil yeniden yapay zeka
          degerlendirmesine girer. Yalnizca yeni yapay zeka analizi puani degistirebilir &mdash;
          yeniden inceleme puani dusurebilecegi gibi yukseltebilir de.
        </p>
        <p>
          Moderasyon islemleri kalite puanini veya odul puanini dogrudan degistirmez. Kisitlanan
          hesaplarin oturumlari sonraki istekte sona erer.
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
