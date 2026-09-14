import type { Metadata, Viewport } from "next";
import { Doto, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { PlantProvider } from "@/data/PlantProvider";
import { Shell } from "@/ui/Shell";

const doto = Doto({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-doto",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-grotesk",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono-x",
});

export const metadata: Metadata = {
  title: "NEER//OS — Water Operating System",
  description:
    "Explainable operational digital twin for decentralized water purification plants. SIH26040.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#F5F5F5" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${doto.variable} ${grotesk.variable} ${mono.variable} min-h-dvh antialiased`}
      >
        <PlantProvider>
          <Shell>{children}</Shell>
        </PlantProvider>
      </body>
    </html>
  );
}
