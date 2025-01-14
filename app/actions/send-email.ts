"use server";

import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

const emailSchema = z.object({
  email: z.string().email(),
});

// Custom error class for email verification errors
class EmailVerificationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "EmailVerificationError";
  }
}

export async function verifyEmail(email: string) {
  try {
    // Validate email format
    const { email: validatedEmail } = emailSchema.parse({ email });

    if (!process.env.RESEND_API_KEY) {
      throw new EmailVerificationError(
        "Email service is not properly configured",
        "CONFIG_ERROR"
      );
    }

    // Send verification email
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: validatedEmail,
      subject: "Verify your email for IoT Project notifications",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Verify your email</h1>
          <p style="color: #666; line-height: 1.5;">Click the button below to verify your email address for IoT Project notifications:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL
            }/api/verify-email?token=${generateVerificationToken(
        validatedEmail
      )}" 
               style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 0.9em; text-align: center;">If you didn't request this verification, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes("domain is not verified")) {
        throw new EmailVerificationError(
          process.env.NODE_ENV === "production"
            ? "Unable to send verification email. Please try again later."
            : "Domain not verified. Please verify your domain in Resend dashboard.",
          "DOMAIN_ERROR"
        );
      }

      if (error.message.includes("can only send testing emails to")) {
        throw new EmailVerificationError(
          process.env.NODE_ENV === "production"
            ? "Unable to send verification email. Please try again later."
            : "In test mode, you can only send emails to verified domains.",
          "TEST_MODE_ERROR"
        );
      }

      if (error.message.includes("rate limit")) {
        throw new EmailVerificationError(
          "Too many attempts. Please wait a few minutes and try again.",
          "RATE_LIMIT"
        );
      }

      // Log the error for debugging in production
      if (process.env.NODE_ENV === "production") {
        // Here you would typically log to your error tracking service
        console.error("Email verification error:", {
          error: error.message,
          email: validatedEmail,
          timestamp: new Date().toISOString(),
        });
      }

      // Generic error case
      throw new EmailVerificationError(
        "Unable to send verification email. Please try again later.",
        "SEND_ERROR"
      );
    }

    return { success: true };
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw new EmailVerificationError(
        "Please enter a valid email address.",
        "VALIDATION_ERROR"
      );
    }

    // Handle our custom errors
    if (error instanceof EmailVerificationError) {
      throw error;
    }

    // Log unexpected errors in production
    if (process.env.NODE_ENV === "production") {
      console.error("Unexpected email verification error:", error);
    }

    // Fallback error message
    throw new EmailVerificationError(
      "An unexpected error occurred. Please try again later.",
      "UNKNOWN_ERROR"
    );
  }
}

// Helper function to generate a verification token
function generateVerificationToken(email: string) {
  // In a real application, you would use a proper token generation library
  // and store the token in a database with an expiration time
  return Buffer.from(email).toString("base64");
}
