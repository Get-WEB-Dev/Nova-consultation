import Navbar from "@/components/layout/Navbar";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "#eef2f7" }}>
      <Navbar />
      {/* No extra padding/max-width here — the dashboard page controls its own layout */}
      <main className="pb-24 md:pb-0">{children}</main>
    </div>
  );
}
