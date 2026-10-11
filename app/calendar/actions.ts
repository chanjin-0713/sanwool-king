"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isValidDateKey } from "@/lib/date";
import { toKoreanDbError, type FormState } from "@/lib/errors";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/types";

export async function createEventAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, error: authError } = await requireUser();
  if (!user) return { error: authError };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "meeting") as EventCategory;
  const eventDate = String(formData.get("event_date") ?? "");
  const endDateRaw = String(formData.get("end_date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!title) return { error: "일정 이름을 입력해 주세요." };
  if (!isValidDateKey(eventDate)) return { error: "날짜를 선택해 주세요." };
  if (endDateRaw && !isValidDateKey(endDateRaw)) {
    return { error: "종료 날짜를 다시 확인해 주세요." };
  }
  if (endDateRaw && endDateRaw < eventDate) {
    return { error: "종료 날짜가 시작 날짜보다 앞설 수 없습니다." };
  }
  if (!(category in EVENT_CATEGORIES)) {
    return { error: "일정 종류를 선택해 주세요." };
  }
  if (startTime && endTime && endTime < startTime) {
    return { error: "종료 시간이 시작 시간보다 앞설 수 없습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("events").insert({
    title,
    description: description || null,
    category,
    event_date: eventDate,
    end_date: endDateRaw || null,
    start_time: startTime || null,
    end_time: endTime || null,
    location: location || null,
    author_id: user.id,
  });

  if (error) return { error: toKoreanDbError(error.message) };

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${eventDate}`);
  revalidatePath("/");
  redirect(`/calendar/${eventDate}`);
}

export async function deleteEventAction(formData: FormData) {
  const { user } = await requireUser();
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  const dateKey = String(formData.get("date") ?? "");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("events").delete().eq("id", id);

  revalidatePath("/calendar");
  if (isValidDateKey(dateKey)) revalidatePath(`/calendar/${dateKey}`);
  revalidatePath("/");
}
