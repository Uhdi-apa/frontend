import "@/styles/globals.css";
import {Metadata, Viewport} from "next";
import {Roboto} from "next/font/google";

import {Providers} from "./providers";
import { GoogleMapsProvider } from './contexts/GoogleMapsContext';

import {siteConfig} from "@/config/site";

// Roboto 폰트 사용
const roboto = Roboto({
    weight: ["100", "300", "400", "500", "700"],
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: siteConfig.name,
        template: `%s - ${siteConfig.name}`,
    },
    description: siteConfig.description,
    icons: {
        icon: "/favicon.ico",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: [
        {media: "(prefers-color-scheme: light)", color: "white"},
        {media: "(prefers-color-scheme: dark)", color: "black"},
    ],
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
        <body className={`h-screen bg-background ${roboto.className}`}>
        <GoogleMapsProvider>
            <Providers>
                {/* 양쪽 모두 28px 마진 적용 */}
                <div className="mx-7">{children}</div>
            </Providers>
        </GoogleMapsProvider>
        </body>
        </html>
    );
}
