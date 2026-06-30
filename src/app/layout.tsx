import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal G18",
  description: "Portal interno Grupo Dieciocho",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
