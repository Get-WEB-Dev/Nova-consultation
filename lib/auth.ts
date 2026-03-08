/**
 * Simple localStorage-based auth for demo purposes.
 * Replace with Supabase auth when connecting backend.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "doctor" | "professional";
  avatar: string;
}

const AUTH_KEY = "hc-user";

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function signIn(email: string, name?: string, role?: string): AuthUser {
  const user: AuthUser = {
    id: "u-" + Date.now(),
    name: name || email.split("@")[0] || "User",
    email,
    role: (role as AuthUser["role"]) || "user",
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=1B3A5C&color=fff&size=64`,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function signOut() {
  localStorage.removeItem(AUTH_KEY);
  // Reset onboarding so it shows again on next sign-in
  localStorage.removeItem("nova-onboarding-done");
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}
