import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function createSupabaseServerClient() {
  if (!url || !key) {
    throw new Error("Missing Supabase server environment variables.");
  }

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Server components cannot write cookies. Middleware handles token refresh.
      },
    },
  });
}
