import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Hangout Den — Premium Live Group Chat",
  description: "A premium, serverless real-time group chat hangout for friends to share text, images, videos, and audio securely on Vercel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👾</text></svg>" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#060913] antialiased`}>
        {children}
      </body>
    </html>
  );
}
