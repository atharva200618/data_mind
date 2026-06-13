import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/store/data-context";
import { AuthProvider } from "@/store/auth-context";
import { AmbientMesh } from "@/components/ambient-mesh";
import { Copilot } from "@/components/copilot";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "DataMind AI | World-Class Analytics Platform",
  description: "Next-generation AI-powered data analytics, AutoML, and predictive intelligence platform. Upload data, get instant insights.",
  keywords: "data analytics, AI, machine learning, AutoML, data science, visualization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-[#02040f] text-white selection:bg-cyan-500/30`}>
        <AmbientMesh />
        <AuthProvider>
          <DataProvider>
            {children}
            <Copilot />
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
