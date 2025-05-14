"use client"; // 클라이언트 컴포넌트로 변경

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // next/navigation에서 useRouter를 가져옵니다.
import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { button as buttonStyles } from "@heroui/theme";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/age'); // '/age' 경로로 리디렉션합니다.
  }, [router]); // router 객체가 변경될 때만 useEffect를 다시 실행합니다. (일반적으로 한 번만 실행됨)

  // 리디렉션이 발생하기 전까지 잠시 보여줄 내용 (선택 사항)
  // 또는 null을 반환하여 아무것도 렌더링하지 않을 수 있습니다.
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <p>Connecting to Uhdi-apa...</p>
        <p><strong>The First Lookup For The First Aid</strong></p> {/* 리디렉션 중 메시지 */}
      </div>
    </section>
  );

  // 만약 리디렉션 중 아무것도 표시하고 싶지 않다면 아래와 같이 null을 반환합니다.
  // return null;
}
