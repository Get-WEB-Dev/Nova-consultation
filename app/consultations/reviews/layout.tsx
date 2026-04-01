import type { Metadata } from "next";
export const metadata: Metadata = { title: "My Reviews | Nova Health" };
export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
