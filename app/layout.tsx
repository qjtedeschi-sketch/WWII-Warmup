import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WWII Warm‑Up: Guess the Numbers",
  description: "Estimate big‑picture WWII facts and see how close you are",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
