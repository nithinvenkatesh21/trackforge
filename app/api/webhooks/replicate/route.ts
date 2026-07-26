import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Replicate webhook handling
    if (payload.status === "succeeded") {
      console.log("Replicate stem separation succeeded:", payload.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Replicate webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
