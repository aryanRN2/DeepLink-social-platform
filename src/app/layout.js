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
  title: "DeepLink — Connect Instantly with Friends",
  description: "A premium, light-themed real-time chat platform for friends to connect deeply and securely with chat, images, and audio sharing.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔗</text></svg>" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
