"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLoadScript, Libraries } from '@react-google-maps/api';

// Google Maps 라이브러리 상수 정의 - 모든 컴포넌트에서 공유
const GOOGLE_MAPS_LIBRARIES: Libraries = ['geometry', 'places'];

// 컨텍스트 타입 정의
interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  googleMaps: typeof google.maps | null;
}

// 기본값으로 컨텍스트 생성
const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
  googleMaps: null,
});

// 컨텍스트 Provider 속성 정의
interface GoogleMapsProviderProps {
  children: ReactNode;
}

// 컨텍스트 Provider 구현
export const GoogleMapsProvider = ({ children }: GoogleMapsProviderProps) => {
  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);

  // useLoadScript로 Google Maps API 로드
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
    preventGoogleFontsLoading: true, // 폰트 로딩 방지
  });

  // API 로드 완료 시 googleMaps 객체 설정
  useEffect(() => {
    if (isLoaded && window.google && window.google.maps) {
      setGoogleMaps(window.google.maps);
    }
  }, [isLoaded]);

  // 디버그 정보
  useEffect(() => {
    console.log('GoogleMapsContext 상태:', { isLoaded, loadError: loadError?.message });
  }, [isLoaded, loadError]);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError, googleMaps }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

// 커스텀 훅 생성 - 다른 컴포넌트에서 쉽게 사용
export const useGoogleMaps = () => useContext(GoogleMapsContext);