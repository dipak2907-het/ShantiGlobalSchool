import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { school } from "@/config/school";
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";
import { SiteContentProvider } from "@/components/public/site-content-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: school.name, template: `%s | ${school.name}` },
  description: school.principal.message,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><SiteContentProvider>{children}</SiteContentProvider><ChatbotWidget /></body>
    </html>
  );
}
