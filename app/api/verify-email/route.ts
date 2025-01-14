import { NextRequest } from "next/server";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

// Mark this route as dynamic
export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    // Get the token from the URL
    const token = request.nextUrl.searchParams.get("token");
    
    if (!token) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Invalid verification link`
      );
    }

    // Decode the email from the token
    const email = Buffer.from(token, "base64").toString();
    
    // Reference to the user settings document
    const userSettingsRef = doc(db, "user-settings", email);

    try {
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

      // Redirect to settings page with success message
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?verified=true`
      );
    } catch (error) {
      console.error("Error updating Firestore:", error);
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Failed to verify email`
      );
    }
  } catch (error) {
    console.error("Error verifying email:", error);
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Invalid verification link`
    );
  }
}
