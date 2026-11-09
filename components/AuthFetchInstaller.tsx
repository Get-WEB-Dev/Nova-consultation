"use client";

import { installAuthFetch } from "@/lib/auth-fetch";
import ApiErrorToasts from "@/components/ApiErrorToasts";

// Runs at module load on the client, before any page effect issues a request.
installAuthFetch();

export default function AuthFetchInstaller() {
  return <ApiErrorToasts />;
}