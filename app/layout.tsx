import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gateway Solutions | NYC Restaurant Intelligence",
  description: "Investigate NYC food trends, compare restaurant neighborhoods, and screen policy risks.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
