"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Filter,
  MessageSquare,
  User,
  Star,
  Clock,
  Stethoscope,
  Wifi,
  WifiOff,
  ChevronRight,
  X,
  Loader2,
  Users,
  SlidersHorizontal,
  BadgeCheck,
  Building2,
  Globe,
  Phone,
  Video,
  Heart,
  Award,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";
import { getUser } from "@/lib/supabase/auth";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";

const SPECIALTIES = [
  "All",
  "General Practice",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Surgery",
  "Urology",
];

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience_years: number;
  rating: number;
  review_count: number;
  patients_served: number;
  avatar_url: string | null;
  status: "available" | "in_consultation" | "offline";
  hospital: string | null;
  languages: string[];
  bio: string | null;
  fee: number;
  consultation_type: string;
}

function StatusDot({ status }: { status: Doctor["status"] }) {
  const map = {
    available: "bg-emerald-400",
    in_consultation: "bg-amber-400",
    offline: "bg-slate-300",
  };
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${map[status]}`}
    />
  );
}

function StatusLabel({ status }: { status: Doctor["status"] }) {
  if (status === "available")
    return <span className="text-emerald-600 font-semibold">Available</span>;
  if (status === "in_consultation")
    return (
      <span className="text-amber-600 font-semibold">In Consultation</span>
    );
  return <span className="text-slate-400">Offline</span>;
}

function DoctorCard({
  doctor,
  onMessage,
  onView,
}: {
  doctor: Doctor;
  onMessage: (d: Doctor) => void;
  onView: (d: Doctor) => void;
}) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
    >
      {/* Card top */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              {doctor.avatar_url ? (
                <Image
                  src={doctor.avatar_url}
                  alt={doctor.name}
                  fill
                  className="object-cover object-top"
                  unoptimized
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: NAV_BG }}
                >
                  <span className="text-white font-extrabold text-2xl">
                    {doctor.name[0]}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-white border border-slate-200 rounded-full px-1.5 py-0.5">
              <StatusDot status={doctor.status} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold text-slate-900 text-[15px] leading-tight">
                  Dr. {doctor.name}
                </p>
                <p
                  className="text-[12px] font-semibold mt-0.5"
                  style={{ color: ACCENT }}
                >
                  {doctor.specialty}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-[12px] font-bold text-slate-700">
                  {doctor.rating?.toFixed(1) ?? "N/A"}
                </span>
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {doctor.hospital && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">
                    {doctor.hospital}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {doctor.experience_years} yrs exp
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <StatusDot status={doctor.status} />
                <StatusLabel status={doctor.status} />
              </span>
            </div>

            {doctor.bio && (
              <p className="text-[12px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                {doctor.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/50">
        {[
          {
            label: "Patients",
            value: doctor.patients_served?.toLocaleString() ?? "0",
          },
          { label: "Reviews", value: doctor.review_count?.toString() ?? "0" },
          { label: "Fee", value: `${doctor.fee ?? 0} Birr` },
        ].map(({ label, value }) => (
          <div key={label} className="px-3 py-2.5 text-center">
            <p className="font-extrabold text-[13px] text-slate-800">{value}</p>
            <p className="text-[10px] text-slate-400 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-slate-100">
        <button
          onClick={() => onMessage(doctor)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold border transition-all active:scale-95"
          style={{ borderColor: ACCENT, color: ACCENT }}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Message
        </button>
        <button
          onClick={() => onView(doctor)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-extrabold text-white transition-all active:scale-95"
          style={{ background: NAV_BG }}
        >
          <User className="w-3.5 h-3.5" /> View Profile
        </button>
      </div>
    </div>
  );
}

function ProfileModal({
  doctor,
  onClose,
  onMessage,
}: {
  doctor: Doctor;
  onClose: () => void;
  onMessage: (d: Doctor) => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-4 top-[5%] bottom-[5%] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-lg mx-auto"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
      >
        {/* Header */}
        <div
          className="relative h-32 flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${NAV_BG}, ${ACCENT})`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar overlapping */}
        <div className="px-6 -mt-12 pb-4 flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 mb-3">
            {doctor.avatar_url ? (
              <Image
                src={doctor.avatar_url}
                alt={doctor.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: NAV_BG }}
              >
                <span className="text-white font-extrabold text-3xl">
                  {doctor.name[0]}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">
                Dr. {doctor.name}
              </h2>
              <p className="text-sm font-semibold" style={{ color: ACCENT }}>
                {doctor.specialty}
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <StatusDot status={doctor.status} />
              <StatusLabel status={doctor.status} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {doctor.bio && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                About
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {doctor.bio}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: Clock,
                label: "Experience",
                value: `${doctor.experience_years} years`,
              },
              {
                icon: Star,
                label: "Rating",
                value: `${doctor.rating?.toFixed(1) ?? "N/A"} (${doctor.review_count} reviews)`,
              },
              {
                icon: Users,
                label: "Patients",
                value: doctor.patients_served?.toLocaleString() ?? "0",
              },
              {
                icon: Building2,
                label: "Hospital",
                value: doctor.hospital ?? "Independent",
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {label}
                  </p>
                </div>
                <p className="text-[13px] font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>

          {doctor.languages?.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                Languages
              </p>
              <div className="flex flex-wrap gap-2">
                {doctor.languages.map((l) => (
                  <span
                    key={l}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-white text-slate-600"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            className="p-4 rounded-xl border border-blue-100"
            style={{ background: "#eff6ff" }}
          >
            <p
              className="text-[10px] font-extrabold uppercase tracking-wider mb-1"
              style={{ color: ACCENT }}
            >
              Consultation Fee
            </p>
            <p className="text-2xl font-extrabold text-slate-900">
              {doctor.fee ?? 0}{" "}
              <span className="text-sm font-bold text-slate-500">
                Birr/session
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {doctor.consultation_type || "Video consultation"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-white flex-shrink-0">
          <button
            onClick={() => {
              onMessage(doctor);
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] border transition-all"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            <MessageSquare className="w-4 h-4" /> Send Message
          </button>
          <Link
            href={`/doctor-dashboard/messages`}
            onClick={() => onClose()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-[13px] text-white transition-all"
            style={{ background: NAV_BG }}
          >
            <Video className="w-4 h-4" /> Collaborate
          </Link>
        </div>
      </div>
    </>
  );
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "online" | "offline"
  >("all");
  const [viewDoctor, setViewDoctor] = useState<Doctor | null>(null);
  const [page, setPage] = useState(1);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const PER_PAGE = 12;

  // Mock data enriched
  const MOCK_DOCTORS: Doctor[] = [];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const u = getUser();
        if (u) {
          const res = await fetch(`/api/doctors`);
          if (res.ok) {
            const j = await res.json();
            if (j.data?.length) {
              setDoctors(j.data);
              setLoading(false);
              return;
            }
          }
        }
      } catch { }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = doctors.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty.toLowerCase().includes(search.toLowerCase()) ||
      (d.hospital ?? "").toLowerCase().includes(search.toLowerCase());
    const matchSpec = specialty === "All" || d.specialty === specialty;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "online"
        ? d.status !== "offline"
        : d.status === "offline");
    return matchSearch && matchSpec && matchStatus;
  });

  const paginated = filtered.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < filtered.length;

  const handleMessage = (doctor: Doctor) => {
    // Navigate to messages with doctor pre-selected
    window.location.href = `/doctor-dashboard/messages?doctorId=${doctor.id}&doctorName=${encodeURIComponent(doctor.name)}`;
  };

  const onlineCount = doctors.filter((d) => d.status !== "offline").length;

  return (
    <div className="space-y-5 pb-10 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-extrabold text-slate-900 text-[20px]">
            Doctor Directory
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {doctors.length} registered ·{" "}
            <span className="text-emerald-600 font-semibold">
              {onlineCount} online now
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["all", "online", "offline"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as any)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all capitalize"
              style={
                statusFilter === s
                  ? { background: NAV_BG, color: "white", borderColor: NAV_BG }
                  : {
                    background: "white",
                    color: "#475569",
                    borderColor: "#e2e8f0",
                  }
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctors, specialties, hospitals…"
            value={search}
            onChange={(e) => {
              clearTimeout(searchTimeout.current);
              searchTimeout.current = setTimeout(
                () => setSearch(e.target.value),
                200,
              );
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 bg-white transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-pointer"
          >
            {SPECIALTIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Specialty pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {SPECIALTIES.slice(0, 8).map((s) => (
          <button
            key={s}
            onClick={() => setSpecialty(s)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all whitespace-nowrap"
            style={
              specialty === s
                ? { background: ACCENT, color: "white", borderColor: ACCENT }
                : {
                  background: "white",
                  color: "#64748b",
                  borderColor: "#e2e8f0",
                }
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-[12px] text-slate-400">
          Showing {Math.min(paginated.length, filtered.length)} of{" "}
          {filtered.length} doctors
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 bg-white rounded-2xl animate-pulse border border-slate-100"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
          <Users className="w-10 h-10 text-slate-200 mb-3" />
          <p className="font-bold text-slate-600">No doctors found</p>
          <p className="text-[12px] text-slate-400 mt-1">
            Try adjusting your search or filters
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSpecialty("All");
              setStatusFilter("all");
            }}
            className="mt-4 px-4 py-2 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onMessage={handleMessage}
                onView={setViewDoctor}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2.5 rounded-xl font-bold text-[13px] border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Load more doctors
              </button>
            </div>
          )}
        </>
      )}

      {viewDoctor && (
        <ProfileModal
          doctor={viewDoctor}
          onClose={() => setViewDoctor(null)}
          onMessage={handleMessage}
        />
      )}
    </div>
  );
}
