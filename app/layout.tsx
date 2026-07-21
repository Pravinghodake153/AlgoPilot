import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlgoPilot — AI Coding Interview Platform",
  description:
    "Practice coding interviews with an AI interviewer. Solve problems, get real-time feedback, and receive detailed performance reports.",
  keywords: [
    "coding interview",
    "AI interviewer",
    "technical interview",
    "practice coding",
    "mock interview",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClerkProvider appearance={{ theme: shadcn }}>
          {children}
          <Toaster position="bottom-right" richColors />
        </ClerkProvider>
      </body>
    </html>
  );
}