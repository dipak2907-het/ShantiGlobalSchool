import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

declare global {
  interface CloudflareEnv {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
  }
}

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 3000;
const PHONE_PATTERN = /^[0-9+() -]{7,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InquiryPayload = {
  fullName: string;
  phone: string;
  email: string;
  standard: number;
  message: string;
  website: string;
};

async function hashIdentifier(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readPayload(value: unknown): InquiryPayload | null {
  if (typeof value !== "object" || value === null) return null;
  const fields = value as Record<string, unknown>;
  if (
    typeof fields.fullName !== "string"
    || typeof fields.phone !== "string"
    || typeof fields.email !== "string"
    || typeof fields.message !== "string"
    || typeof fields.website !== "string"
  ) return null;

  const standard = Number(fields.standard);
  const payload = {
    fullName: fields.fullName.trim(),
    phone: fields.phone.trim(),
    email: fields.email.trim().toLowerCase(),
    standard,
    message: fields.message.trim(),
    website: fields.website.trim(),
  };

  if (
    !payload.fullName
    || payload.fullName.length > MAX_NAME_LENGTH
    || !PHONE_PATTERN.test(payload.phone)
    || payload.email.length > MAX_EMAIL_LENGTH
    || !EMAIL_PATTERN.test(payload.email)
    || !Number.isInteger(payload.standard)
    || payload.standard < 1
    || payload.standard > 12
    || !payload.message
    || payload.message.length > MAX_MESSAGE_LENGTH
  ) return null;

  return payload;
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "The inquiry must be submitted as JSON." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 10_000) {
    return NextResponse.json({ error: "The inquiry is too large. Please shorten your message and try again." }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 10_000) {
      return NextResponse.json({ error: "The inquiry is too large. Please shorten your message and try again." }, { status: 413 });
    }
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "The inquiry could not be read. Please check the form and try again." }, { status: 400 });
  }

  const payload = readPayload(body);
  if (!payload) {
    return NextResponse.json({ error: "Please check your name, phone, email, class, and message, then try again." }, { status: 400 });
  }

  if (payload.website) {
    return NextResponse.json({ message: "Thank you. Your inquiry has been sent to the school office." });
  }

  const { env } = await getCloudflareContext({ async: true });
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Admission inquiry submission is unavailable: server-side Supabase environment variables are missing.");
    return NextResponse.json({ error: "The inquiry service is temporarily unavailable. Please contact the school office." }, { status: 503 });
  }

  const clientIp = request.headers.get("cf-connecting-ip");
  if (!clientIp && process.env.NODE_ENV === "production") {
    console.error("Admission inquiry submission is unavailable: Cloudflare did not provide the client IP address.");
    return NextResponse.json({ error: "The inquiry service is temporarily unavailable. Please contact the school office." }, { status: 503 });
  }

  const identifierHash = await hashIdentifier(clientIp ?? "local-development");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: accepted, error } = await supabase.rpc("submit_public_inquiry", {
    p_full_name: payload.fullName,
    p_phone: payload.phone,
    p_email: payload.email,
    p_requested_standard: payload.standard,
    p_message: payload.message,
    p_identifier_hash: identifierHash,
  });

  if (error) {
    console.error("Admission inquiry database submission failed:", error.message);
    return NextResponse.json({ error: "We could not save your inquiry. Please try again or contact the school office." }, { status: 500 });
  }
  if (accepted !== true) {
    return NextResponse.json({ error: "Too many inquiries were sent from this connection. Please wait a few minutes and try again." }, { status: 429 });
  }

  return NextResponse.json({ message: "Thank you. Your inquiry has been sent to the school office." }, { status: 201 });
}
