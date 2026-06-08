import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finnly - Seu consultor financeiro com IA",
  description: "Plataforma de consultoria financeira inteligente que acompanha sua vida financeira e fornece recomendações personalizadas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} antialiased h-full`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-finnly-green/30">{children}</body>
    </html>
  );
}
