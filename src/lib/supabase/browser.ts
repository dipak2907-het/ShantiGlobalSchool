"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createSupabaseBrowserClient() {
  if (!url || !key) {
    throw new Error("Missing Supabase browser environment variables.");
  }

  return createBrowserClient(url, key);
}
