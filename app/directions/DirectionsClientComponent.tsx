/* eslint-disable react/jsx-sort-props */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable padding-line-between-statements */
/* eslint-disable prettier/prettier */
"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, DirectionsService, DirectionsRenderer, MarkerF, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
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
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [transitStops, setTransitStops] = useState<TransitStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<TransitStop | null>(null);

  const [mapCenter, setMapCenter] = useState<LocationPoint | undefined>(undefined);

  const directionsCallback = useRef<((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => void) | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const mapOptions = useMemo(() => ({
    gestureHandling: 'greedy', 
    disableDefaultUI: true, 
    zoomControl: true,
    styles: [
      { featureType: "transit", elementType: "all", stylers: [{ visibility: "on" }] },
      { featureType: "transit.station", elementType: "all", stylers: [{ visibility: "on" }] },
    ]
  }), []);

  const directionsOptions = useMemo(() => {
    if (!origin || !destination || !isLoaded) return null;
    
    return {
      origin: origin,
      destination: destination,
      travelMode: isLoaded ? google.maps.TravelMode.TRANSIT : google.maps.TravelMode.TRANSIT,
      provideRouteAlternatives: false,
      unitSystem: google.maps.UnitSystem.METRIC,
      transitOptions: {
        departureTime: new Date(),
      }
    };
  }, [origin, destination, isLoaded]);

  const rendererOptions = useMemo(() => ({
    directions: directionsResponse,
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: '#0F9D58',
      strokeOpacity: 0.8,
      strokeWeight: 5
    }
  }), [directionsResponse]);

  const stopMarkerIcon = useMemo(() => ({
    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
    scaledSize: isLoaded ? new google.maps.Size(25, 25) : undefined
  }), [isLoaded]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

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
    
    // 경로 데이터 초기화
    setDirectionsResponse(null);
    setRouteInfo(null);
    setTransitStops([]);
  }, [searchParams]);

  useEffect(() => {
    if (directionsResponse) {
      const stops: TransitStop[] = [];

      if (directionsResponse.routes && directionsResponse.routes.length > 0) {
        const route = directionsResponse.routes[0];
        if (route.legs && route.legs.length > 0) {
          route.legs.forEach(leg => {
            if (leg.steps) {
              leg.steps.forEach(step => {
                if (step.travel_mode === google.maps.TravelMode.TRANSIT && step.transit) {
                  if (step.transit.departure_stop) {
                    stops.push({
                      position: {
                        lat: step.transit.departure_stop.location.lat(),
                        lng: step.transit.departure_stop.location.lng()
                      },
                      name: step.transit.departure_stop.name,
                      isTransfer: false,
                      transitLine: step.transit.line?.short_name || step.transit.line?.name
                    });
                  }
                  
                  if (step.transit.arrival_stop) {
                    stops.push({
                      position: {
                        lat: step.transit.arrival_stop.location.lat(),
                        lng: step.transit.arrival_stop.location.lng()
                      },
                      name: step.transit.arrival_stop.name,
                      isTransfer: false
                    });
                  }
                }
              });
            }
          });
        }
      }
      
      setTransitStops(stops);
    } else {
      setTransitStops([]);
    }
  }, [directionsResponse]);

  useEffect(() => {
    if (directionsResponse) {
      if (directionsResponse.routes && directionsResponse.routes.length > 0) {
        const route = directionsResponse.routes[0];
        if (route.legs && route.legs.length > 0) {
          const leg = route.legs[0];
          
          const distance = leg.distance?.text || '';
          const duration = leg.duration?.text || '';
          setRouteInfo({ distance, duration });
          
          if (mapRef.current && route.bounds) {
            mapRef.current.fitBounds(route.bounds);
          }
        }
      }
    }
  }, [directionsResponse]);

  useEffect(() => {
    directionsCallback.current = (
      result: google.maps.DirectionsResult | null,
      status: google.maps.DirectionsStatus
    ) => {
      console.log(`Directions Request Status: ${status}`);
      
      if (status === google.maps.DirectionsStatus.OK && result) {
        console.log('Directions Response:', result);
        setDirectionsResponse(result);
      } else {
        console.error(`Directions request failed. Status: ${status}`);
        alert(`경로를 찾을 수 없습니다. ${status}`);
        setDirectionsResponse(null);
        setRouteInfo(null);
      }
    };
  }, []);

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
              {transitStops.length > 0 && (
                <span> (대중교통 정류장 {transitStops.length}곳)</span>
              )}
            </p>
          )}
        </div>
        <div className="flex justify-start items-center mt-2 space-x-2">
          <Button
            size="sm"
            variant="solid"
            color="primary"
            className="flex-grow md:flex-grow-0"
            disabled
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
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {directionsOptions && !directionsResponse && directionsCallback.current && (
            <DirectionsService
              options={directionsOptions}
              callback={directionsCallback.current}
            />
          )}
          
          {directionsResponse && (
            <DirectionsRenderer
              options={rendererOptions}
            />
          )}
          
          {transitStops.map((stop, index) => (
            <MarkerF
              key={`transit-stop-${index}`}
              position={stop.position}
              icon={stopMarkerIcon}
              onClick={() => setSelectedStop(stop)}
            />
          ))}
          
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
        </GoogleMap>
      </div>
    </div>
  );
}