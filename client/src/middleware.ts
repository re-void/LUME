import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware that generates a per-request CSP nonce and sets
 * Content-Security-Policy + other security headers on every response.
 *
 * Next.js App Router reads the nonce from the `x-nonce` request header
 * and automatically injects it into its own inline scripts.
 */
export function middleware(request: NextRequest): NextResponse {
  // Generate a random nonce (128-bit, base64-encoded)
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");

  // Clone request headers and attach the nonce so Server Components can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // Build CSP directives
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'", // Tailwind needs inline styles
    "connect-src 'self' ws: wss:",      // WebSocket connections
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  const cspValue = cspDirectives.join("; ");

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set CSP header
  response.headers.set("Content-Security-Policy", cspValue);

  // Additional security headers (supplement what next.config.ts sets)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  return response;
}

/**
 * Apply middleware to all page routes (skip static assets and Next.js internals).
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|lume-icon\\.png).*)"],
};
