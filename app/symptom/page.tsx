/* eslint-disable prettier/prettier */
"use client";
import { useState, useEffect } from "react";
import { Textarea } from "@heroui/input";
import { Button } from "@heroui/button";
import { useRouter } from "next/navigation";

export default function Symptom() {
  const router = useRouter();
  const [symptom, setSymptom] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 증상 입력값 검증 및 버튼 활성화 상태 관리
  useEffect(() => {
    setIsValid(!!symptom.trim());
  }, [symptom]);

  // 컴포넌트 마운트 시 현재 위치 정보 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
          setIsLocationLoading(false);
        },
        (error) => {
          console.error("위치 정보 가져오기 오류:", error);
          setLocationError("위치 정보를 가져올 수 없습니다. 기본값(0,0)으로 증상을 검색합니다.");
          setCurrentPosition({ latitude: 0, longitude: 0 });
          setIsLocationLoading(false);
        }
      );
    } else {
      setLocationError("브라우저에서 위치 정보 기능을 지원하지 않습니다. 기본값(0,0)으로 증상을 검색합니다.");
      setCurrentPosition({ latitude: 0, longitude: 0 });
      setIsLocationLoading(false);
    }
  }, []);

  // 다음 페이지로 이동하는 함수
  const handleNextClick = async () => {
    if (!isValid || isLocationLoading || !currentPosition) {
      if (isLocationLoading) {
        alert("위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해주세요.");
      } else if (!currentPosition) {
        alert("위치 정보가 설정되지 않았습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.");
      }
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://43.200.107.7:8080";

      const response = await fetch(`${API_URL}/hospitals/recommend/by-symptoms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: symptom.trim(),
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const result = await response.json();

      console.log("백엔드 응답:", result);

      router.push(`/map?symptom=${encodeURIComponent(symptom.trim())}`);
    } catch (error) {
      console.error("증상 전송 실패:", error);
      alert(`증상 전송에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    }
  };

  return (
    <>
      <div className="pt-32">
        <p className="flex font-bold text-2xl">증상을 기입해주세요.</p>
        <p className="flex font-normal text-sm pt-2">
          어떤 증상으로 아프고 어떤 과의 전문적 도움이 필요한 지 작성하면 AI가 문제를 더욱 쉽게 파악할 수 있어요.
        </p>
        {isLocationLoading && (
          <p className="text-sm text-gray-500 pt-2">위치 정보를 가져오는 중...</p>
        )}
        {locationError && !isLocationLoading && (
          <p className="text-sm text-red-500 pt-2">{locationError}</p>
        )}
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
          className={`w-full max-w-lg ${isValid && !isLocationLoading ? "bg-primary text-white" : "bg-[#EDEDED]"}`}
          radius="full"
          onPress={handleNextClick}
          isDisabled={!isValid || isLocationLoading}
        >
          다음
        </Button>
      </div>
    </>
  );
}
