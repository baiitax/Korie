import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
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
