import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE } from "@/lib/site";

import "./globals.css";

/**
 * 로고와 큰 제목에만 쓰는 라틴 세리프.
 * 한글은 기기에 깔린 Pretendard / 애플 SD 산돌고딕 / 맑은 고딕을 사용합니다
 * (한글 웹폰트는 용량이 커서 교회 와이파이에서 느려질 수 있어 뺐습니다).
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} · ${SITE.nameKo}`,
    template: `%s · ${SITE.name}`,
  },
  description: `${SITE.church} 청년부 ${SITE.name} — ${SITE.tagline}. 예배·모임 시간, 공지사항, 주보, 사진첩, 청년부 일정을 한곳에서 확인하세요.`,
  openGraph: {
    title: `${SITE.name} · ${SITE.nameKo}`,
    description: SITE.tagline,
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${cormorant.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:py-14">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
