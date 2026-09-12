import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Senvoriq",
  description: "Få nøgletal, driveranalyse og dokumenterede indsigter fra dine salgsdata. Senvoriq samler dit ledelsesoverblik uden BI-opsætning.",
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
