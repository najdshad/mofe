import type { Metadata } from "next";
import "./globals.css";
import { setCsrfCookie } from "@/lib/csrf";

export const metadata: Metadata = {
  title: "mofé — مدیریت منوی کافه",
  description: "مدیریت منوی کافه و رستوران",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const csrfToken = await setCsrfCookie();

  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta name="csrf-token" content={csrfToken} />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
