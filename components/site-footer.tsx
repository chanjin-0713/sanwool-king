import Link from "next/link";

import { NAV_LINKS, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface-soft">
      <div className="mx-auto w-full max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <p className="font-display text-2xl tracking-wide text-ink">
              {SITE.name}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{SITE.nameKo}</p>
            <blockquote className="text-ko mt-5 border-l-2 border-brand/40 pl-4 text-sm italic leading-relaxed text-ink-soft">
              “{SITE.verse.text}”
              <footer className="mt-1.5 text-xs not-italic text-ink-faint">
                — {SITE.verse.ref}
              </footer>
            </blockquote>
          </div>

          <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
                메뉴
              </p>
              <ul className="space-y-2 text-sm">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-ink-soft transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="max-w-xs">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
                찾아오는 길 · 문의
              </p>
              <p className="text-ko text-sm leading-relaxed text-ink-soft">
                {SITE.contact.place}
                <br />
                {SITE.contact.inquiry}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-ink-faint">
          © {SITE.church} {SITE.nameKo}
        </p>
      </div>
    </footer>
  );
}
