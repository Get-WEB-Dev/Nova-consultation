/**
 * Nova Health Consultancy — Shared TypeScript Types
 * On-Demand Consultation Model
 */

// ── User (shared base profile) ────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  bio: string;
  avatar: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
  role: "patient" | "doctor" | "professional" | "admin";
  created_at?: string;
}

// ── Patient Profile (role-specific) ───────────────────────────────────────────

export interface PatientProfile {
  id: string;
  userId: string;
  dob: string;
  phone: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
  medicalHistory: string;
  insuranceProvider: string;
  insuranceId: string;
  preferredLanguage: string;
  created_at?: string;
}

// ── Admin Profile (role-specific) ─────────────────────────────────────────────

export interface AdminProfile {
  id: string;
  userId: string;
  department: string;
  permissions: string[];
  isSuperAdmin: boolean;
  lastLoginAt?: string;
  created_at?: string;
}

// ── Doctor ────────────────────────────────────────────────────────────────────

export type DoctorStatus = "available" | "busy" | "in_consultation" | "offline";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  experience: number;
  rating: number;
  reviews: number;
  avatar: string;
  bio: string;
  languages: string[];
  available: boolean;
  fee: number;
  tags: string[];
  gender: "male" | "female" | "other";
  patientsServed: number;
  consultationType: "video" | "in-person" | "both";
  // New: on-demand availability
  status: DoctorStatus;
  onlineNow: boolean;
  locationCity: string;
  consultationDurationMinutes: number; // max session length
  nextAvailableSlot?: string; // only relevant for follow-ups
}

// ── Consultation Session (replaces Appointment) ───────────────────────────────

export type ConsultationStatus =
  | "active"        // currently in progress
  | "completed"     // finished
  | "missed"        // patient didn't join
  | "follow_up"     // doctor-scheduled follow-up
  | "waiting";      // patient in queue waiting

export interface ConsultationSession {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar: string;
  patientId?: string;
  patientName?: string;
  status: ConsultationStatus;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  notes?: string;
  summary?: string;
  isFollowUp: boolean;
  followUpScheduledAt?: string; // ISO datetime, doctor-assigned
  chatHistory?: ChatMessage[];
  created_at?: string;
}

// ── Waiting Queue ──────────────────────────────────────────────────────────────

export interface QueueEntry {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar: string;
  patientId: string;
  patientName: string;
  queuePosition: number;
  estimatedWaitMinutes: number;
  joinedAt: string;
  status: "waiting" | "called" | "skipped";
}

// ── Saved Doctor ──────────────────────────────────────────────────────────────

export interface SavedDoctor {
  id: string;
  doctorId: string;
  userId?: string;
  savedAt: string;
}

// ── Remind Me ─────────────────────────────────────────────────────────────────

export interface RemindMe {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorAvatar: string;
  userId: string;
  createdAt: string;
  notified: boolean;
}

// ── Post / Blog ───────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorAvatar: string;
  doctorSpecialty: string;
  date: string;
  title: string;
  content: string;
  image?: string | null;
  video?: string | null;
  thumbnail?: string | null;
  likes: number;
  comments: number;
  tags: string[];
  created_at?: string;
}

// ── Chat Message ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  sessionId?: string;
  from: "me" | "doctor";
  text: string;
  time: string;
  created_at?: string;
}

// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType =
  | "doctor_available"
  | "queue_called"
  | "follow_up"
  | "consultation_complete"
  | "saved_doctor_online"
  | "chat"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  doctorName?: string;
  doctorAvatar?: string;
  actionUrl?: string;
  created_at: string;
}

// ── Comment ───────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  postId?: string;
  author: string;
  avatar: string;
  text: string;
  created_at?: string;
}
