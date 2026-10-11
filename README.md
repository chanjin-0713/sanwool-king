# Sanwool King · 산울교회 청년부 홈페이지

청년부 소개와 예배·모임 시간, 공지사항, 주보·광고 자료실, 사진첩, 일정 달력을
한곳에 모은 홈페이지입니다.

- **Next.js 16** (App Router, 서버 컴포넌트 + 서버 액션)
- **Supabase** — 로그인, 데이터베이스(Postgres), 파일 저장소(Storage)
- **Tailwind CSS 4** — 아이보리 + 테라코타의 따뜻한 교회 톤

---

## 담긴 기능

| 화면 | 경로 | 내용 |
| --- | --- | --- |
| 홈 | `/` | 청년부 소개, **예배 시간**, **청년부 모임 시간**, 최근 공지, 다가오는 일정, 최근 사진 |
| 공지사항 | `/notices` | 목록 · 상세 · 작성 · 삭제, 관리자는 상단 고정 가능 |
| 주보·광고 | `/bulletins` | 주보/광고 파일 업로드, 날짜순 목록, 이미지 미리보기, 보기·내려받기 |
| 사진첩 | `/gallery` | 앨범 썸네일 목록, **연도별·월별 분류**, 분류 기준(찍은 날 / 올린 날) 전환 |
| 앨범 | `/gallery/[id]` | 썸네일 격자 → 클릭하면 **크게 보기**, 같이 올린 사진을 좌우·키보드·필름스트립으로 전부 탐색 |
| 일정 달력 | `/calendar` | 월별 달력에 일정 표시, 사진 있는 날은 📷 표시, 일정 등록 |
| 날짜 상세 | `/calendar/[date]` | 그 날의 일정 + **그 날의 사진**(앨범별 라이트박스) + 그 날 업로드된 사진 |

### 공개 범위

| | 비로그인 | 로그인한 청년 | 관리자 |
| --- | --- | --- | --- |
| 소개·예배/모임 시간 | 볼 수 있음 | ✓ | ✓ |
| 공지사항 읽기 | 볼 수 있음 | ✓ | ✓ |
| 일정 달력 보기 | 볼 수 있음 | ✓ | ✓ |
| 사진첩·주보 보기 | **로그인 필요** | ✓ | ✓ |
| 공지·사진·주보·일정 올리기 | ✗ | ✓ | ✓ |
| 남이 올린 글·사진 삭제 | ✗ | ✗ | ✓ |
| 공지 상단 고정 | ✗ | ✗ | ✓ |

사진과 주보는 교우들의 얼굴·개인 정보가 담길 수 있어 비공개 버킷에 저장하고,
화면에 보여줄 때만 1시간짜리 서명 URL을 만들어 씁니다.

---

## 처음 설정 (약 10분)

### 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 에 가입 후 **New project** (무료 플랜으로 충분합니다).
2. Region은 `Northeast Asia (Seoul)` 을 고르면 가장 빠릅니다.
3. 데이터베이스 비밀번호는 따로 안전하게 보관하세요.

### 2. 테이블·권한·저장소 만들기

Supabase 대시보드 → **SQL Editor** → **New query** 에
[`supabase/schema.sql`](supabase/schema.sql) 파일 내용을 **전체 복사해 붙여넣고 RUN**.

테이블 6개(`profiles`, `notices`, `bulletins`, `albums`, `photos`, `events`),
RLS 보안 정책, 저장소 버킷 2개(`photos`, `documents`)가 한 번에 만들어집니다.
여러 번 실행해도 안전합니다.

### 3. 연결 정보 넣기

Supabase 대시보드 → **Project Settings → API** 에서 두 값을 복사해,
프로젝트 폴더에 `.env.local` 파일을 만들고 적습니다.

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `.env.local.example` 을 복사해서 쓰면 편합니다.
> anon key 는 공개되어도 괜찮은 키입니다 (실제 권한은 위 RLS 정책이 지킵니다).
> `service_role` 키는 **절대** 이 파일에 넣지 마세요.

### 4. 실행

```bash
npm install
npm run dev
```

http://localhost:3000 을 열고 **회원가입** → **로그인** 하면 끝입니다.

### 5. 관리자 지정

첫 가입을 마친 뒤, SQL Editor 에서 이메일만 바꿔 한 번 실행하세요.

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = '임원진이메일@example.com');
```

관리자는 모든 글·사진·일정을 삭제할 수 있고, 공지를 상단에 고정할 수 있습니다.

---

## 알아두면 좋은 설정

### 이메일 인증을 끄고 싶다면

기본값은 "가입하면 인증 메일을 보내고, 링크를 눌러야 로그인 가능"입니다.
청년부 규모에서는 번거로울 수 있으니, 원하면 끌 수 있습니다.

Supabase 대시보드 → **Authentication → Sign In / Providers → Email** →
`Confirm email` 끄기.

인증 메일을 그대로 쓸 경우에는 **Authentication → URL Configuration** 에서
`Site URL` 과 `Redirect URLs` 에 실제 주소(`https://내도메인/auth/callback`)를
반드시 등록해야 링크가 정상 동작합니다.

### 아무나 가입하지 못하게 하려면

**Authentication → Sign In / Providers → Email → `Allow new users to sign up`** 을 끄고,
임원진이 **Authentication → Users → Add user** 로 직접 계정을 만들어 주면 됩니다.

### 소개 문구·예배 시간 바꾸기

[`lib/site.ts`](lib/site.ts) 파일 하나만 고치면 됩니다.
청년부 이름, 표어, 소개 문단, 예배 시간표, 모임 시간표, 찾아오는 길이 모두 여기 있습니다.
코드를 몰라도 따옴표 안의 글자만 바꾸면 화면에 그대로 반영됩니다.

---

## 배포 (Vercel · 무료)

```bash
git add -A
git commit -m "청년부 홈페이지"
# GitHub 에 새 저장소를 만들고 푸시
git remote add origin https://github.com/<계정>/sanwool-king.git
git push -u origin main
```

1. [vercel.com](https://vercel.com) 에서 **Add New → Project** → 그 저장소 선택.
2. **Environment Variables** 에 `.env.local` 의 세 값을 그대로 넣습니다.
   (`NEXT_PUBLIC_SITE_URL` 은 배포된 실제 주소로)
3. Deploy. 이후 `git push` 할 때마다 자동으로 다시 배포됩니다.

배포 후 Supabase 의 **Authentication → URL Configuration** 에도
실제 주소를 등록해 주세요.

---

## 폴더 구조

```
app/
  page.tsx                 홈 (소개 · 예배/모임 시간 · 요약)
  layout.tsx               공통 레이아웃 (헤더/푸터)
  globals.css              색·글꼴·버튼 등 디자인 토큰
  auth/                    로그인/가입 서버 액션, 인증 메일 콜백
  login/ · signup/         로그인 · 회원가입 화면
  notices/                 공지사항 (목록 · [id] 상세 · new 작성)
  bulletins/               주보·광고 자료실
  gallery/                 사진첩 (목록 · [id] 앨범)
  calendar/                일정 달력 (· [date] 날짜 상세)
components/
  photo-lightbox.tsx       썸네일 격자 + 전체 화면 사진 보기
  album-upload-form.tsx    앨범 만들고 사진 여러 장 올리기
  photo-append-form.tsx    기존 앨범에 사진 추가
  bulletin-upload-form.tsx 주보·광고 파일 올리기
  event-form.tsx           일정 등록
  site-header.tsx · site-footer.tsx · main-nav.tsx
  ui.tsx · submit-button.tsx · delete-button.tsx
lib/
  site.ts                  ✏️ 소개 문구 · 예배/모임 시간 (여기만 고치면 됩니다)
  types.ts                 데이터 타입과 분류(일정 종류 등)
  date.ts                  한국 시간 기준 날짜 계산 · 달력 격자
  storage.ts               비공개 파일용 서명 URL
  upload-photos.ts         브라우저에서 Storage 로 직접 업로드
  supabase/                서버·브라우저 클라이언트, 환경설정
proxy.ts                   로그인이 필요한 경로 보호 + 세션 갱신
supabase/schema.sql        테이블 · 보안 정책 · 저장소 (한 번 실행)
```

## 명령어

```bash
npm run dev     # 개발 서버
npm run build   # 배포용 빌드 (타입 검사 포함)
npm run lint    # 코드 검사
npm start       # 빌드 결과 실행
```

## 용량 참고

- 사진 1장 최대 25MB, 한 번에 최대 60장
- 주보·광고 파일 1개 최대 25MB (PDF · 이미지 · 한글 · 오피스)
- Supabase 무료 플랜 저장소는 1GB 입니다. 사진이 많아지면
  유료 플랜(월 $25, 100GB)으로 올리면 됩니다.
