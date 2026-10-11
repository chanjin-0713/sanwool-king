import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { MainNav } from "@/components/main-nav";
import { SubmitButton } from "@/components/submit-button";
import { SITE } from "@/lib/site";
import { getCurrentUser } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="flex items-center justify-between gap-4 py-3.5">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold tracking-tight text-white">
              SK
            </span>
            <span className="leading-tight">
              <span className="font-display block text-xl tracking-wide text-ink">
                {SITE.name}
              </span>
              <span className="block text-[11px] tracking-[0.2em] text-ink-faint">
                {SITE.nameKo}
              </span>
            </span>
          </Link>

          <div className="hidden lg:block">
            <MainNav />
          </div>

          {user ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center text-sm text-ink-soft sm:inline-flex">
                <strong className="font-semibold text-ink">{user.name}</strong>
                <span>님</span>
                {user.role === "admin" ? (
                  <span className="chip ml-2 bg-gold-soft text-gold">관리자</span>
                ) : null}
              </span>
              <form action={signOutAction}>
                <SubmitButton
                  className="btn-ghost px-3.5 py-1.5 text-xs"
                  pendingLabel="…"
                >
                  로그아웃
                </SubmitButton>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-primary shrink-0 px-4 py-1.5 text-xs"
            >
              로그인
            </Link>
          )}
        </div>

        <div className="-mx-5 overflow-x-auto px-5 pb-2 lg:hidden">
          <MainNav />
        </div>
      </div>
    </header>
  );
}
