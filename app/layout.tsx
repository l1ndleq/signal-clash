import type { Metadata } from "next";
import { Geist, Chakra_Petch, JetBrains_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import CustomCursor from "@/components/CustomCursor";
import CosmicBackground from "@/components/CosmicBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Cyber-Arcade HUD typefaces: Chakra Petch (display/HUD) + JetBrains Mono (data).
const chakraPetch = Chakra_Petch({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Hero entry display face (spec-requested): Space Grotesk, scoped to the landing hero.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Signal Clash — PvP Market Prediction Arena",
  description:
    "Skill-based 1v1 market prediction arenas on Solana, powered by MagicBlock real-time game state.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${chakraPetch.variable} ${jetbrainsMono.variable} ${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">
        <Providers>
          <CustomCursor />
          <CosmicBackground />
          {children}
        </Providers>
      </body>
    </html>
  );
}
