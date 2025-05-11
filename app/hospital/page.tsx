/* eslint-disable prettier/prettier */

import { Suspense } from "react";
import HospitalClientComponent from './HospitalClientComponent';

// 로딩 UI 컴포넌트
function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
      <div className="text-xl font-semibold text-gray-700">
        병원 정보를 불러오는 중입니다...
      </div>
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
