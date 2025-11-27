import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Turix - Turista Mundial Virtual",
  description: "Juega Turix - Turista Mundial online con amigos",
  icons: {
    icon: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/turix.png",
    shortcut: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/turix.png",
    apple: "https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/turix.png",
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

