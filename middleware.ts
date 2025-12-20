import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isOrganizer = token?.role === "ORGANIZER"
    const isCoreMember = token?.role === "CORE_MEMBER"
    const isOrganizerRoute = req.nextUrl.pathname.startsWith("/organizer")

    if (isOrganizerRoute && !isOrganizer) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/events/:path*", "/organizer/:path*"]
}

