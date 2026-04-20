'use client';

import { usePathname } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/Providers";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileHeader from "@/components/MobileHeader";
import OnboardingTour from "@/components/OnboardingTour";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isChatPage = pathname?.startsWith('/chat');

  return (
    <html lang="tr" suppressHydrationWarning={true}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background ${isChatPage ? 'overflow-hidden' : ''}`}>
        <Providers>
          <div className={`flex flex-col ${isChatPage ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
            {!isLoginPage && <MobileHeader />}
            <main className={`flex-1 flex flex-col min-h-0 ${isChatPage ? 'overflow-hidden' : ''}`}>
              {children}
            </main>
            {!isLoginPage && (
              <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none md:hidden transition-all duration-300">
                <div className="pointer-events-auto w-full flex justify-center">
                  <MobileBottomNav />
                </div>
              </div>
            )}
          </div>
          <OnboardingTour />
        </Providers>
      </body>
    </html>
  );
}
