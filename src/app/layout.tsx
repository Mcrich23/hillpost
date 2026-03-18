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

export const metadata: Metadata = {
  title: "Hillpost",
  description: "King-of-the-hill style hackathon judging platform",
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
