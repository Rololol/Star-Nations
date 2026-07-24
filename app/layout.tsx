import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Star Nations — Browser-MMO im Weltraum",
  description:
    "Ein persistentes Sci-Fi-Strategiespiel. Wähle deine Fraktion, erobere die 50 Sternensysteme und schreibe galaktische Geschichte.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
