"use client";

import { useActionState } from "react";

import { createEventAction } from "@/app/calendar/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { emptyFormState } from "@/lib/errors";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/types";

export function EventForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction] = useActionState(createEventAction, emptyFormState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="event-title">
            일정 이름
          </label>
          <input
            id="event-title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="예) 청년부 가을 수련회"
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="event-category">
            종류
          </label>
          <select
            id="event-category"
            name="category"
            defaultValue="meeting"
            className="field"
          >
            {(Object.keys(EVENT_CATEGORIES) as EventCategory[]).map((key) => (
              <option key={key} value={key}>
                {EVENT_CATEGORIES[key].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="event-location">
            장소 <span className="font-normal text-ink-faint">(선택)</span>
          </label>
          <input
            id="event-location"
            name="location"
            type="text"
            maxLength={120}
            placeholder="예) 교육관 3층 청년부실"
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="event-date">
            날짜
          </label>
          <input
            id="event-date"
            name="event_date"
            type="date"
            required
            defaultValue={defaultDate}
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="event-end-date">
            종료 날짜{" "}
            <span className="font-normal text-ink-faint">(여러 날이면)</span>
          </label>
          <input
            id="event-end-date"
            name="end_date"
            type="date"
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="event-start-time">
            시작 시간{" "}
            <span className="font-normal text-ink-faint">(비우면 종일)</span>
          </label>
          <input
            id="event-start-time"
            name="start_time"
            type="time"
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="event-end-time">
            종료 시간 <span className="font-normal text-ink-faint">(선택)</span>
          </label>
          <input
            id="event-end-time"
            name="end_time"
            type="time"
            className="field"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="event-description">
            안내 내용 <span className="font-normal text-ink-faint">(선택)</span>
          </label>
          <textarea
            id="event-description"
            name="description"
            rows={4}
            placeholder="준비물, 신청 방법 등을 적어주세요."
            className="field resize-y leading-relaxed"
          />
        </div>
      </div>

      {state.error ? <Alert>{state.error}</Alert> : null}

      <SubmitButton pendingLabel="등록 중…">일정 등록</SubmitButton>
    </form>
  );
}
