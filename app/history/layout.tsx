import type { Metadata } from "next";
export const metadata: Metadata = { title: "History | Nova Health" };
export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}