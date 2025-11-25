import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Turista Mundial - Juego Virtual",
  description: "Juega Turista Mundial online con amigos",
  icons: {
    icon: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/favicon_para_un_juego_en_linea_llamado.jpeg",
    shortcut: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/favicon_para_un_juego_en_linea_llamado.jpeg",
    apple: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/favicon_para_un_juego_en_linea_llamado.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}

