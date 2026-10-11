"use server";

import { revalidatePath } from "next/cache";

import { toKoreanDbError } from "@/lib/errors";
import { DOCUMENT_BUCKET } from "@/lib/supabase/config";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import type { BulletinKind } from "@/lib/types";

export interface BulletinInput {
  title: string;
  kind: BulletinKind;
  description: string;
  issuedOn: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * 파일 자체는 브라우저에서 Storage 로 직접 올리고,
 * 여기서는 그 결과를 DB 에 기록합니다.
 */
export async function createBulletinAction(
  input: BulletinInput,
): Promise<{ error?: string }> {
  const { user, error: authError } = await requireUser();
  if (!user) return { error: authError };

  const title = input.title.trim();
  if (!title) return { error: "제목을 입력해 주세요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.issuedOn)) {
    return { error: "날짜를 선택해 주세요." };
  }
  if (!input.filePath) return { error: "파일 업로드가 완료되지 않았습니다." };
  if (input.kind !== "bulletin" && input.kind !== "ad") {
    return { error: "주보 또는 광고를 선택해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("bulletins").insert({
    title,
    kind: input.kind,
    description: input.description.trim() || null,
    issued_on: input.issuedOn,
    file_path: input.filePath,
    file_name: input.fileName,
    file_size: input.fileSize,
    mime_type: input.mimeType || null,
    author_id: user.id,
  });

  if (error) {
    // DB 기록이 실패하면 올라간 파일은 쓸모가 없으니 되돌립니다.
    await supabase.storage.from(DOCUMENT_BUCKET).remove([input.filePath]);
    return { error: toKoreanDbError(error.message) };
  }

  revalidatePath("/bulletins");
  revalidatePath("/");
  return {};
}

export async function deleteBulletinAction(formData: FormData) {
  const { user } = await requireUser();
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bulletins")
    .select("file_path")
    .eq("id", id)
    .limit(1);
  const filePath = (data?.[0] as { file_path: string } | undefined)?.file_path;

  const { error } = await supabase.from("bulletins").delete().eq("id", id);
  if (error) return;

  if (filePath) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath]);
  }

  revalidatePath("/bulletins");
  revalidatePath("/");
}
