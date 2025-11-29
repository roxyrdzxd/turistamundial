import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { Analytics } from "@vercel/analytics/react";
import PWAInstallButton from "@/components/PWAInstallButton";

export const metadata: Metadata = {
  title: "Turix - Turista Mundial Virtual",
  description: "Juega Turix - Turista Mundial online con amigos",
  manifest: "/manifest.json",
  themeColor: "#0ea5e9",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Turix",
  },
  icons: {
    icon: [
      { url: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/turix.png",
    apple: [
      { url: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Turix" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Turix" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(() => {
                      // Service Worker registrado exitosamente
                    })
                    .catch(() => {
                      // Error al registrar Service Worker (silencioso)
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          {children}
          <PWAInstallButton />
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}

