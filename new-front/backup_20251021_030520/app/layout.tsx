import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'), // Cambiado para desarrollo
  title: "Chapinflix - Plataforma de Streaming Guatemalteca",
  description: "La plataforma de streaming que celebra el cine guatemalteco y contenido internacional de calidad",
  keywords: ["streaming", "películas", "Guatemala", "cine", "entretenimiento"],
  authors: [{ name: "Chapinflix Team" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "es_GT",
    url: "http://localhost:3000",
    siteName: "Chapinflix",
    title: "Chapinflix - El mejor entretenimiento guatemalteco",
    description: "Descubre películas guatemaltecas y contenido internacional en nuestra plataforma de streaming",
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e40af'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Chapinflix" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <div id="root" className="relative min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
