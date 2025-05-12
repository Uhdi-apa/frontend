"use client";

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, Polyline, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@heroui/button';

const containerStyle = {
  width: '100%',
  height: '100vh',
};

interface LocationPoint {
  lat: number;
  lng: number;
}

// API 응답 타입 (필요한 부분만 간략히 정의)
interface Route {
  distanceMeters: number;
  duration: string; // 예: "3600s"
  polyline: {
    encodedPolyline: string;
  };
}

interface RoutesApiResponse {
  routes?: Route[];
}

export default function DirectionsClientComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_FALLBACK_GOOGLE_MAPS_KEY",
    libraries: ['geometry'], // 폴리라인 디코딩을 위해 'geometry' 라이브러리 추가
  });

  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  const [mapCenter, setMapCenter] = useState<LocationPoint | undefined>(undefined);
  const [travelMode, setTravelMode] = useState<string>('DRIVE');

  const fetchCount = useRef(0);
  const mapRef = useRef<google.maps.Map | null>(null);

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
    fetchCount.current = 0;
    setRoutePath([]);
    setRouteInfo(null);
  }, [searchParams]);

  const fetchRoute = async () => {
    if (!isLoaded || !origin || !destination || !google || !google.maps || !google.maps.geometry) {
      console.log("API not loaded or origin/destination missing or geometry library not ready.");
      return;
    }
    if (fetchCount.current > 0) {
      return;
    }
    fetchCount.current += 1;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("API key is missing.");
      alert("API 키가 설정되지 않았습니다.");
      fetchCount.current = 0;
      return;
    }

    let apiTravelMode = travelMode.toUpperCase();
    if (travelMode.toUpperCase() === 'WALKING') apiTravelMode = 'WALK';

    const requestBody = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: apiTravelMode,
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      },
      languageCode: "ko-KR",
      units: "METRIC",
    };

    console.log("Requesting route with body:", JSON.stringify(requestBody));

    try {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.polyline.encodedPolyline',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching route:', response.status, errorData);
        alert(`경로 요청 실패: ${errorData.error?.message || response.statusText}`);
        setRoutePath([]);
        setRouteInfo(null);
        fetchCount.current = 0;
        return;
      }

      const data: RoutesApiResponse = await response.json();
      console.log('Route API Response:', data);

      if (data.routes && data.routes.length > 0 && data.routes[0].polyline) {
        const encodedPolyline = data.routes[0].polyline.encodedPolyline;
        const decodedPath = google.maps.geometry.encoding.decodePath(encodedPolyline);
        setRoutePath(decodedPath.map(p => ({ lat: p.lat(), lng: p.lng() })));

        const route = data.routes[0];
        const distanceInKm = (route.distanceMeters / 1000).toFixed(2);
        const durationInSeconds = parseInt(route.duration.slice(0, -1), 10);
        const durationInMinutes = Math.round(durationInSeconds / 60);
        setRouteInfo({ distance: `${distanceInKm} km`, duration: `${durationInMinutes} 분` });

        if (mapRef.current && decodedPath.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          decodedPath.forEach(point => bounds.extend(point));
          mapRef.current.fitBounds(bounds);
        }
      } else {
        console.log('No routes found or polyline missing.');
        alert('경로를 찾을 수 없습니다.');
        setRoutePath([]);
        setRouteInfo(null);
      }
    } catch (error) {
      console.error('Error in fetchRoute:', error);
      alert('경로를 가져오는 중 오류가 발생했습니다.');
      setRoutePath([]);
      setRouteInfo(null);
    }
  };

  useEffect(() => {
    if (isLoaded && origin && destination) {
      fetchCount.current = 0;
      setRoutePath([]);
      setRouteInfo(null);
      fetchRoute();
    }
  }, [isLoaded, origin, destination, travelMode]);

  const handleTravelModeChange = (mode: string) => {
    if (mode === 'WALKING') {
      setTravelMode('WALK');
    } else if (mode === 'DRIVING') {
      setTravelMode('DRIVE');
    } else if (mode === 'TRANSIT') {
      setTravelMode('TRANSIT');
    } else {
      setTravelMode(mode);
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

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-0 left-0 right-0 h-auto min-h-[120px] bg-white p-3 shadow-lg z-10 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium truncate">
            <strong>출발지:</strong> 현재 위치 ({origin ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : '로딩 중...'})
          </p>
          <p className="text-sm font-medium mt-1 truncate">
            <strong>목적지:</strong> {destinationName} ({destination ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : '로딩 중...'})
          </p>
          {routeInfo && (
            <p className="text-sm font-medium mt-1">
              <strong>예상:</strong> {routeInfo.duration}, {routeInfo.distance}
            </p>
          )}
        </div>
        <div className="flex justify-start items-center mt-2 space-x-2">
          <Button
            size="sm"
            variant={travelMode === 'WALK' ? "solid" : "bordered"}
            color="primary"
            onPress={() => handleTravelModeChange('WALKING')}
            className="flex-grow md:flex-grow-0"
          >
            도보
          </Button>
          <Button
            size="sm"
            variant={travelMode === 'DRIVE' ? "solid" : "bordered"}
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
            className="ml-auto px-3 py-1.5"
          >
            뒤로
          </Button>
        </div>
      </div>

      <div className="absolute top-[140px] left-0 right-0 bottom-0">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={15}
          options={{ gestureHandling: 'greedy', disableDefaultUI: true, zoomControl: true }}
          onLoad={(map) => { mapRef.current = map; }}
        >
          {isLoaded && (
            <>
              {origin && <MarkerF position={origin} label="출" />}
              {destination && <MarkerF position={destination} label="도" />}
              {routePath.length > 0 && (
                <Polyline
                  path={routePath}
                  options={{
                    strokeColor: '#FF0000',
                    strokeOpacity: 0.8,
                    strokeWeight: 5,
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