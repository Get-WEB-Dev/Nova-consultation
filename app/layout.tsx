import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "../styles/globals.css";
import AuthFetchInstaller from "../components/AuthFetchInstaller";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-slate-50 bg-nova-mesh flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthFetchInstaller />
          <div className="flex-1">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}