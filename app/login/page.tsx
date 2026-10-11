import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { Alert, SetupNotice } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/");

  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-2">Sanwool King</p>
        <h1 className="font-display text-3xl text-ink">로그인</h1>
        <p className="text-ko mt-3 text-sm leading-relaxed text-ink-soft">
          사진첩과 주보는 청년부 식구들만 볼 수 있어요.
        </p>
      </div>

      <div className="card px-6 py-7 sm:px-8">
        {error ? (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        <LoginForm next={target} />
      </div>
    </div>
  );
}
