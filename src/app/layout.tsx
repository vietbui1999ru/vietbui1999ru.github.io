import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBarDock from "./components/NavBarDock";
import { ThemeProvider } from "./components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Portfolio Website",
  description: "Hi, my name is Viet, welcome to my Portfolio!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        style={{}}
      >
        <ThemeProvider>
        <div className="flex flex-col items-center justify-center w-full h-full">
                    <NavBarDock />
                    </div>
          <div style={{ /* Adjust this value based on NavBarDock's height */ }}>
            {children}
          </div>

        </ThemeProvider>
      </body>
    </html>
  );
}
