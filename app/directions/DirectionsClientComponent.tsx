"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { GoogleMap, DirectionsService, DirectionsRenderer, InfoWindow, Circle } from '@react-google-maps/api';
import { Button } from '@heroui/button';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';

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

  const { isLoaded, loadError, googleMaps } = useGoogleMaps();

  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [transitStops, setTransitStops] = useState<TransitStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<TransitStop | null>(null);

  const [mapCenter, setMapCenter] = useState<LocationPoint | undefined>(undefined);
  const [googleInitialized, setGoogleInitialized] = useState(false);

  const [currentPosition, setCurrentPosition] = useState<LocationPoint | null>(null);
  const locationAccuracy = 10;
  const watchPositionId = useRef<number | null>(null);

  const directionsCallback = useRef<((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => void) | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsRequestSent = useRef(false);

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error("This browser does not support location tracking.");
      return;
    }

    if (watchPositionId.current !== null) {
      navigator.geolocation.clearWatch(watchPositionId.current);
    }

    watchPositionId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setCurrentPosition(newPosition);

        if (mapRef.current) {
          mapRef.current.panTo(newPosition);
        }
      },
      (error) => {
        console.error("Location tracking error:", error);
        alert(`Failed to retrieve location: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );
  }, []);

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
    if (!origin || !destination || !isLoaded || !googleMaps) return null;

    return {
      origin: origin,
      destination: destination,
      travelMode: googleMaps.TravelMode.TRANSIT,
      provideRouteAlternatives: false,
      unitSystem: googleMaps.UnitSystem.METRIC,
      transitOptions: {
        departureTime: new Date(),
      }
    };
  }, [origin, destination, isLoaded, googleMaps]);

  const rendererOptions = useMemo(() => ({
    directions: directionsResponse,
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: '#0F9D58',
      strokeOpacity: 0.8,
      strokeWeight: 5
    }
  }), [directionsResponse]);

  const stopMarkerIcon = useMemo(() => {
    if (!isLoaded || !googleMaps) return { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' };

    return {
      url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
      scaledSize: new googleMaps.Size(25, 25)
    };
  }, [isLoaded, googleMaps]);

  const userLocationCircleOptions = useMemo(() => ({
    fillColor: '#1E90FF',
    fillOpacity: 0.6,
    strokeColor: '#FFFFFF',
    strokeOpacity: 1,
    strokeWeight: 2,
    zIndex: 1000,
  }), []);

  const accuracyCircleOptions = useMemo(() => ({
    fillColor: '#4285F4',
    fillOpacity: 0.15,
    strokeColor: '#4285F4',
    strokeOpacity: 0.5,
    strokeWeight: 1,
    zIndex: 3,
  }), []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setGoogleInitialized(true);
  }, []);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleCenterToCurrentLocation = useCallback(() => {
    if (mapRef.current && currentPosition) {
      mapRef.current.panTo(currentPosition);
      mapRef.current.setZoom(18);
    }
  }, [currentPosition]);

  useEffect(() => {
    const currentLat = parseFloat(searchParams.get('currentLat') || '');
    const currentLng = parseFloat(searchParams.get('currentLng') || '');
    const destLat = parseFloat(searchParams.get('destLat') || '');
    const destLng = parseFloat(searchParams.get('destLng') || '');
    const destNameParam = searchParams.get('destName') || 'Destination';

    if (!isNaN(currentLat) && !isNaN(currentLng)) {
      const initialOrigin = { lat: currentLat, lng: currentLng };
      setOrigin(initialOrigin);
      setMapCenter(initialOrigin);
      setCurrentPosition(initialOrigin);
    }
    if (!isNaN(destLat) && !isNaN(destLng)) {
      setDestination({ lat: destLat, lng: destLng });
    }
    setDestinationName(destNameParam);

    setDirectionsResponse(null);
    setRouteInfo(null);
    setTransitStops([]);
    directionsRequestSent.current = false;

  }, [searchParams]);

  useEffect(() => {
    if (isLoaded) {
      startLocationTracking();
    }

    return () => {
      if (watchPositionId.current !== null) {
        navigator.geolocation.clearWatch(watchPositionId.current);
      }
    };
  }, [isLoaded, startLocationTracking]);

  useEffect(() => {
    if (!isLoaded || !googleMaps) return;

    directionsCallback.current = (
      result: google.maps.DirectionsResult | null,
      status: google.maps.DirectionsStatus
    ) => {
      console.log(`Directions Request Status: ${status}`);

      if (status === googleMaps.DirectionsStatus.OK && result) {
        console.log('Directions Response:', result);
        setDirectionsResponse(result);
        directionsRequestSent.current = true;
      } else {
        console.error(`Directions request failed. Status: ${status}`);
        alert(`Unable to find a route. ${status}`);
        setDirectionsResponse(null);
        setRouteInfo(null);
        directionsRequestSent.current = true;
      }
    };
  }, [isLoaded, googleMaps]);

  if (loadError) {
    return <div>Error loading maps: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">
          Loading map...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-0 left-0 right-0 h-auto min-h-[120px] bg-white p-3 shadow-lg z-10 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium truncate">
            <strong>Origin:</strong> Current Location ({currentPosition ? `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}` : 'Loading...'})
          </p>
          <p className="text-sm font-medium mt-1 truncate">
            <strong>Destination:</strong> {destinationName} ({destination ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : 'Loading...'})
          </p>
          {routeInfo && (
            <p className="text-sm font-medium mt-1">
              <strong>ETA:</strong> {routeInfo.duration}, {routeInfo.distance}
              {transitStops.length > 0 && (
                <span> ({transitStops.length} transit stops)</span>
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
            Public Transit
          </Button>
          <Button
            size="sm"
            variant="bordered"
            color="primary"
            onPress={handleCenterToCurrentLocation}
            className="flex-grow-0"
            isDisabled={!currentPosition}
          >
            Current Location
          </Button>
          <Button
            size="sm"
            variant="light"
            onPress={handleGoBack}
            className="ml-auto px-3 py-1.5"
          >
            Back
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
          {directionsOptions && !directionsResponse && !directionsRequestSent.current &&
            directionsCallback.current && googleMaps && (
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

          {googleInitialized && currentPosition && (
            <>
              <Circle
                center={currentPosition}
                radius={6}
                options={userLocationCircleOptions}
              />
              <Circle
                center={currentPosition}
                radius={locationAccuracy}
                options={accuracyCircleOptions}
              />
            </>
          )}

          {googleInitialized && transitStops.map((stop, index) => (
            <Circle
              key={`transit-stop-${index}`}
              center={stop.position}
              radius={5}
              options={{
                fillColor: '#0F9D58',
                fillOpacity: 0.7,
                strokeColor: '#FFFFFF',
                strokeOpacity: 1,
                strokeWeight: 2,
                zIndex: 500,
              }}
              onClick={() => setSelectedStop(stop)}
            />
          ))}

          {googleInitialized && selectedStop && (
            <InfoWindow
              position={selectedStop.position}
              onCloseClick={() => setSelectedStop(null)}
            >
              <div>
                <p className="font-medium">{selectedStop.name}</p>
                {selectedStop.transitLine && (
                  <p className="text-sm">Line: {selectedStop.transitLine}</p>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}