import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteBulletinAction } from "@/app/bulletins/actions";
import { BulletinUploadForm } from "@/components/bulletin-upload-form";
import { ActionButton } from "@/components/delete-button";
import { EmptyState, PageHeader, SetupNotice } from "@/components/ui";
import { formatDateKey } from "@/lib/date";
import { formatFileSize, signedUrlMap } from "@/lib/storage";
import { DOCUMENT_BUCKET, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { BULLETIN_KINDS, rows, type Bulletin } from "@/lib/types";

export const metadata: Metadata = { title: "주보·광고" };

const FILTERS = [
  { value: "all", label: "전체" },
  { value: "bulletin", label: "주보" },
  { value: "ad", label: "광고" },
] as const;

function fileIcon(mimeType: string | null, fileName: string) {
  const name = fileName.toLowerCase();
  if (mimeType?.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "📄";
  if (name.endsWith(".hwp") || name.endsWith(".hwpx")) return "📝";
  if (name.endsWith(".ppt") || name.endsWith(".pptx")) return "📊";
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "📈";
  return "📎";
}

export default async function BulletinsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fbulletins");

  const { kind } = await searchParams;
  const active =
    kind === "bulletin" || kind === "ad" ? kind : ("all" as const);

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("bulletins")
    .select("*, author:profiles(name)")
    .order("issued_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (active !== "all") query = query.eq("kind", active);

  const { data } = await query;
  const bulletins = rows<Bulletin>(data);

  const urls = await signedUrlMap(
    supabase,
    DOCUMENT_BUCKET,
    bulletins.map((b) => b.file_path),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Bulletins"
        title="주보 · 광고"
        description="주일 주보와 청년부 광고(포스터)를 모아둡니다. 날짜 순으로 쌓이니 지난 자료도 언제든 다시 볼 수 있어요."
      />

      <details className="card mb-8 px-6 py-5 sm:px-7">
        <summary className="cursor-pointer text-sm font-bold text-ink marker:text-brand">
          자료 올리기
        </summary>
        <div className="mt-5 border-t border-line pt-5">
          <BulletinUploadForm />
        </div>
      </details>

      <div className="mb-6 flex items-center gap-1.5">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={
              filter.value === "all"
                ? { pathname: "/bulletins" }
                : { pathname: "/bulletins", query: { kind: filter.value } }
            }
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              active === filter.value
                ? "bg-ink text-cream"
                : "border border-line bg-surface text-ink-soft hover:bg-surface-soft"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {bulletins.length === 0 ? (
        <EmptyState
          title="아직 올라온 자료가 없습니다"
          description="위의 ‘자료 올리기’를 열어 주보나 광고 파일을 올려보세요."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {bulletins.map((bulletin) => {
            const url = urls.get(bulletin.file_path) ?? null;
            const downloadUrl = url
              ? `${url}&download=${encodeURIComponent(bulletin.file_name)}`
              : null;
            const isImage = !!bulletin.mime_type?.startsWith("image/");
            const meta = BULLETIN_KINDS[bulletin.kind];
            const canManage =
              user.id === bulletin.author_id || user.role === "admin";

            return (
              <li key={bulletin.id} className="card overflow-hidden">
                {isImage && url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    {/* 서명 URL 은 매번 바뀌어 next/image 캐시가 소용없으므로 img 를 씁니다 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={bulletin.title}
                      loading="lazy"
                      className="h-44 w-full bg-surface-soft object-cover"
                    />
                  </a>
                ) : null}

                <div className="px-5 py-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`chip ${meta.chip}`}>{meta.label}</span>
                    <span className="text-xs font-semibold text-ink-faint">
                      {formatDateKey(bulletin.issued_on, "dot")}
                    </span>
                  </div>

                  <h2 className="text-ko text-base font-bold text-ink">
                    {bulletin.title}
                  </h2>
                  {bulletin.description ? (
                    <p className="text-ko mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {bulletin.description}
                    </p>
                  ) : null}

                  <p className="mt-3 truncate text-xs text-ink-faint">
                    {fileIcon(bulletin.mime_type, bulletin.file_name)}{" "}
                    {bulletin.file_name}
                    {bulletin.file_size
                      ? ` · ${formatFileSize(bulletin.file_size)}`
                      : ""}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary px-4 py-1.5 text-xs"
                      >
                        보기
                      </a>
                    ) : null}
                    {downloadUrl ? (
                      <a
                        href={downloadUrl}
                        className="btn-ghost px-4 py-1.5 text-xs"
                      >
                        내려받기
                      </a>
                    ) : null}
                    {canManage ? (
                      <ActionButton
                        action={deleteBulletinAction}
                        values={{ id: bulletin.id }}
                        label="삭제"
                        pendingLabel="삭제 중…"
                        confirmText={`‘${bulletin.title}’ 을(를) 삭제할까요?`}
                      />
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs text-ink-faint">
                    올린 사람 {bulletin.author?.name ?? "청년부"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
