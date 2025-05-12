"use client";

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, Polyline, MarkerF, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@heroui/button';

// 컴포넌트 외부에 상수로 libraries 배열 정의
const GOOGLE_MAPS_LIBRARIES: ("geometry" | "places" | "drawing" | "visualization")[] = ['geometry'];

const containerStyle = {
  width: '100%',
  height: '100vh',
};

interface LocationPoint {
  lat: number;
  lng: number;
}

// API 응답 타입 확장
interface Step {
  travelMode?: string;
  transitDetails?: {
    stopDetails: {
      departureStop?: {
        name: string;
        location: { latLng: { latitude: number; longitude: number } };
      };
      arrivalStop?: {
        name: string;
        location: { latLng: { latitude: number; longitude: number } };
      };
    };
    localizedValues?: {
      transitLine?: {
        nameShort: string;
      }
    };
  };
  polyline?: {
    encodedPolyline: string;
  };
}

interface Leg {
  steps?: Step[];
}

interface Route {
  distanceMeters: number;
  duration: string; // 예: "3600s"
  polyline: {
    encodedPolyline: string;
  };
  legs?: Leg[];
}

interface RoutesApiResponse {
  routes?: Route[];
}

interface TransitStop {
  position: LocationPoint;
  name: string;
  isTransfer: boolean;
  transitLine?: string;
}

export default function DirectionsClientComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_FALLBACK_GOOGLE_MAPS_KEY",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [transitStops, setTransitStops] = useState<TransitStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<TransitStop | null>(null);

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
    setTransitStops([]);
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

    // Routes API v2에서 사용하는 travelMode 값으로 변환
    let apiTravelMode;
    switch (travelMode) {
      case 'DRIVE':
        apiTravelMode = 'DRIVE';
        break;
      case 'WALK':
        apiTravelMode = 'WALK';
        break;
      case 'TRANSIT':
        apiTravelMode = 'TRANSIT';
        break;
      default:
        apiTravelMode = 'DRIVE';
    }

    const requestBodyBase: any = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: apiTravelMode,
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      },
      languageCode: "ko-KR",
      units: "METRIC",
    };

    if (apiTravelMode === 'DRIVE') {
      requestBodyBase.routingPreference = "TRAFFIC_AWARE";
    }

    // TRANSIT 모드는 출발 시간 설정
    if (apiTravelMode === 'TRANSIT') {
      // 현재 시간을 사용
      const now = new Date();
      requestBodyBase.departureTime = now.toISOString();
    }

    console.log("Requesting route with body:", JSON.stringify(requestBodyBase));

    // 필드마스크 조정
    let fieldMask = 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline';
    
    // TRANSIT 모드일 경우 다양한 상세 정보 요청
    if (apiTravelMode === 'TRANSIT') {
      fieldMask += ',routes.legs.steps.transitDetails,routes.legs.steps.travelMode,routes.legs.steps.polyline.encodedPolyline';
    }

    try {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(requestBodyBase),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching route:', response.status, errorData);
        const apiErrorMessage = errorData.error?.message || response.statusText;
        const userFriendlyMessage = errorData.error?.details?.[0]?.description || apiErrorMessage;
        alert(`경로 요청 실패: ${userFriendlyMessage}`);
        setRoutePath([]);
        setRouteInfo(null);
        setTransitStops([]);
        fetchCount.current = 0;
        return;
      }

      const data: RoutesApiResponse = await response.json();
      console.log('Route API Response:', data);

      if (data.routes && data.routes.length > 0 && data.routes[0].polyline) {
        const route = data.routes[0];
        
        // 기본 경로 정보 설정
        const distanceInKm = (route.distanceMeters / 1000).toFixed(2);
        const durationInSeconds = parseInt(route.duration.slice(0, -1), 10);
        const durationInMinutes = Math.round(durationInSeconds / 60);
        setRouteInfo({ distance: `${distanceInKm} km`, duration: `${durationInMinutes} 분` });

        // 주 경로 폴리라인 디코드
        const encodedPolyline = route.polyline.encodedPolyline;
        const decodedPath = google.maps.geometry.encoding.decodePath(encodedPolyline);
        setRoutePath(decodedPath.map(p => ({ lat: p.lat(), lng: p.lng() })));

        // TRANSIT 모드일 경우 추가 정보 처리
        if (apiTravelMode === 'TRANSIT' && route.legs && route.legs.length > 0) {
          const leg = route.legs[0];
          if (leg.steps) {
            const stops: TransitStop[] = [];
            
            // 각 단계별로 대중교통 정보 추출
            leg.steps.forEach((step, index) => {
              if (step.transitDetails && step.transitDetails.stopDetails) {
                const details = step.transitDetails;
                
                // 출발 정류장
                if (details.stopDetails.departureStop) {
                  const stop = details.stopDetails.departureStop;
                  const transitLine = details.localizedValues?.transitLine?.nameShort || '정보없음';
                  stops.push({
                    position: {
                      lat: stop.location.latLng.latitude,
                      lng: stop.location.latLng.longitude
                    },
                    name: stop.name,
                    isTransfer: false,
                    transitLine: transitLine
                  });
                }
                
                // 도착 정류장
                if (details.stopDetails.arrivalStop) {
                  const stop = details.stopDetails.arrivalStop;
                  stops.push({
                    position: {
                      lat: stop.location.latLng.latitude,
                      lng: stop.location.latLng.longitude
                    },
                    name: stop.name,
                    isTransfer: false
                  });
                }
              }
            });
            
            setTransitStops(stops);
          }
        } else {
          // TRANSIT 모드가 아닐 경우 정류장 정보 초기화
          setTransitStops([]);
        }

        // 지도 범위 조정
        if (mapRef.current && decodedPath.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          decodedPath.forEach(point => bounds.extend(point));
          mapRef.current.fitBounds(bounds);
        }
      } else {
        console.log('No routes found or polyline missing. API Response:', data);
        alert('경로를 찾을 수 없습니다. API에서 반환된 경로가 없습니다.');
        setRoutePath([]);
        setRouteInfo(null);
        setTransitStops([]);
      }
    } catch (error) {
      console.error('Error in fetchRoute:', error);
      alert('경로를 가져오는 중 오류가 발생했습니다.');
      setRoutePath([]);
      setRouteInfo(null);
      setTransitStops([]);
    }
  };

  useEffect(() => {
    if (isLoaded && origin && destination) {
      fetchCount.current = 0;
      setRoutePath([]);
      setRouteInfo(null);
      setTransitStops([]);
      fetchRoute();
    }
  }, [isLoaded, origin, destination, travelMode]);

  const handleTravelModeChange = (mode: string) => {
    setTravelMode(mode);
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

  // 모드별 스타일 설정
  const getPolylineOptions = () => {
    switch (travelMode) {
      case 'WALK':
        return {
          strokeColor: '#4285F4', // 파란색
          strokeOpacity: 0.8,
          strokeWeight: 4,
          icons: [{
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 2,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeWeight: 0,
            },
            offset: '0',
            repeat: '10px'
          }]
        };
      case 'DRIVE':
        return {
          strokeColor: '#DB4437', // 빨간색
          strokeOpacity: 0.8,
          strokeWeight: 5
        };
      case 'TRANSIT':
        return {
          strokeColor: '#0F9D58', // 녹색
          strokeOpacity: 0.7,
          strokeWeight: 4
        };
      default:
        return {
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 5
        };
    }
  };

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
              {travelMode === 'TRANSIT' && transitStops.length > 0 && (
                <span> (대중교통 정류장 {transitStops.length}곳)</span>
              )}
            </p>
          )}
        </div>
        <div className="flex justify-start items-center mt-2 space-x-2">
          <Button
            size="sm"
            variant={travelMode === 'WALK' ? "solid" : "bordered"}
            color="primary"
            onPress={() => handleTravelModeChange('WALK')}
            className="flex-grow md:flex-grow-0"
          >
            도보
          </Button>
          <Button
            size="sm"
            variant={travelMode === 'DRIVE' ? "solid" : "bordered"}
            color="primary"
            onPress={() => handleTravelModeChange('DRIVE')}
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
          options={{ 
            gestureHandling: 'greedy', 
            disableDefaultUI: true, 
            zoomControl: true,
            styles: travelMode === 'TRANSIT' ? [
              { featureType: "transit", elementType: "all", stylers: [{ visibility: "on" }] },
              { featureType: "transit.station", elementType: "all", stylers: [{ visibility: "on" }] },
            ] : []
          }}
          onLoad={(map) => { mapRef.current = map; }}
        >
          {isLoaded && (
            <>
              {origin && (
                <MarkerF 
                  position={origin} 
                  label={{ text: "출", color: "white" }}
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                  }}
                />
              )}
              {destination && (
                <MarkerF 
                  position={destination} 
                  label={{ text: "도", color: "white" }}
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                  }}
                />
              )}
              
              {/* 경로 폴리라인 */}
              {routePath.length > 0 && (
                <Polyline
                  path={routePath}
                  options={getPolylineOptions()}
                />
              )}
              
              {/* 대중교통 정류장 마커 */}
              {travelMode === 'TRANSIT' && transitStops.map((stop, index) => (
                <MarkerF
                  key={`transit-stop-${index}`}
                  position={stop.position}
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                    scaledSize: new google.maps.Size(25, 25)
                  }}
                  onClick={() => setSelectedStop(stop)}
                />
              ))}
              
              {/* 선택된 정류장 정보 표시 */}
              {selectedStop && (
                <InfoWindow
                  position={selectedStop.position}
                  onCloseClick={() => setSelectedStop(null)}
                >
                  <div>
                    <p className="font-medium">{selectedStop.name}</p>
                    {selectedStop.transitLine && (
                      <p className="text-sm">노선: {selectedStop.transitLine}</p>
                    )}
                  </div>
                </InfoWindow>
              )}
            </>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}