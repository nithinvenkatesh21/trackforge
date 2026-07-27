import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/auth/(.*)",
  "/share/(.*)",
  "/api/webhooks/(.*)",
]);

export default clerkMiddleware(async (authObj, request) => {
  // Protect all non-public routes and redirect unauthenticated visits to our custom /auth/sign-in page
  if (!isPublicRoute(request)) {
    await authObj.protect({
      unauthenticatedUrl: new URL("/auth/sign-in", request.url).toString(),
    });
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
