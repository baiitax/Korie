import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter";

export async function POST(request: Request) {
  try {
    // Public, unauthenticated intake form — no login, no CAPTCHA anywhere
    // in this flow. Without a per-IP throttle this is a free spam/log-flood
    // vector (each submission is written straight into server logs).
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`contact-form:${ip}`, "REGISTRATION", 15);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many submissions. Please try again in ${rateLimit.resetSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { fullName, email, phone, businessName, selectedCountry, locationCity, category, monthlyVolume, message, formType } = body;

    // Validate required fields
    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Full name and email are required fields." },
        { status: 400 }
      );
    }

    const submissionId = `KP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Log internally for auditing / CRM integration
    console.log("[KORIEPAY INTAKE]", {
      submissionId,
      formType,
      fullName,
      email,
      phone,
      businessName,
      selectedCountry,
      locationCity,
      category,
      monthlyVolume,
      message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        submissionId,
        message: "Your application has been received and routed to the appropriate regional desk.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing contact request:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
