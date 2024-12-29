import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authSession = request.cookies.get("auth-session");
  const { pathname } = request.nextUrl;

  // Parse the auth session to check authentication state
  let isAuthenticated = false;
  try {
    if (authSession) {
      const sessionData = JSON.parse(authSession.value);
      isAuthenticated = sessionData.isAuthenticated || false;
    }
  } catch (error) {
    console.error("Error parsing auth session:", error);
  }

  // Allow access to login page only if not authenticated
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes
  if (!isAuthenticated) {
    console.log("Unauthenticated user, redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  console.log("Auth check passed, proceeding to:", pathname);
  return NextResponse.next();
}

// Configure which paths should be handled by the middleware
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
