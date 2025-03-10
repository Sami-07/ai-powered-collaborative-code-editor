import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/rooms(.*)',
  '/api/rooms(.*)',
  // Webhook routes should NOT be protected, as they are called by Clerk
]);

// Define public routes (no authentication required)
const isPublicRoute = createRouteMatcher([
  '/api/webhooks/clerk'  // Clerk webhook needs to be public
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip auth protection for public routes like webhooks
  if (isPublicRoute(req)) return;
  
  // Protect all other defined protected routes
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/api/webhooks/clerk'
  ],
}; 