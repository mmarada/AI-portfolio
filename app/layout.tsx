import React from 'react';
import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'AI portfolio',
  description: 'An intelligent investment cockpit that provides AI-powered portfolio suggestions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          body {
            font-family: 'Inter', sans-serif;
          }
        `}</style>
      </head>
      <body className="bg-[#0a0a0a] text-neutral-300">
        {children}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
