import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "700"],
});

import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "example.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const siteUrl = `${protocol}://${host}`;

  return {
    title: "Hillpost",
    description: "King-of-the-hill style hackathon judging platform",
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: "Hillpost",
      description: "King-of-the-hill style hackathon judging platform",
      type: "website",
      siteName: "Hillpost",
    },
    twitter: {
      card: "summary_large_image",
      title: "Hillpost",
      description: "King-of-the-hill style hackathon judging platform",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={jetbrainsMono.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('hillpost-theme');var s=t||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',s);}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-black text-white antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
