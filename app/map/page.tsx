"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";

// 지도 컨테이너 스타일
const containerStyle = {
  width: "100%",
  height: "100%",
};

// 기본 중심 좌표
const defaultCenter = {
  lat: 37.5665,
  lng: 126.9780,
};

// 병원 정보 타입 정의
interface Hospital {
  hospital_id: number;
  name: string;
  location: { latitude: number; longitude: number };
  distance: number;
  phone_number: string;
  operating_hours: string;
  is_emergency: boolean;
}

export default function Map() {
  // 상단 기본 진술
  const [defaultStatement, setDefaultStatement] = useState<string>("");
  // 하단 병원 리스트
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  // 하단 응급가이드
  const [firstAidGuideline, setFirstAidGuideline] = useState<string>("");
  // 사용자 위치
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // 위치 업데이트 핸들러
  const updatePosition = (position: GeolocationPosition) => {
    const pos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    setCurrentPosition(pos);
    if (mapRef.current) mapRef.current.panTo(pos);
  };

  // 최초 위치 가져오기 및 워치 시작
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(updatePosition);
      watchIdRef.current = navigator.geolocation.watchPosition(
        updatePosition,
        console.error,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // 위치가 설정되면 백엔드로 요청하여 데이터 로드
  useEffect(() => {
    if (!currentPosition) return;
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${API_URL}/api/hospitals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symptom: "가슴 통증",
            location: {
              latitude: currentPosition.lat,
              longitude: currentPosition.lng,
            },
          }),
        });
        const data = await res.json();
        // 상단 기본 진술
        setDefaultStatement(data.defaultStatement || data.first_aid_guideline || "");
        // 병원 리스트
        setHospitals(data.matched_hospitals || []);
        // 응급 가이드
        setFirstAidGuideline(data.first_aid_guideline || "");
      } catch (err) {
        console.error("Error fetching hospital data:", err);
      }
    };
    fetchData();
  }, [currentPosition]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* 지도 영역 */}
      <div className="absolute inset-0 z-0">
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyB7RIJvUZduw2og9PaFX20-3AV6dmMerhA"}>
          {currentPosition ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={currentPosition}
              zoom={15}
              onLoad={(map) => { mapRef.current = map; }}
            >
              <Marker position={currentPosition} />
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">
              위치 정보를 불러오는 중...
            </div>
          )}
        </LoadScript>
      </div>

      {/* 상단 아코디언 */}
      <div className="w-full transition-all duration-300 z-10 relative">
        <Accordion variant="shadow" className="bg-white rounded-b-2xl shadow-xl overflow-hidden">
          <AccordionItem
            key="defaultStatement"
            title={
              <div className="px-5 py-3 flex items-center justify-between pb-0">
                <span className="font-bold text-2xl">진단 정보</span>
              </div>
            }
            className="w-full pt-[100px]"
          >
            <div className="pt-0 px-5 pb-3 font-normal text-sm whitespace-pre-line">
              {defaultStatement}
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      {/* 빈 공간 */}
      <div className="flex-grow" />

      {/* 하단 스크롤 영역 */}
      <div className="relative h-[320px] bg-white rounded-t-2xl overflow-y-auto z-10">
        {hospitals.map((h) => (
          <div key={h.hospital_id} className="flex pt-6 items-center justify-center">
            <Button radius="none" className="bg-white border-b-1.5 flex h-[72px] w-full items-center justify-center">
              <div className="flex flex-col w-full gap-2 items-center justify-center">
                <div className="flex w-[315px] items-center justify-between">
                  <span className="font-bold text-2xl">{h.name}</span>
                  <span>{h.distance}km</span>
                </div>
                <div className="flex pt-0 w-[315px] items-center justify-between">
                  <span>{h.phone_number}</span>
                  <span>{h.operating_hours}</span>
                </div>
              </div>
            </Button>
          </div>
        ))}
        {firstAidGuideline && (
          <div className="p-4 text-sm whitespace-pre-line">
            {firstAidGuideline}
          </div>
        )}
      </div>
    </div>
  );
}
