import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "v0.1 Foundation",
  description: "Clean technical foundation for the multiplayer application rebuild.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

