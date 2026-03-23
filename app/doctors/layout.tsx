import Navbar from "@/components/layout/Navbar";

export default function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "#eef2f7" }}>
      <Navbar />
      <main className="px-4 py-6 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
