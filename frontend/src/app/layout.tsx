
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexa ERP | Business Dashboard",
  description:
    "Modern inventory and sales ERP frontend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
