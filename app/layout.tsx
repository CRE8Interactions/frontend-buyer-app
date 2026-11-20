import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  getSiteUrl,
} from "@/lib/seo";

// Brand v0.1 type: Geist for text and headlines, Geist Mono for numbers and labels.
const sans = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

/* phone chrome: paint under the notch (the pages pad themselves with env(safe-area-inset-*)), and a status bar that matches the page in each scheme */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning: the /concept theme script sets data-nt on <html> before React hydrates,
  // so that one attribute is expected to differ from the server HTML.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} ${sans.className}`}>
        {/* the visitor's light/dark choice reaches <html> as data-lt before first paint so the loader can start in it (pages keep their own theme handling, data-nt) */}
        {/* a plain inline script, not next/script: beforeInteractive scripts in the app router run after the JS bundle loads, which is after the skeleton's first paint */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.lt=t}catch(e){}" }} />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
