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
    setTimeout(() => {
      router.push('/age'); // '/age' 경로로 리디렉션합니다.
    }, 1000);
  }, [router]); // router 객체가 변경될 때만 useEffect를 다시 실행합니다. (일반적으로 한 번만 실행됨)

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <p>Connecting to Uhdi-apa...</p>
        <p><strong>Your First Lookup for First Aid.</strong></p>
        <br/>
        <p>Uhdi-apa로 연결하는중...</p>
        <p>응급처치? 어디아파!</p>
        <p>Uhdi-apa가 가장 먼저 찾아드립니다!</p>
      </div>
    </section>
  );

  // 만약 리디렉션 중 아무것도 표시하고 싶지 않다면 아래와 같이 null을 반환합니다.
  // return null;
}
