import type { Metadata, Viewport } from "next";
import { Fira_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { BRAND_NAME, BRAND_TAGLINE, COMPANY_NAME, SITE_URL, payoutClockLabel } from "@/lib/platform";
import "./globals.css";

const fira = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira",
});

const title = `${BRAND_NAME} | ${BRAND_TAGLINE}`;
const description =
  `Activate a QuantumMine AI trading product and collect its daily income at ${payoutClockLabel()}.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: BRAND_NAME,
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: BRAND_NAME },
  // The logo doubles as the favicon and the app icon, so the mark appears on
  // the site, the installed app, and every shared link.
  icons: {
    icon: [{ url: "/brand/logo.jpg", type: "image/jpeg" }],
    shortcut: ["/brand/logo.jpg"],
    apple: [{ url: "/brand/logo.jpg" }],
  },
  openGraph: {
    title,
    description,
    siteName: COMPANY_NAME,
    type: "website",
    locale: "en_UG",
    url: SITE_URL,
    images: [{ url: "/brand/open_graph.jpg", alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/brand/open_graph.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#1558C0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fira.variable} font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("quantummine_theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
