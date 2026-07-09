import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataBrief AI",
  description: "Upload Excel sales data and turn it into a dashboard and business summary.",
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
