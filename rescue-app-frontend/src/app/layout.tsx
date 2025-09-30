import React, { useState, useEffect } from 'react';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Script from 'next/script';

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PopupWidget } from "@/components/PopupWidget";
import { GoogleAnalytics } from '@next/third-parties/google';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Second Chance Animal Rescue and Sanctuary',
  description: 'Helping animals find loving homes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <UserProvider>
        <body className={inter.className}>
          <ThemeProvider attribute="class">
            <Navbar />
            <div>{children}</div>
            <Footer />
            <PopupWidget />
            {/* Donorbox Script */}
            <Script
              id="donorbox-popup-button-installer"
              src="https://donorbox.org/install-popup-button.js"
              strategy="afterInteractive"
              data-href="https://donorbox.org/second-chance-794835?default_interval=m"
              data-style="background: #fdac74; color: #fff; text-decoration: none; font-family: Verdana, sans-serif; display: flex; gap: 8px; width: fit-content; font-size: 16px; border-radius: 5px 5px 0 0; line-height: 24px; position: fixed; top: 50%; transform-origin: center; z-index: 9999; overflow: hidden; padding: 8px 22px 8px 18px; right: 20px; transform: translate(+50%, -50%) rotate(-90deg)"
              data-button-cta="Donate"
              data-img-src="https://donorbox.org/images/white_logo.svg"
              data-reminder-widget-enabled="true"
            />
          </ThemeProvider>
          <GoogleAnalytics gaId="G-9HC379M63R" />
        </body>
        <Script type="text/javascript" defer src="https://donorbox.org/install-popup-button.js" id="donorbox-popup-button-installer" />
        <Script type="text/javascript" defer src="https://donorbox.org/widget.js" id="donorbox-widget-installer" />
        <Script type="text/javascript" src="https://www.paypalobjects.com/donate/sdk/donate-sdk.js" />
      </UserProvider>
    </html>
  );
}
