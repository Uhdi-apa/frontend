/* eslint-disable prettier/prettier */
"use client";
import { useState, useEffect } from "react";
import { Textarea } from "@heroui/input";
import { Button } from "@heroui/button";
import { useRouter } from "next/navigation";

export default function Symptom() {
  const router = useRouter();
  const [symptom, setSymptom] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Validate symptom input and manage button activation state
  useEffect(() => {
    setIsValid(!!symptom.trim());
  }, [symptom]);

  // Get current location information when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
          setIsLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location information:", error);
          setLocationError("Unable to retrieve location information. Symptoms will be searched with default value (0,0).");
          setCurrentPosition({ latitude: 0, longitude: 0 });
          setIsLocationLoading(false);
        }
      );
    } else {
      setLocationError("Your browser doesn't support location services. Symptoms will be searched with default value (0,0).");
      setCurrentPosition({ latitude: 0, longitude: 0 });
      setIsLocationLoading(false);
    }
  }, []);

  // Function to navigate to next page
  const handleNextClick = async () => {
    if (!isValid || isLocationLoading || !currentPosition) {
      if (isLocationLoading) {
        alert("Location information is being retrieved. Please try again later.");
      } else if (!currentPosition) {
        alert("Location information is not set. Please refresh the page or try again later.");
      }
      return;
    }

    try {
      // Server communication logic removed
      // const API_URL = "http://43.200.107.7:8080";

      // const response = await fetch(`${API_URL}/hospitals/recommend/by-symptoms`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     prompt: symptom.trim(),
      //     latitude: currentPosition.latitude,
      //     longitude: currentPosition.longitude,
      //   }),
      // });

      // if (!response.ok) {
      //   throw new Error(`Server response error: ${response.status}`);
      // }

      // const result = await response.json();

      // console.log("Backend response:", result);

      // Pass symptom information to hospital page
      router.push(`/hospital?symptom=${encodeURIComponent(symptom.trim())}`);
    } catch (error) {
      // Error handling logic is maintained (e.g., routing failures or unexpected errors)
      console.error("Failed to navigate to page:", error);
      alert(`Failed to navigate to the page: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <>
      <div className="pt-32">
        <p className="flex font-bold text-2xl">Please describe your symptoms.</p>
        <p className="flex font-normal text-sm pt-2">
          Describing your symptoms and what kind of specialist help you need will help AI better understand your issue.
        </p>
        {isLocationLoading && (
          <p className="text-sm text-gray-500 pt-2">Getting your location...</p>
        )}
        {locationError && !isLocationLoading && (
          <p className="text-sm text-red-500 pt-2">{locationError}</p>
        )}
      </div>
      <div className="pt-14">
        <div className="flex items-center">
          <div className="flex w-full">
            <Textarea
              isRequired
              placeholder="Enter your symptoms."
              variant="bordered"
              className="w-full"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="fixed bottom-8 left-0 right-0 flex justify-center w-full px-4">
        <Button
          className={`w-full max-w-lg ${isValid && !isLocationLoading ? "bg-primary text-white" : "bg-[#EDEDED]"}`}
          radius="full"
          onPress={handleNextClick}
          isDisabled={!isValid || isLocationLoading}
        >
          Next
        </Button>
      </div>
    </>
  );
}
