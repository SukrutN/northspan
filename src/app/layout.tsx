import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Inter_Tight } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

/*
 * OpenTrade runs Helvetica Neue LT Pro under an Adobe Fonts licence, which is
 * domain-locked to their site. Northspan ships the free stand-ins instead:
 * Inter Tight for display (the tighter Helvetica display cut), Inter for body,
 * and IBM Plex Mono — the exact family OpenTrade uses for every label.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter-tight",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Northspan, pick paths for your floor",
    template: "%s. Northspan",
  },
  description:
    "Plan a picker’s walk on the demo floor. Northspan measures aisle distance, shortens the route, and shows how it compares to walking every aisle in order.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
        <SmoothScroll />
      </body>
    </html>
  );
}
