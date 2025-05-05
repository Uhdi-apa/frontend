"use client";
import { useState, useEffect } from "react";
import { Textarea } from "@heroui/input";
import { Button } from "@heroui/button";
import { useRouter } from "next/navigation";

export default function Symptom() {
  const router = useRouter();
  const [symptom, setSymptom] = useState("");
  const [isValid, setIsValid] = useState(false);

  // 증상 입력값 검증 및 버튼 활성화 상태 관리
  useEffect(() => {
    setIsValid(!!symptom.trim());
  }, [symptom]);

  // 다음 페이지로 이동하는 함수
  const handleNextClick = async () => {
    if (!isValid) return;

    try {
      // 1) 백엔드에 증상 데이터 전송
      const response = await fetch("/api/symptom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symptom: symptom.trim() }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const result = await response.json();
      console.log("백엔드 응답:", result);

      // 2) 성공 시 map 페이지로 이동 (기존 로직)
      router.push(`/map?symptom=${encodeURIComponent(symptom.trim())}`);
    } catch (error) {
      console.error("증상 전송 실패:", error);
      // TODO: 사용자에게 오류 메시지 표시 (toast, alert 등)
    }
  };

  return (
    <>
      <div className="pt-32">
        <p className="flex font-bold text-2xl">증상을 기입해주세요.</p>
        <p className="flex font-normal text-sm pt-2">
          어떤 증상으로 아프고 어떤 과의 전문적 도움이 필요한 지 작성하면 AI가 문제를 더욱 쉽게 파악할 수 있어요.
        </p>
      </div>
      <div className="pt-14">
        <div className="flex items-center">
          <div className="flex w-full">
            <Textarea
              isRequired
              placeholder="증상을 입력해주세요."
              variant="bordered"
              className="w-full"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="fixed bottom-8 left-0 right-0 flex justify-center w-full px-4">
        <Button
          className={`w-full max-w-lg ${isValid ? "bg-primary text-white" : "bg-[#EDEDED]"}`}
          radius="full"
          onPress={handleNextClick}
          isDisabled={!isValid}
        >
          다음
        </Button>
      </div>
    </>
  );
}
