import { useEffect } from 'react';

const BASE = 'Veritas';

/**
 * Sayfa basligini rota basina ayarlar.
 *
 * Tek sayfa uygulamasinda <title> sabit kaldigi icin tarayici sekmesi,
 * gecmis kaydi ve paylasilan baglanti hep ayni metni gosteriyordu; ekran
 * okuyucu da rota degisimini duyurmuyordu. `null` verilirse (veri henuz
 * yuklenmediyse) baslik degistirilmez.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} — ${BASE}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export default useDocumentTitle;
