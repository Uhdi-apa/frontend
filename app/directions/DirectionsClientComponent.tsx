"use client";

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, LoadScript, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import { Button } from '@heroui/button'; // 뒤로가기 버튼용

const containerStyle = {
  width: '100%',
  height: '100vh', // 전체 화면 높이
};

interface LocationPoint {
  lat: number;
  lng: number;
}

export default function DirectionsClientComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [mapCenter, setMapCenter] = useState<LocationPoint | undefined>(undefined);
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode>(google.maps.TravelMode.DRIVING);

  const count = useRef(0); // DirectionsService 재요청 방지용

  useEffect(() => {
    const currentLat = parseFloat(searchParams.get('currentLat') || '');
    const currentLng = parseFloat(searchParams.get('currentLng') || '');
    const destLat = parseFloat(searchParams.get('destLat') || '');
    const destLng = parseFloat(searchParams.get('destLng') || '');
    const destNameParam = searchParams.get('destName') || '목적지';

    if (!isNaN(currentLat) && !isNaN(currentLng)) {
      setOrigin({ lat: currentLat, lng: currentLng });
      setMapCenter({ lat: currentLat, lng: currentLng }); // 초기 지도 중심은 현재 위치
    }
    if (!isNaN(destLat) && !isNaN(destLng)) {
      setDestination({ lat: destLat, lng: destLng });
    }
    setDestinationName(destNameParam);

  }, [searchParams]);

  const directionsCallback = (
    response: google.maps.DirectionsResult | null,
    status: google.maps.DirectionsStatus
  ) => {
    if (status === 'OK' && response) {
      setDirectionsResponse(response);
      // 경로가 설정되면 지도의 경계를 경로에 맞게 조정할 수 있습니다.
      // 여기서는 DirectionsRenderer가 자동으로 처리해 줄 수 있습니다.
    } else {
      console.error(`Directions request failed due to ${status}`);
      // 사용자에게 오류 알림
    }
  };

  return (
    <div className="relative w-full h-screen">
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_FALLBACK_GOOGLE_MAPS_KEY"}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter} // 초기 중심 설정
          zoom={15} // 초기 줌 레벨
        >
          {origin && destination && (
            <>
              {!directionsResponse && count.current === 0 && ( // DirectionsService는 한 번만 호출되도록 count 사용
                <DirectionsService
                  options={{
                    destination: destination,
                    origin: origin,
                    travelMode: travelMode,
                  }}
                  callback={(response, status) => {
                    count.current += 1; // 호출 횟수 증가
                    directionsCallback(response, status);
                  }}
                />
              )}
              {directionsResponse && (
                <DirectionsRenderer
                  options={{
                    directions: directionsResponse,
                  }}
                />
              )}
            </>
          )}
        </GoogleMap>
      </LoadScript>
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded shadow-lg">
        <h2 className="text-lg font-semibold mb-2">경로 안내</h2>
        <p><strong>출발지:</strong> 현재 위치</p>
        <p><strong>목적지:</strong> {destinationName}</p>
        <div className="mt-2">
          <span className="mr-2">이동 수단:</span>
          <select
            value={travelMode}
            onChange={(e) => {
              setTravelMode(e.target.value as google.maps.TravelMode);
              setDirectionsResponse(null); // 이동 수단 변경 시 경로 재요청
              count.current = 0; // 재요청을 위해 count 초기화
            }}
            className="border rounded p-1"
          >
            <option value={google.maps.TravelMode.DRIVING}>자동차</option>
            <option value={google.maps.TravelMode.WALKING}>도보</option>
            <option value={google.maps.TravelMode.TRANSIT}>대중교통</option>
            <option value={google.maps.TravelMode.BICYCLING}>자전거</option>
          </select>
        </div>
        <Button onPress={() => router.back()} className="mt-4 w-full">
          뒤로가기
        </Button>
      </div>
    </div>
  );
}