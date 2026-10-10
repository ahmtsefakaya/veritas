import { Link } from 'react-router-dom';

const LINKS: { to: string; label: string }[] = [
  { to: '/how-it-works', label: 'Nasil calisir' },
  { to: '/rules', label: 'Kurallar' },
  { to: '/rewards', label: 'Odul programi' },
  { to: '/terms', label: 'Kullanim sartlari' },
  { to: '/privacy', label: 'Gizlilik' },
];

export default function Footer() {
  return (
    <footer className="border-t border-line mt-12 px-6 py-6">
      <nav className="flex flex-wrap gap-x-4 font-mono text-xs text-parchment-dim">
        {LINKS.map((link) => (
          // py-2: dokunma hedefi. Baglantilar 16px yuksekligindeydi ve
          // telefonda isabet ettirmek zordu.
          <Link key={link.to} to={link.to} className="py-2 hover:text-brass transition-colors">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="font-mono text-xs text-parchment-dim mt-4 leading-relaxed">
        Veritas &middot; delil kalitesini yapay zeka puanlar, oylar puani degistirmez.
      </p>
    </footer>
  );
}
