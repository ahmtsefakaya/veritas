/*
  Veritas ikon seti.

  Hepsi bu dosyada elle cizilmis `stroke` tabanli yollardir; ucuncu taraf bir
  ikon kutuphanesinden veya bir uygulamanin varliklarindan kopyalanmamistir.
  Tek bir `Icon` bileseni kullanilir ki kalinlik/boyut tek yerden degissin.
*/

export type IconName =
  | 'gundem'
  | 'kesfet'
  | 'bildirim'
  | 'profil'
  | 'siralama'
  | 'odul'
  | 'ayarlar'
  | 'moderasyon'
  | 'dava-ac'
  | 'ara'
  | 'yorum'
  | 'delil'
  | 'yukari'
  | 'asagi'
  | 'paylas'
  | 'kaydet'
  | 'terazi'
  | 'kapat'
  | 'geri'
  | 'cikis';

const PATHS: Record<IconName, string> = {
  // Ev: catı + govde
  gundem: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  // Kesfet: buyutec + ic cizgiler
  kesfet: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  // Bildirim: can
  bildirim: 'M12 3a5 5 0 0 0-5 5c0 4-2 5-2 7h14c0-2-2-3-2-7a5 5 0 0 0-5-5ZM10 19a2 2 0 0 0 4 0',
  // Profil: bas + omuz
  profil: 'M12 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5',
  // Siralama: ucgen podyum cubuklari
  siralama: 'M4 20V12h4v8M10 20V5h4v15M16 20v-6h4v6',
  // Odul: madalya
  odul: 'M12 3 9 9h6l-3-6ZM12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 14v3M10.5 15.5h3',
  // Ayarlar: kaydirici
  ayarlar: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 4v6M8 14v6',
  // Moderasyon: kalkan + onay
  moderasyon: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3ZM9 12l2 2 4-4',
  // Dava ac: arti
  'dava-ac': 'M12 5v14M5 12h14',
  ara: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  // Yorum: konusma balonu
  yorum: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V6Z',
  // Delil: belge + katlanmis kose
  delil: 'M6 3h8l4 4v14H6V3ZM14 3v4h4M9 12h6M9 16h4',
  yukari: 'M12 19V6M6 12l6-6 6 6',
  asagi: 'M12 5v13M6 12l6 6 6-6',
  // Paylas: cikan ok
  paylas: 'M12 16V4M8 8l4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
  // Kaydet: yer imi
  kaydet: 'M7 4h10v16l-5-4-5 4V4Z',
  // Terazi: Veritas amblemi
  terazi: 'M12 4v16M8 20h8M4 9h16M7 9l-3 5h6l-3-5ZM17 9l-3 5h6l-3-5Z',
  kapat: 'M6 6l12 12M18 6 6 18',
  geri: 'M19 12H5M11 6l-6 6 6 6',
  cikis: 'M14 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M10 12h10M17 9l3 3-3 3',
};

interface IconProps {
  name: IconName;
  className?: string;
  /** Dolgulu hali: aktif gezinme ogesi icin */
  filled?: boolean;
  strokeWidth?: number;
}

export default function Icon({ name, className = 'w-6 h-6', filled = false, strokeWidth }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? (filled ? 2.4 : 1.7)}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
