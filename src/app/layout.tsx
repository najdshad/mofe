import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mofé — مدیریت منوی کافه",
  description: "مدیریت منوی کافه و رستوران",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
