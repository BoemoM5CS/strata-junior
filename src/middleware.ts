import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Middleware reads cookies directly from the request (cannot await cookies()).
  // This pattern refreshes the session cookie on every request so it stays alive.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() also refreshes the session if it's near expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from the auth page
  if (user && pathname === "/auth") {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // Redirect unauthenticated users away from the app
  if (!user && pathname.startsWith("/chat")) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return response;
}

export const config = {
  // Only run on these paths — skip _next/static, api routes, favicon, etc.
  matcher: ["/", "/auth", "/chat/:path*"],
};
