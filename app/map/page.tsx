"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { Accordion, AccordionItem } from "@heroui/accordion";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 37.5665,
  lng: 126.9780,
};

export default function Map() {
  const defaultContent =
    "상처를 깨끗한 물과 비누로 5분 이상 충분히 씻어내고 과산화수소, 베타딘 또는 알코올 소독제로 상처를 소독하세요.";

  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const updatePosition = (position: GeolocationPosition) => {
    const pos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    setCurrentPosition(pos);
    if (mapRef.current) {
      mapRef.current.panTo(pos);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(updatePosition);
    }
  };

  useEffect(() => {
    handleGetLocation();

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        updatePosition,
        console.error,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 상단 고정 아코디언 UI */}
      <div className="fixed top-0 inset-x-0 z-10">
        <Accordion
          variant="shadow"
          className="bg-white rounded-b-2xl shadow-xl overflow-hidden"
        >
          <AccordionItem
            key="tetanus"
            title={
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="font-bold text-2xl">상처로 인한 파상풍</span>
              </div>
            }
            className="w-full pt-32"
          >
            <div className="px-5 pb-6 font-normal text-sm whitespace-pre-line">
              {defaultContent}
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      {/* 전체 페이지 지도 */}
      <div className="relative h-screen w-screen pt-32 z-0">
        <LoadScript googleMapsApiKey="AIzaSyB7RIJvUZduw2og9PaFX20-3AV6dmMerhA">
          {currentPosition ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={currentPosition}
              zoom={15}
              onLoad={(map) => (mapRef.current = map)}
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

      {/* 내 위치로 이동 버튼 */}
      <button
        onClick={handleGetLocation}
        className="fixed bottom-5 right-5 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-20"
      >
        내 위치로 이동
      </button>
    </>
  );
}
