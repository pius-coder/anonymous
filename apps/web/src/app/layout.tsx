import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppShell } from "@/components/game/app-shell";
import "./globals.css";

const pixelFont = localFont({
  src: [
    { path: "./fonts/rubik-pixels-regular.ttf", weight: "400" },
    { path: "./fonts/pixelify-sans-regular.ttf", weight: "400" },
    { path: "./fonts/pixelify-sans-medium.ttf", weight: "500" },
    { path: "./fonts/pixelify-sans-semibold.ttf", weight: "600" },
    { path: "./fonts/pixelify-sans-bold.ttf", weight: "700" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Session Jeu - Compétitions Stratégiques en Ligne",
  description:
    "Rejoignez des sessions de compétitions stratégiques en temps réel. Testez votre adresse, votre réflexion et votre stratégie dans un cadre structuré et équitable.",
  openGraph: {
    title: "Session Jeu",
    description: "Rejoignez des sessions de compétitions stratégiques en temps réel.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${pixelFont.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
