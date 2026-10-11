-- ============================================================================
-- Sanwool King · 산울교회 청년부 홈페이지 — Supabase 스키마
-- ----------------------------------------------------------------------------
-- 사용법: Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 RUN.
--         여러 번 실행해도 안전합니다 (idempotent).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. profiles — 로그인한 청년 한 명당 한 행
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  role       text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is '청년부 구성원. role=admin 이면 모든 글/사진을 수정·삭제할 수 있습니다.';

-- 관리자 판별 헬퍼. security definer 로 두어야 profiles 정책이 자기 자신을
-- 다시 조회하면서 무한 재귀에 빠지는 것을 막을 수 있습니다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- 회원가입 시 profiles 행을 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. notices — 공지사항
-- ---------------------------------------------------------------------------
create table if not exists public.notices (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(trim(title)) > 0),
  content    text not null check (char_length(trim(content)) > 0),
  is_pinned  boolean not null default false,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notices_created_at_idx on public.notices (created_at desc);

drop trigger if exists notices_touch on public.notices;
create trigger notices_touch before update on public.notices
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. bulletins — 주보 / 광고 자료실
-- ---------------------------------------------------------------------------
create table if not exists public.bulletins (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) > 0),
  kind        text not null default 'bulletin' check (kind in ('bulletin', 'ad')),
  description text,
  issued_on   date not null,
  file_path   text not null,          -- storage: documents 버킷 내 경로
  file_name   text not null,
  file_size   bigint,
  mime_type   text,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists bulletins_issued_on_idx on public.bulletins (issued_on desc);

comment on column public.bulletins.kind is 'bulletin = 주보, ad = 광고';

-- ---------------------------------------------------------------------------
-- 4. albums — 사진첩의 한 묶음 (한 번에 올린 사진들)
-- ---------------------------------------------------------------------------
create table if not exists public.albums (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) > 0),
  description text,
  -- 사진을 찍은 날(행사 날짜). 달력 연동과 연/월 분류의 기준이 됩니다.
  event_date  date not null,
  cover_path  text,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists albums_event_date_idx on public.albums (event_date desc);
create index if not exists albums_created_at_idx on public.albums (created_at desc);

drop trigger if exists albums_touch on public.albums;
create trigger albums_touch before update on public.albums
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. photos — 앨범에 속한 개별 사진
-- ---------------------------------------------------------------------------
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  album_id     uuid not null references public.albums (id) on delete cascade,
  storage_path text not null unique,  -- storage: photos 버킷 내 경로
  file_name    text not null,
  width        integer,
  height       integer,
  sort_order   integer not null default 0,
  uploaded_by  uuid not null references public.profiles (id) on delete cascade,
  -- 요구사항: 업로드한 날짜와 시간 보관
  uploaded_at  timestamptz not null default now()
);

create index if not exists photos_album_idx on public.photos (album_id, sort_order, uploaded_at);
create index if not exists photos_uploaded_at_idx on public.photos (uploaded_at desc);

-- ---------------------------------------------------------------------------
-- 6. events — 청년부 일정 (달력)
--    타임존 문제를 피하려고 날짜(date)와 시각(time)을 분리해 한국 기준으로 저장
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) > 0),
  description text,
  category    text not null default 'meeting'
              check (category in ('worship', 'meeting', 'fellowship', 'retreat', 'service', 'etc')),
  event_date  date not null,
  end_date    date,                   -- 여러 날 이어지는 일정이면 마지막 날
  start_time  time,                   -- null 이면 종일 일정
  end_time    time,
  location    text,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint events_date_range check (end_date is null or end_date >= event_date)
);

create index if not exists events_event_date_idx on public.events (event_date);

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- RLS — 읽기는 누구나, 쓰기는 로그인한 청년, 수정·삭제는 작성자 또는 관리자
-- ============================================================================
alter table public.profiles  enable row level security;
alter table public.notices   enable row level security;
alter table public.bulletins enable row level security;
alter table public.albums    enable row level security;
alter table public.photos    enable row level security;
alter table public.events    enable row level security;

-- profiles
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select using (true);

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- notices
drop policy if exists "notices read" on public.notices;
create policy "notices read" on public.notices for select using (true);

drop policy if exists "notices insert" on public.notices;
create policy "notices insert" on public.notices
  for insert with check (author_id = auth.uid());

drop policy if exists "notices update own" on public.notices;
create policy "notices update own" on public.notices
  for update using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "notices delete own" on public.notices;
create policy "notices delete own" on public.notices
  for delete using (author_id = auth.uid() or public.is_admin());

-- bulletins
drop policy if exists "bulletins read" on public.bulletins;
create policy "bulletins read" on public.bulletins for select using (true);

drop policy if exists "bulletins insert" on public.bulletins;
create policy "bulletins insert" on public.bulletins
  for insert with check (author_id = auth.uid());

drop policy if exists "bulletins update own" on public.bulletins;
create policy "bulletins update own" on public.bulletins
  for update using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "bulletins delete own" on public.bulletins;
create policy "bulletins delete own" on public.bulletins
  for delete using (author_id = auth.uid() or public.is_admin());

-- albums
drop policy if exists "albums read" on public.albums;
create policy "albums read" on public.albums for select using (true);

drop policy if exists "albums insert" on public.albums;
create policy "albums insert" on public.albums
  for insert with check (author_id = auth.uid());

drop policy if exists "albums update own" on public.albums;
create policy "albums update own" on public.albums
  for update using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "albums delete own" on public.albums;
create policy "albums delete own" on public.albums
  for delete using (author_id = auth.uid() or public.is_admin());

-- photos
drop policy if exists "photos read" on public.photos;
create policy "photos read" on public.photos for select using (true);

drop policy if exists "photos insert" on public.photos;
create policy "photos insert" on public.photos
  for insert with check (uploaded_by = auth.uid());

drop policy if exists "photos delete own" on public.photos;
create policy "photos delete own" on public.photos
  for delete using (
    uploaded_by = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.albums a where a.id = album_id and a.author_id = auth.uid())
  );

-- events
drop policy if exists "events read" on public.events;
create policy "events read" on public.events for select using (true);

drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events
  for insert with check (author_id = auth.uid());

drop policy if exists "events update own" on public.events;
create policy "events update own" on public.events
  for update using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "events delete own" on public.events;
create policy "events delete own" on public.events
  for delete using (author_id = auth.uid() or public.is_admin());

-- ============================================================================
-- Storage — 비공개 버킷 2개. 열람은 로그인한 사람만(서명 URL), 업로드도 로그인 필요
-- ============================================================================
-- image/* 와일드카드를 써서 아이폰 HEIC 등 어떤 이미지 형식이든 받습니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 26214400, array['image/*'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "photos: members read" on storage.objects;
create policy "photos: members read" on storage.objects
  for select using (bucket_id = 'photos' and auth.uid() is not null);

drop policy if exists "photos: members upload" on storage.objects;
create policy "photos: members upload" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.uid() is not null);

-- 사진 파일 경로는 "<앨범 id>/<파일명>" 이므로, 앨범을 만든 사람도
-- (자기가 올리지 않은 사진까지) 지울 수 있게 해 앨범 삭제 시 파일이 남지 않게 합니다.
drop policy if exists "photos: owner delete" on storage.objects;
create policy "photos: owner delete" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and (
      owner = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.albums a
        where a.author_id = auth.uid()
          and a.id::text = split_part(name, '/', 1)
      )
    )
  );

drop policy if exists "documents: members read" on storage.objects;
create policy "documents: members read" on storage.objects
  for select using (bucket_id = 'documents' and auth.uid() is not null);

drop policy if exists "documents: members upload" on storage.objects;
create policy "documents: members upload" on storage.objects
  for insert with check (bucket_id = 'documents' and auth.uid() is not null);

drop policy if exists "documents: owner delete" on storage.objects;
create policy "documents: owner delete" on storage.objects
  for delete using (bucket_id = 'documents' and (owner = auth.uid() or public.is_admin()));

-- ============================================================================
-- 관리자 지정 (이메일을 바꿔서 한 번 실행하세요)
-- ----------------------------------------------------------------------------
-- update public.profiles set role = 'admin'
-- where id = (select id from auth.users where email = 'leader@example.com');
-- ============================================================================
