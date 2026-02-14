import "./globals.css";
import "./custom-bootstrap.css";
import React from "react";

import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata = {
  title: "Interactive AI",
  description: "An intelligent AI chatbot powered by Interactive AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
