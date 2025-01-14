import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Decode the email from the token
    const email = Buffer.from(token, "base64").toString();

    // Get reference to the user settings document
    const userSettingsRef = doc(db, "user-settings", email);

    // Check if document exists
    const docSnap = await getDoc(userSettingsRef);

    if (!docSnap.exists()) {
      // Create new document if it doesn't exist
      await setDoc(userSettingsRef, {
        email,
        emailVerified: true,
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } else {
      // Update existing document
      await updateDoc(userSettingsRef, {
        emailVerified: true,
        verifiedAt: new Date().toISOString(),
      });
    }

    // Redirect to the settings page with a success message
    const redirectUrl = new URL("/settings", process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set("verified", "true");
    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Error verifying email:", error);
    // Redirect to settings page with error message
    const redirectUrl = new URL("/settings", process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set("error", "Failed to verify email");
    return NextResponse.redirect(redirectUrl.toString());
  }
}
