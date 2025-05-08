/* eslint-disable prettier/prettier */
"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { useSearchParams } from 'next/navigation';

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

// 하단 리스트용 병원 타입
interface Hospital {
  hospital_id: number;
  name: string;
  location: { latitude: number; longitude: number };
  distance: number;
  phone_number: string;
  operating_hours: string;
  is_emergency: boolean;
}

// 모달에 표시할 병원 상세 정보 타입
interface HospitalDetail {
  hospitalId: number;
  hospitalName: string;
  operatingHours: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  isEmergencyRoom: boolean;
  specialties: string[];
  phoneNumber: string;
  hospitalImage: string;
}

export default function Map() {
  const searchParams = useSearchParams();

  // 기존 상태들…
  const [defaultStatement, setDefaultStatement] = useState<string>("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [firstAidGuideline, setFirstAidGuideline] = useState<string>("");
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // **추가된 상태: 모달 오픈 여부 & 상세 정보 저장**
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHospitalDetail, setSelectedHospitalDetail] = useState<HospitalDetail | null>(null);
  // **추가된 상태: 클릭한 병원 정보 (InfoWindow용)**
  const [activeMarker, setActiveMarker] = useState<Hospital | null>(null);

  // 위치 업데이트 핸들러
  const updatePosition = (position: GeolocationPosition) => {
    const pos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    setCurrentPosition(pos);
    mapRef.current?.panTo(pos);
  };

  // 초기 위치 조회 및 watch
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

  // 병원 리스트 로드 (수정됨)
  useEffect(() => {
    if (!currentPosition) return;
    const fetchData = async () => {
      try {
        const symptomText = searchParams.get("symptom") || "증상 정보 없음";
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://43.200.107.7:8080";

        const res = await fetch(`${API_URL}/hospitals/recommend/by-symptoms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symptom: symptomText,
            location: {
              latitude: currentPosition.lat,
              longitude: currentPosition.lng,
            },
          }),
        });
        if (!res.ok) throw new Error(`API 오류 ${res.status}`);
        const data = await res.json();
        setDefaultStatement(data.defaultStatement || data.first_aid_guideline || "");
        setHospitals(data.matched_hospitals || []);
        setFirstAidGuideline(data.first_aid_guideline || "");
      } catch (err) {
        console.error(err);
        setDefaultStatement("데이터를 불러오는데 실패했습니다.");
      }
    };
    fetchData();
  }, [currentPosition, searchParams]);

  // 병원 상세 정보 요청 함수 (수정됨)
  const handleHospitalClick = async (h: Hospital) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://43.200.107.7:8080";
      const res = await fetch(`${API_URL}/hospitals/detail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hospital_id: h.hospital_id,
          location: {
            latitude: h.location.latitude,
            longitude: h.location.longitude,
          },
        }),
      });
      if (!res.ok) throw new Error(`상세정보 호출 실패 ${res.status}`);
      const json = await res.json();
      // 응답 구조: { message: "...", data: { …HospitalDetail } }
      setSelectedHospitalDetail(json.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("상세정보 로드 오류:", err);
      // 필요 시 사용자 알림 추가
    }
  };

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
              onClick={() => setActiveMarker(null)} // 맵 클릭 시 InfoWindow 닫기
            >
              {/* 현재 위치 마커 */}
              <Marker position={currentPosition} />

              {/* 병원 위치 마커들 */}
              {hospitals.map((hospital) => (
                <Marker
                  key={hospital.hospital_id}
                  position={{ lat: hospital.location.latitude, lng: hospital.location.longitude }}
                  onClick={() => {
                    // 마커 클릭 시 해당 병원 정보로 activeMarker 상태 업데이트
                    // InfoWindow를 사용하거나, 하단 리스트의 항목을 하이라이트하는 등의 인터랙션 가능
                    // 여기서는 간단히 handleHospitalClick을 호출하여 모달을 띄우도록 함
                    handleHospitalClick(hospital);
                  }}
                />
              ))}
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">
              위치 정보를 불러오는 중...
            </div>
          )}
        </LoadScript>
      </div>

      {/* 상단 아코디언 */}
      <div className="w-full z-10 relative">
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
            <Button
              radius="none"
              className="bg-white border-b-1.5 flex h-[72px] w-full items-center justify-center"
              onPress={() => handleHospitalClick(h)}  // 클릭 핸들러 연결
            >
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

      {/* **추가된 모달** */}
      {isModalOpen && selectedHospitalDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-2xl p-6 w-80 max-w-full shadow-lg">
            <h2 className="text-xl font-bold mb-4">{selectedHospitalDetail.hospitalName}</h2>
            <img
              src={selectedHospitalDetail.hospitalImage}
              alt={selectedHospitalDetail.hospitalName}
              className="w-full h-40 object-cover rounded-md mb-4"
            />
            <p><strong>주소:</strong> {selectedHospitalDetail.address}</p>
            <p><strong>운영시간:</strong> {selectedHospitalDetail.operatingHours}</p>
            <p><strong>전화번호:</strong> {selectedHospitalDetail.phoneNumber}</p>
            <p><strong>거리:</strong> {selectedHospitalDetail.distance?.toFixed(2)}km</p>
            <p><strong>응급실 여부:</strong> {selectedHospitalDetail.isEmergencyRoom ? "O" : "X"}</p>
            <p><strong>전문 진료과:</strong> {selectedHospitalDetail.specialties.join(", ")}</p>
            <div className="mt-4 flex justify-end">
              <Button onPress={() => setIsModalOpen(false)}>닫기</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
