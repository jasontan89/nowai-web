import { NextRequest, NextResponse } from "next/server";
import {
  getExpectedPin,
  createSessionToken,
  isRequestAuthenticated,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authenticated = isRequestAuthenticated(req);
  return NextResponse.json({ authenticated });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = (body.pin || "").toString().trim();
    const expectedPin = getExpectedPin();

    if (pin === expectedPin) {
      const token = createSessionToken();
      const res = NextResponse.json({ success: true, message: "Authenticated successfully" });

      res.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return res;
    }

    return NextResponse.json(
      { success: false, error: "Invalid PIN code. Please try again." },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Malformed request" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: "Logged out" });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
