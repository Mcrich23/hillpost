import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hillpost",
  description: "King-of-the-hill style hackathon judging platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Toaster theme="dark" richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
