import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { AuthProvider } from "@/lib/authContext";

export const metadata: Metadata = {
  title: "Transport Management System",
  description: "Complete transport management solution for long-haul and car hauling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
