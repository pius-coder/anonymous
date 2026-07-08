import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
