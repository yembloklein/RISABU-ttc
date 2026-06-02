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
    // If the URL already starts with /portal, we don't need to rewrite
    // This prevents infinite rewriting loops like /portal/portal/dashboard
    if (!url.pathname.startsWith('/portal')) {
      // If they go to the root of the portal domain (/), maybe they should go to /dashboard or /login
      // By rewriting to /portal${url.pathname}, a visit to `/login` becomes `/portal/login`
      
      // If the root is visited, we can rewrite it to /portal/dashboard or just /portal
      const newPath = `/portal${url.pathname === '/' ? '' : url.pathname}`;
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
