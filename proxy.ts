import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])

export default function proxy(request: NextRequest, event: any) {
  const hasClerkKeys =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && Boolean(process.env.CLERK_SECRET_KEY)

  if (hasClerkKeys) {
    return clerkMiddleware(async (auth, req: NextRequest) => {
      if (isAdminRoute(req)) {
        await auth.protect()
      }
      return NextResponse.next()
    })(request, event)
  }

  if (isAdminRoute(request)) {
    return new NextResponse('Chaves do Clerk não configuradas nas variáveis de ambiente.', { status: 503 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
