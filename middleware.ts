import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/auth/(.*)",
  "/share/(.*)",
  "/api/webhooks/(.*)",
]);

const isAuthRoute = createRouteMatcher(["/auth/(.*)"]);

export default clerkMiddleware(async (authObj, request) => {
  const { userId } = await authObj();

  // If user is already authenticated and attempts to visit sign-in/sign-up, redirect to dashboard
  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protect all non-public routes
  if (!isPublicRoute(request)) {
    await authObj.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|webmanifest|ttf|woff2?|png|jpg|jpeg|gif|svg|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
