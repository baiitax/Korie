import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`newsletter-subscribe:${ip}`, "REGISTRATION", 15);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many subscription attempts. Please try again in ${rateLimit.resetSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    console.log("[KORIEPAY NEWSLETTER]", { email, subscribedAt: new Date().toISOString() });

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to KoriePay institutional briefings.",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to subscribe." }, { status: 500 });
  }
}
