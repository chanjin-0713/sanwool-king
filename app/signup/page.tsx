import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/signup-form";
import { SetupNotice } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/");

  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-2">Sanwool King</p>
        <h1 className="font-display text-3xl text-ink">회원가입</h1>
        <p className="text-ko mt-3 text-sm leading-relaxed text-ink-soft">
          가입하면 공지와 사진, 일정을 직접 올릴 수 있어요.
        </p>
      </div>

      <div className="card px-6 py-7 sm:px-8">
        <SignupForm next={target} />
      </div>
    </div>
  );
}
