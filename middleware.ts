/**
 * Route protection (Session Management & Persistence).
 *
 * Wraps the protected app routes with NextAuth's middleware. It verifies the
 * JWT session cookie on every request; if there's no valid session the user
 * is redirected to /login. Runs on the edge — only the signed token is checked,
 * no database access here.
 */

import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

// Only these routes require authentication. The landing page (/), /login and
// /register stay public and are intentionally excluded.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/my-task/:path*',
    '/projects/:path*',
    '/people/:path*',
    '/chats/:path*',
    '/documents/:path*',
    '/receipts/:path*',
    '/performance/:path*',
    '/team/:path*',
    '/admin/:path*',
    '/profile/:path*',
  ],
}
