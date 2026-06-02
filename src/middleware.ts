import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Determine if this is the portal based on Environment Variables or Domain
  // 1. Environment Variable Check (if you deploy to two separate Vercel projects)
  const appType = process.env.APP_TYPE; // set to 'portal' or 'admin' in Vercel settings
  
  // 2. Hostname Check (if you use one Vercel project with multiple domains)
  // This supports domains like 'risabu-ttc-portal.vercel.app' or 'portal.domain.com'
  const isPortalDomain = 
    appType === 'portal' || 
    hostname.startsWith('portal.') || 
    hostname.startsWith('student.') ||
    hostname.includes('risabu-ttc-portal');

  const isAdminDomain = 
    appType === 'admin' || 
    hostname.startsWith('admin.') || 
    hostname.startsWith('staff.') ||
    hostname.includes('risabu-ttc-admin') ||
    hostname.includes('risabu-ttc-ke3w'); // Your current default domain

  // Ignore API routes, Next.js internal files, and public static files
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.includes('.') // typically catches static files like images
  ) {
    return NextResponse.next();
  }

  // --- PORTAL ROUTING ---
  if (isPortalDomain) {
    // If they visit the root domain (e.g. risabu-ttc-portal.vercel.app/),
    // redirect them to /login because there is no root page in the portal folder.
    if (url.pathname === '/') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // If the URL does not start with /portal, rewrite it so Next.js finds it
    if (!url.pathname.startsWith('/portal')) {
      const newPath = `/portal${url.pathname}`;
      return NextResponse.rewrite(new URL(newPath, req.url));
    }
  }

  // --- ADMIN ROUTING ---
  if (isAdminDomain) {
    // Your admin routes are in the (admin) route group, which means they are 
    // accessible from the root path natively (e.g. /login, /students, etc).
    
    // Optional: Protect admin domain from accessing portal routes
    if (url.pathname.startsWith('/portal')) {
      // You can return a 404, or redirect to the root of the admin dashboard
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Ensure the middleware only runs on necessary paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
