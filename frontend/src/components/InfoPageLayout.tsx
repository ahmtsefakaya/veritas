import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';

interface Props {
  title: string;
  tag: string;
  intro: string;
  children: ReactNode;
}

export default function InfoPageLayout({ title, tag, intro, children }: Props) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} — Veritas`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-ink text-parchment flex flex-col">
      <header className="border-b border-line px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display text-xl text-brass">
          VERITAS
        </Link>
        <nav className="font-mono text-xs text-parchment-dim">{tag}</nav>
      </header>

      <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        <h1 className="font-display text-3xl text-brass">{title}</h1>
        <p className="text-sm text-parchment-dim mt-3 leading-relaxed">{intro}</p>
        <div className="mt-8 space-y-6">{children}</div>
      </main>

      <div className="max-w-3xl mx-auto w-full">
        <Footer />
      </div>
    </div>
  );
}

export function InfoSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="border border-line rounded p-5">
      <h2 className="font-display text-lg text-brass">{heading}</h2>
      <div className="mt-3 space-y-2 text-sm text-parchment-dim leading-relaxed">{children}</div>
    </section>
  );
}
