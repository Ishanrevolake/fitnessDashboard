import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "../style.css";

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
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
