"use client";

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, DirectionsService, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@heroui/button';

const containerStyle = {
  width: '100%',
  height: '100vh',
};

interface LocationPoint {
  lat: number;
  lng: number;
}

export default function DirectionsClientComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_FALLBACK_GOOGLE_MAPS_KEY",
  });

  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [mapCenter, setMapCenter] = useState<LocationPoint | undefined>(undefined);
  const [travelMode, setTravelMode] = useState<string>('DRIVING'); // 기본값 자동차

  const count = useRef(0);

  useEffect(() => {
    const currentLat = parseFloat(searchParams.get('currentLat') || '');
    const currentLng = parseFloat(searchParams.get('currentLng') || '');
    const destLat = parseFloat(searchParams.get('destLat') || '');
    const destLng = parseFloat(searchParams.get('destLng') || '');
    const destNameParam = searchParams.get('destName') || '목적지';

    if (!isNaN(currentLat) && !isNaN(currentLng)) {
      setOrigin({ lat: currentLat, lng: currentLng });
      setMapCenter({ lat: currentLat, lng: currentLng });
    }
    if (!isNaN(destLat) && !isNaN(destLng)) {
      setDestination({ lat: destLat, lng: destLng });
    }
    setDestinationName(destNameParam);
    // 컴포넌트 마운트 시 또는 origin/destination 변경 시 경로 재요청을 위해 count 초기화
    count.current = 0;
    setDirectionsResponse(null);
  }, [searchParams]);

  const directionsCallback = (
    response: google.maps.DirectionsResult | null,
    status: google.maps.DirectionsStatus
  ) => {
    console.log(`Directions Request Details:
      Mode: ${travelMode},
      Origin: ${JSON.stringify(origin)},
      Destination: ${JSON.stringify(destination)},
      Status: ${status}`);

    if (status === google.maps.DirectionsStatus.OK && response) {
      console.log('Directions Response:', response);
      setDirectionsResponse(response);
    } else {
      console.error(`Directions request failed for mode ${travelMode}. Status: ${status}`);
      setDirectionsResponse(null);
      // 사용자에게 알림 (예: alert 또는 토스트 메시지)
      if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
        alert(`선택하신 이동 수단(${travelMode})에 대한 경로를 찾을 수 없습니다.`);
      } else {
        alert(`경로 요청에 실패했습니다. 상태: ${status}`);
      }
    }
  };

  const handleTravelModeChange = (mode: string) => {
    setTravelMode(mode);
    setDirectionsResponse(null); // 이전 경로 지우기
    count.current = 0; // 경로 재요청 허용
  };

  if (loadError) {
    return <div>Error loading maps: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">
          지도를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  const currentTravelModeKey = travelMode as keyof typeof google.maps.TravelMode;
  const currentGoogleTravelMode = google.maps.TravelMode[currentTravelModeKey] || google.maps.TravelMode.DRIVING;

  return (
    <div className="relative w-full h-screen">
      {/* 상단 정보 및 컨트롤 패널 */}
      <div className="absolute top-0 left-0 right-0 h-[120px] bg-white p-3 shadow-lg z-10 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium truncate">
            <strong>출발지:</strong> 현재 위치 ({origin ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : '로딩 중...'})
          </p>
          <p className="text-sm font-medium mt-1 truncate">
            <strong>목적지:</strong> {destinationName} ({destination ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : '로딩 중...'})
          </p>
        </div>
        <div className="flex justify-start items-center mt-2 space-x-2">
          <Button
            size="sm"
            variant={travelMode === 'WALKING' ? "solid" : "bordered"}
            color="primary"
            onPress={() => handleTravelModeChange('WALKING')}
            className="flex-grow md:flex-grow-0"
          >
            도보
          </Button>
          <Button
            size="sm"
            variant={travelMode === 'DRIVING' ? "solid" : "bordered"}
            color="primary"
            onPress={() => handleTravelModeChange('DRIVING')}
            className="flex-grow md:flex-grow-0"
          >
            자동차
          </Button>
          <Button
            size="sm"
            variant={travelMode === 'TRANSIT' ? "solid" : "bordered"}
            color="primary"
            onPress={() => handleTravelModeChange('TRANSIT')}
            className="flex-grow md:flex-grow-0"
          >
            대중교통
          </Button>
          <Button 
            size="sm" 
            variant="light" 
            onPress={() => router.back()} 
            className="ml-auto px-3 py-1.5" // ml-auto로 오른쪽 정렬, 패딩 조정
          >
            뒤로
          </Button>
        </div>
      </div>

      {/* 지도 영역 (상단 패널 높이만큼 아래로 이동) */}
      <div className="absolute top-[120px] left-0 right-0 bottom-0">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={15}
          options={{ gestureHandling: 'greedy', disableDefaultUI: true, zoomControl: true }} // 모바일 제스처 및 UI 개선
        >
          {isLoaded && origin && destination && (
            <>
              {/* count.current가 0이고, directionsResponse가 없을 때만 DirectionsService 호출 */}
              {!directionsResponse && count.current === 0 && (
                <DirectionsService
                  options={{
                    destination: destination,
                    origin: origin,
                    travelMode: currentGoogleTravelMode,
                  }}
                  callback={(response, status) => {
                    if (count.current === 0) { // 중복 콜백 방지 (선택적)
                       count.current += 1;
                       directionsCallback(response, status);
                    }
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
      </div>
    </div>
  );
}