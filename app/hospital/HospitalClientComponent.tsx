// filepath: c:\Users\YUP\Desktop\Solution_Challenge_2025\frontend\app\hospital\HospitalClientComponent.tsx
/* eslint-disable prettier/prettier */
"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, LoadScript, MarkerF } from "@react-google-maps/api";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { useSearchParams, useRouter } from 'next/navigation'; // useRouter 추가

// 지도 컨테이너 스타일
const containerStyle = {
  width: "100%",
  height: "100%",
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

export default function HospitalClientComponent() {
  const searchParams = useSearchParams();
  const router = useRouter(); // useRouter 인스턴스 생성

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [firstAidGuideline, setFirstAidGuideline] = useState<string>("");
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [symptom, setSymptom] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHospitalDetail, setSelectedHospitalDetail] = useState<HospitalDetail | null>(null);
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
        (error) => console.error("Error watching position:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // 병원 리스트 로드
  useEffect(() => {
    if (!currentPosition) return;

    const symptomTextFromQuery = searchParams.get("symptom") || "증상 정보 없음";

    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://uhdiapa.com:8080";

        const response = await fetch(`${API_URL}/hospitals/recommend/by-symptoms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: symptomTextFromQuery,
            latitude: currentPosition.lat,
            longitude: currentPosition.lng,
          }),
        });

        if (!response.ok) {
          throw new Error(`서버 응답 오류: ${response.status}`);
        }

        const result = await response.json();
        console.log("백엔드 응답 (추천 병원):", result);

        setSymptom(symptomTextFromQuery);

        let mappedHospitals = result.data?.hospitals ? result.data.hospitals.map((hospital: any) => ({
          hospital_id: hospital.hospitalId,
          name: hospital.hospitalName,
          location: { latitude: hospital.latitude, longitude: hospital.longitude },
          distance: hospital.distance,
          phone_number: hospital.phoneNumber,
          operating_hours: hospital.operatingHour,
          is_emergency: hospital.isEmergency,
        })) : [];

        mappedHospitals.sort((a: Hospital, b: Hospital) => a.distance - b.distance);
        setHospitals(mappedHospitals);
        setFirstAidGuideline(result.data?.firstAidGuideLine || "");

      } catch (err) {
        console.error("병원 목록 로드 오류:", err);
      }
    };
    fetchData();
  }, [currentPosition, searchParams]);

  // 병원 상세 정보 요청 함수
  const handleHospitalClick = async (h: Hospital) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://uhdiapa.com:8080";
      const queryParams = new URLSearchParams({
        'hospital-id': h.hospital_id.toString(),
        latitude: h.location.latitude.toString(),
        longitude: h.location.longitude.toString(),
      });
      const res = await fetch(`${API_URL}/hospitals/details?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`상세정보 호출 실패 ${res.status}`);
      const json = await res.json();
      console.log("백엔드 응답 (병원 상세):", json);
      setSelectedHospitalDetail(json.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("상세정보 로드 오류:", err);
    }
  };

  // 경로 안내 페이지로 이동하는 함수
  const handleDirectionsClick = () => {
    if (currentPosition && selectedHospitalDetail) {
      const params = new URLSearchParams({
        currentLat: currentPosition.lat.toString(),
        currentLng: currentPosition.lng.toString(),
        destLat: selectedHospitalDetail.latitude.toString(),
        destLng: selectedHospitalDetail.longitude.toString(),
        destName: selectedHospitalDetail.hospitalName,
      });
      router.push(`/directions?${params.toString()}`);
      setIsModalOpen(false); // 모달 닫기
    } else {
      console.error("현재 위치 또는 병원 정보가 없습니다.");
      // 사용자에게 알림을 표시할 수 있습니다.
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* 지도 영역 */}
      <div className="absolute inset-0 z-0">
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_FALLBACK_GOOGLE_MAPS_KEY"}>
          {currentPosition ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={currentPosition}
              zoom={15}
              onLoad={(map) => { mapRef.current = map; }}
              onClick={() => setActiveMarker(null)}
            >
              {currentPosition && <MarkerF position={currentPosition} />}
              {hospitals.map((hospital) => (
                <MarkerF
                  key={hospital.hospital_id}
                  position={{ lat: hospital.location.latitude, lng: hospital.location.longitude }}
                  onClick={() => {
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
            className="w-full pt-[100px]"
            textValue="진단 정보"
            title={
              <div className="px-5 py-3 flex items-center justify-between pb-0">
                <span className="font-bold text-2xl">{symptom || "증상 분석 중..."}</span>
              </div>
            }
          >
            <div className="pt-0 px-5 pb-3 font-normal text-sm whitespace-pre-line">
              {firstAidGuideline || "응급 처치 가이드라인을 불러오는 중입니다..."}
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      {/* 빈 공간 */}
      <div className="flex-grow" />

      {/* 하단 스크롤 영역 */}
      <div className="relative h-[320px] bg-white rounded-t-2xl overflow-y-auto z-10">
        {hospitals.length > 0 ? hospitals.map((h) => (
          <div key={h.hospital_id} className="flex pt-6 items-center justify-center">
            <Button
              radius="none"
              className="bg-white border-b-1.5 flex h-[72px] w-full items-center justify-center"
              onPress={() => handleHospitalClick(h)}
            >
              <div className="flex flex-col w-full gap-2 items-center justify-center">
                <div className="flex w-[315px] items-center justify-between">
                  <span className="font-bold text-2xl">{h.name}</span>
                  <span>{h.distance !== undefined ? h.distance.toFixed(2) : 'N/A'}km</span>
                </div>
                <div className="flex pt-0 w-[315px] items-center justify-between">
                  <span>{h.phone_number}</span>
                  <span>{h.operating_hours}</span>
                </div>
              </div>
            </Button>
          </div>
        )) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            주변 병원 정보를 불러오는 중이거나, 정보가 없습니다.
          </div>
        )}
      </div>

      {/* 모달 */}
      {isModalOpen && selectedHospitalDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-2xl p-6 w-80 max-w-full shadow-lg">
            <h2 className="text-xl font-bold mb-4">{selectedHospitalDetail.hospitalName}</h2>
            {selectedHospitalDetail.hospitalImage && selectedHospitalDetail.hospitalImage !== "0" ? (
              <img
                src={selectedHospitalDetail.hospitalImage}
                alt={selectedHospitalDetail.hospitalName}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
            ) : (
              <div className="w-full h-40 bg-gray-200 rounded-md mb-4 flex items-center justify-center text-gray-500">
                이미지 없음
              </div>
            )}
            <p><strong>주소:</strong> {selectedHospitalDetail.address}</p>
            <p><strong>운영시간:</strong> {selectedHospitalDetail.operatingHours}</p>
            <p><strong>전화번호:</strong> {selectedHospitalDetail.phoneNumber}</p>
            <p><strong>거리:</strong> {selectedHospitalDetail.distance !== undefined ? selectedHospitalDetail.distance.toFixed(2) : 'N/A'}km</p>
            <p><strong>응급실 여부:</strong> {selectedHospitalDetail.isEmergencyRoom ? "O" : "X"}</p>
            <p><strong>전문 진료과:</strong> {selectedHospitalDetail.specialties?.join(", ") || "정보 없음"}</p>
            <div className="mt-6 flex justify-between"> {/* 버튼 정렬 변경 */}
              <Button onPress={() => setIsModalOpen(false)} variant="bordered" className="mr-2">닫기</Button>
              <Button onPress={handleDirectionsClick} color="primary">경로 안내</Button> {/* 경로 안내 버튼 추가 */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}