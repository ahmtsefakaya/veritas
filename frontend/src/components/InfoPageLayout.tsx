import { useEffect, type ReactNode } from 'react';
import AppShell from './AppShell';
import RightRail from './RightRail';
import { PageHeader, MobilePageTitle } from './Tabs';

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
    <AppShell right={<RightRail />}>
      <PageHeader title={title} subtitle={tag} back="/" />
      <MobilePageTitle title={title} subtitle={tag} />
      <p className="border-b border-line px-4 py-4 text-[15px] leading-relaxed text-parchment-dim sm:px-5">
        {intro}
      </p>
      <div className="divide-y divide-line">{children}</div>
    </AppShell>
  );
}

export function InfoSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="px-4 py-5 sm:px-5">
      <h2 className="font-display text-lg text-parchment">{heading}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-parchment-dim">{children}</div>
    </section>
  );
}
