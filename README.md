# HealthConnect — Health Consultancy App

A modern, mobile-first health consultancy platform built with **Next.js 14 App Router** and **Tailwind CSS**.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Login & Register
│   ├── dashboard/page.tsx    # Main feed + recommendations
│   ├── appointments/page.tsx # Appointment schedule
│   ├── profile/page.tsx      # User profile (view/edit)
│   ├── doctor/[id]/page.tsx  # Doctor profile page
│   └── api/
│       ├── doctors/route.ts       # GET /api/doctors
│       ├── doctors/[id]/route.ts  # GET /api/doctors/:id
│       ├── posts/route.ts         # GET /api/posts
│       └── appointments/route.ts  # GET /api/appointments
├── components/
│   ├── layout/Navbar.tsx
│   └── ui/
│       ├── DoctorCard.tsx
│       ├── PostCard.tsx
│       └── AppointmentCard.tsx
├── lib/
│   ├── api.ts          # Data access layer (swap mock → real DB here)
│   ├── supabase.ts     # Supabase client (commented, ready to enable)
│   └── firebase.ts     # Firebase client (commented, ready to enable)
├── data/
│   ├── doctors.json
│   ├── posts.json
│   └── appointments.json
├── messages/
│   ├── en.json         # English translations
│   └── am.json         # Amharic translations
└── styles/globals.css
```

---

## 🔌 Connecting a Real Database

### Option A: Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Add credentials to `.env.local`
3. Open `lib/supabase.ts` and uncomment the Supabase client
4. Replace functions in `lib/api.ts` with Supabase queries

### Option B: Firebase

1. Create a project at [firebase.google.com](https://firebase.google.com)
2. Add credentials to `.env.local`
3. Open `lib/firebase.ts` and uncomment the Firebase config
4. Replace functions in `lib/api.ts` with Firestore queries

**The key principle**: all data fetching goes through `lib/api.ts`. To switch from mock data to a real DB, you only need to update that one file.

---

## 🌐 Multilingual Support

The app is configured with `next-intl` for English (`en`) and Amharic (`am`).

Translation files live in `/messages/`. To add a new language, create a new JSON file matching the existing structure.

---

## 🛠 Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 14 | App Router, SSR, API Routes |
| Tailwind CSS | Utility-first styling |
| next-intl | i18n (English + Amharic) |
| Lucide React | Icons |
| @supabase/supabase-js | DB (ready to enable) |
| Firebase | DB alt (ready to enable) |

---

## 📦 Build for Production

```bash
npm run build
npm run start
```
