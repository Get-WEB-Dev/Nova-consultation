import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Nova Health – Your Health, Connected",
  description:
    "Connect with certified doctors and health professionals from the comfort of your home. Quality care, anytime, anywhere.",
  openGraph: {
    title: "Nova Health Consultancy",
    description: "Professional telemedicine platform — consult with verified doctors via video, chat, and more.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-slate-50 bg-nova-mesh">{children}</body>
    </html>
  );
}
