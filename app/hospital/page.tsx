/* eslint-disable prettier/prettier */
// "use client"; // 이 페이지는 서버 컴포넌트이므로 "use client"는 필요 없습니다.

import { Suspense } from "react";
// import { useSearchParams } from 'next/navigation'; // HospitalPage에서는 직접 사용하지 않음
import HospitalClientComponent from './HospitalClientComponent';

// 로딩 UI 컴포넌트
function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
      <div className="text-xl font-semibold text-gray-700">
        병원 정보를 불러오는 중입니다...
      </div>
      {/* 필요하다면 여기에 스피너나 더 정교한 로딩 UI를 추가할 수 있습니다. */}
    </div>
  );
}

export default function HospitalPage() {
  return (
    <Suspense fallback={<Loading />}>
      <HospitalClientComponent />
    </Suspense>
  );
}

// export function Map() { ... }  <-- 이 부분을 완전히 제거합니다.
// Map 함수의 모든 로직은 HospitalClientComponent.tsx 로 이전되었습니다.
