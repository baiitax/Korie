import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
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
