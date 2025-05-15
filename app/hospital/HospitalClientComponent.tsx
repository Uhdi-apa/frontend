"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { useSearchParams, useRouter } from 'next/navigation';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';

// Map container style
const containerStyle = {
  width: "100%",
  height: "100%",
};

// Hospital type for bottom list
interface Hospital {
  hospital_id: number;
  name: string;
  location: { latitude: number; longitude: number };
  distance: number;
  phone_number: string;
  operating_hours: string;
  is_emergency: boolean;
}

// Hospital detail type for modal display
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
  const router = useRouter();
  
  const { isLoaded, loadError, googleMaps } = useGoogleMaps();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [firstAidGuideline, setFirstAidGuideline] = useState<string>("");
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [symptom, setSymptom] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHospitalDetail, setSelectedHospitalDetail] = useState<HospitalDetail | null>(null);
  const [activeMarker, setActiveMarker] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Flag to track data request status
  const hasRequestedData = useRef(false);

  // Position update handler - modified to call only once
  const updatePosition = (position: GeolocationPosition) => {
    const pos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    
    // Set position only if current position is null (first time)
    if (!currentPosition) {
      setCurrentPosition(pos);
      mapRef.current?.panTo(pos);
    }
  };

  // Initial position check - removed watchPosition and using getCurrentPosition only
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        updatePosition,
        (error) => console.error("Error getting position:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
    
    // No cleanup function needed as watchPosition was removed
  }, []);

  // Load hospital list - modified to request only once
  useEffect(() => {
    // Don't execute if data already requested or position not available
    if (hasRequestedData.current || !currentPosition) return;

    const symptomTextFromQuery = searchParams.get("symptom") || "No symptom information";

    const fetchData = async () => {
      // Set flag before starting request
      hasRequestedData.current = true;
      
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
          throw new Error(`Server response error: ${response.status}`);
          // Flag remains set even in case of error (no retry)
        }

        const result = await response.json();
        console.log("Backend response (recommended hospitals):", result);

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
        console.error("Error loading hospital list:", err);
        // Reset flag to allow retry if needed
        // hasRequestedData.current = false;
      }
    };
    
    fetchData();
  }, [currentPosition, searchParams]); // Dependencies array maintained (allows new request if search params change)

  // Added manual refresh function (use if needed)
  const handleRefreshData = () => {
    if (!currentPosition) return;
    
    // Reset flag and request data again
    hasRequestedData.current = false;
    // Slightly modify currentPosition to trigger useEffect
    setCurrentPosition({...currentPosition});
  };

  // Hospital selection handler
  const handleHospitalClick = (hospital: Hospital) => {
    if (!currentPosition) {
      console.error("Current location information not available.");
      return;
    }
    
    setIsLoading(true);

    const params = new URLSearchParams({
      currentLat: currentPosition.lat.toString(),
      currentLng: currentPosition.lng.toString(),
      destLat: hospital.location.latitude.toString(),
      destLng: hospital.location.longitude.toString(),
      destName: hospital.name,
    });
    
    router.push(`/directions?${params.toString()}`);
  };

  // Function to navigate to directions page
  const handleDirectionsClick = () => {
    if (currentPosition && selectedHospitalDetail) {
      setIsLoading(true); // Add loading indicator
      
      const params = new URLSearchParams({
        currentLat: currentPosition.lat.toString(),
        currentLng: currentPosition.lng.toString(),
        destLat: selectedHospitalDetail.latitude.toString(),
        destLng: selectedHospitalDetail.longitude.toString(),
        destName: selectedHospitalDetail.hospitalName,
      });
      router.push(`/directions?${params.toString()}`);
      setIsModalOpen(false);
    } else {
      console.error("Current location or hospital information not available.");
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <div className="text-xl font-semibold">Loading directions...</div>
        </div>
      )}
      
      {/* Map area */}
      <div className="absolute inset-0 z-0">
        {isLoaded && currentPosition ? (
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
            {loadError ? `Map loading error: ${loadError.message}` : "Getting location information..."}
          </div>
        )}
      </div>

      {/* Top accordion */}
      <div className="w-full z-10 relative">
        <Accordion variant="shadow" className="bg-white rounded-b-2xl shadow-xl overflow-hidden">
          <AccordionItem
            key="defaultStatement"
            className="w-full pt-[100px]"
            textValue="Diagnosis Information"
            title={
              <div className="px-5 py-3 flex items-center justify-between pb-0">
                <span className="font-bold text-2xl">{symptom || "Analyzing symptoms..."}</span>
              </div>
            }
          >
            <div className="pt-0 px-5 pb-3 font-normal text-sm whitespace-pre-line">
              {firstAidGuideline || "Loading first aid guidelines..."}
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Empty space */}
      <div className="flex-grow" />

      {/* Bottom scroll area */}
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
            Loading nearby hospital information, or no information available.
          </div>
        )}
      </div>

      {/* Modal */}
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
                No image
              </div>
            )}
            <p><strong>Address:</strong> {selectedHospitalDetail.address}</p>
            <p><strong>Hours:</strong> {selectedHospitalDetail.operatingHours}</p>
            <p><strong>Phone:</strong> {selectedHospitalDetail.phoneNumber}</p>
            <p><strong>Distance:</strong> {selectedHospitalDetail.distance !== undefined ? selectedHospitalDetail.distance.toFixed(2) : 'N/A'}km</p>
            <p><strong>Emergency Room:</strong> {selectedHospitalDetail.isEmergencyRoom ? "Yes" : "No"}</p>
            <p><strong>Specialties:</strong> {selectedHospitalDetail.specialties?.join(", ") || "No information"}</p>
            <div className="mt-6 flex justify-between">
              <Button onPress={() => setIsModalOpen(false)} variant="bordered" className="mr-2">Close</Button>
              <Button onPress={handleDirectionsClick} color="primary">Get Directions</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}