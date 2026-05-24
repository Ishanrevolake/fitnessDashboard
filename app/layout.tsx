import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "../style.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AlphaFitness Dashboard",
  description: "Trainer dashboard for managing clients, programs, and meal plans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
