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
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
