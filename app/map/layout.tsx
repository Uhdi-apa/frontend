// frontend/app/map/layout.tsx
import React from "react";

export default function MapLayout({
                                      children,
                                  }: {
    children: React.ReactNode;
}) {
    // mx-7 마진을 상쇄하기 위해 -mx-7 적용
    return <div className="-mx-7 w-screen">{children}</div>;
}