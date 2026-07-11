import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "RepoFinder | Find the GitHub Repo Behind Any Website",
  description:
    "Paste any website URL and instantly discover if it's open source. Find the GitHub repository, tech stack, stars, license, and more.",
  keywords: [
    "github",
    "open source",
    "repo finder",
    "tech stack detector",
    "website source code",
  ],
  openGraph: {
    title: "RepoFinder | Find the GitHub Repo Behind Any Website",
    description:
      "Paste any website URL and instantly discover if it's open source.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
