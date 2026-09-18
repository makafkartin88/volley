import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, isValidSessionToken } from '@/lib/auth-core'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (await isValidSessionToken(token)) return NextResponse.next()

  const loginUrl = new URL('/admin/prihlaseni', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Chrání /admin a vše pod ním, kromě přihlašovací stránky.
  matcher: ['/admin/((?!prihlaseni).*)', '/admin'],
}
