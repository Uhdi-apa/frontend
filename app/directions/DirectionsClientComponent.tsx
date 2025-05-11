"use client";

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, DirectionsService, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api'; // useJsApiLoader 추가
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

  const { isLoaded, loadError } = useJsApiLoader({ // useJsApiLoader 사용
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_FALLBACK_GOOGLE_MAPS_KEY",
    // libraries: ['places'], // 필요한 경우 다른 라이브러리 추가
  });

  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [mapCenter, setMapCenter] = useState<LocationPoint | undefined>(undefined);
  // travelMode 초기값을 string으로 변경하고, API 로드 후 google.maps 객체 사용
  const [travelMode, setTravelMode] = useState<string>('DRIVING'); // 초기값을 string으로

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

  }, [searchParams]);

  const directionsCallback = (
    response: google.maps.DirectionsResult | null,
    status: google.maps.DirectionsStatus
  ) => {
    if (status === 'OK' && response) {
      setDirectionsResponse(response);
    } else {
      console.error(`Directions request failed due to ${status}`);
    }
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

  // isLoaded가 true가 된 이후에 google.maps 객체에 접근
  const currentTravelMode = google.maps.TravelMode[travelMode as keyof typeof google.maps.TravelMode];

  return (
    <div className="relative w-full h-screen">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={15}
      >
        {origin && destination && (
          <>
            {!directionsResponse && count.current === 0 && (
              <DirectionsService
                options={{
                  destination: destination,
                  origin: origin,
                  travelMode: currentTravelMode, // 수정된 travelMode 사용
                }}
                callback={(response, status) => {
                  count.current += 1;
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
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded shadow-lg">
        <h2 className="text-lg font-semibold mb-2">경로 안내</h2>
        <p><strong>출발지:</strong> 현재 위치</p>
        <p><strong>목적지:</strong> {destinationName}</p>
        <div className="mt-2">
          <span className="mr-2">이동 수단:</span>
          <select
            value={travelMode} // string 값 사용
            onChange={(e) => {
              setTravelMode(e.target.value); // string 값으로 설정
              setDirectionsResponse(null);
              count.current = 0;
            }}
            className="border rounded p-1"
          >
            {/* google.maps 객체가 로드된 후 옵션 렌더링 */}
            {Object.keys(google.maps.TravelMode).map((mode) => (
              <option key={mode} value={mode}>
                {mode.charAt(0) + mode.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <Button onPress={() => router.back()} className="mt-4 w-full">
          뒤로가기
        </Button>
      </div>
    </div>
  );
}