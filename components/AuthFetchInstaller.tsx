"use client";

import { installAuthFetch } from "../lib/auth-fetch";

// Runs at module load on the client, before any page effect issues a request.
installAuthFetch();

export default function AuthFetchInstaller() {
  return null;
}
