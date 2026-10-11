"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toKoreanDbError, type FormState } from "@/lib/errors";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export async function createNoticeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, error: authError } = await requireUser();
  if (!user) return { error: authError };

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const isPinned = formData.get("is_pinned") === "on" && user.role === "admin";

  if (!title) return { error: "제목을 입력해 주세요." };
  if (title.length > 120) return { error: "제목은 120자 이내로 적어주세요." };
  if (!content) return { error: "내용을 입력해 주세요." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notices")
    .insert({
      title,
      content,
      is_pinned: isPinned,
      author_id: user.id,
    })
    .select("id")
    .limit(1);

  if (error) return { error: toKoreanDbError(error.message) };

  const id = (data?.[0] as { id: string } | undefined)?.id;

  revalidatePath("/notices");
  revalidatePath("/");
  redirect(id ? `/notices/${id}` : "/notices");
}

export async function deleteNoticeAction(formData: FormData) {
  const { user } = await requireUser();
  if (!user) redirect("/login?next=%2Fnotices");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/notices");

  const supabase = await createSupabaseServerClient();
  await supabase.from("notices").delete().eq("id", id);

  revalidatePath("/notices");
  revalidatePath("/");
  redirect("/notices");
}

export async function toggleNoticePinAction(formData: FormData) {
  const { user } = await requireUser();
  if (!user) redirect("/login?next=%2Fnotices");

  const id = String(formData.get("id") ?? "");
  const pinned = formData.get("pinned") === "true";
  if (!id) redirect("/notices");

  const supabase = await createSupabaseServerClient();
  await supabase.from("notices").update({ is_pinned: !pinned }).eq("id", id);

  revalidatePath("/notices");
  revalidatePath(`/notices/${id}`);
  revalidatePath("/");
}
