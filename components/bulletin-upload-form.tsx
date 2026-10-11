"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createBulletinAction } from "@/app/bulletins/actions";
import { Alert } from "@/components/ui";
import { todayKey } from "@/lib/date";
import { toKoreanDbError } from "@/lib/errors";
import { formatFileSize, toStorageFileName } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DOCUMENT_BUCKET } from "@/lib/supabase/config";
import type { BulletinKind } from "@/lib/types";

const MAX_BYTES = 25 * 1024 * 1024;

export function BulletinUploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const kind = String(form.get("kind") ?? "bulletin") as BulletinKind;
    const issuedOn = String(form.get("issued_on") ?? "");
    const description = String(form.get("description") ?? "");

    if (!title) return setError("제목을 입력해 주세요.");
    if (!issuedOn) return setError("날짜를 선택해 주세요.");
    if (!file) return setError("올릴 파일을 선택해 주세요.");
    if (file.size > MAX_BYTES) {
      return setError(
        `파일이 너무 큽니다 (${formatFileSize(file.size)}). 25MB 이하로 올려주세요.`,
      );
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const filePath = `${issuedOn.slice(0, 7)}/${toStorageFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(filePath, file, {
          contentType: file.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        setError(toKoreanDbError(uploadError.message));
        return;
      }

      const result = await createBulletinAction({
        title,
        kind,
        description,
        issuedOn,
        filePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      setFile(null);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? toKoreanDbError(cause.message)
          : "업로드 중 문제가 발생했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">
            제목
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="예) 10월 2주 주보"
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="kind">
            종류
          </label>
          <select id="kind" name="kind" className="field" defaultValue="bulletin">
            <option value="bulletin">주보</option>
            <option value="ad">광고</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="issued_on">
            날짜
          </label>
          <input
            id="issued_on"
            name="issued_on"
            type="date"
            required
            defaultValue={todayKey()}
            className="field"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">
            설명 <span className="font-normal text-ink-faint">(선택)</span>
          </label>
          <input
            id="description"
            name="description"
            type="text"
            maxLength={200}
            placeholder="한 줄 설명을 적어주세요"
            className="field"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="file">
            파일
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.webp,.hwp,.hwpx,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="field file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-dark"
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            PDF·이미지·한글·오피스 파일, 한 개당 25MB 이하
            {file ? ` · 선택: ${file.name} (${formatFileSize(file.size)})` : ""}
          </p>
        </div>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "올리는 중…" : "자료 올리기"}
      </button>
    </form>
  );
}
