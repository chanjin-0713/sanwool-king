"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_LINKS } from "@/lib/site";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="주요 메뉴">
      <ul className="flex min-w-max items-center gap-0.5">
        {NAV_LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-brand-soft text-brand-dark"
                    : "text-ink-soft hover:bg-surface-soft hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
