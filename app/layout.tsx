import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataBrief AI",
  description: "Upload salgsdata fra Excel, og få et dashboard med nøgletal og et kort ledelsesresume.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
