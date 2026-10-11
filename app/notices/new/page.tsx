import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NoticeForm } from "@/components/notice-form";
import { PageHeader, SetupNotice } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "공지 올리기" };

export default async function NewNoticePage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fnotices%2Fnew");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="공지사항"
        title="공지 올리기"
        description="청년부 식구들에게 알릴 내용을 적어주세요."
      />
      <NoticeForm canPin={user.role === "admin"} />
    </div>
  );
}
