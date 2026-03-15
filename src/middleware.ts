// src/middleware.ts

import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAppRoute = req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/ppa') ||
    req.nextUrl.pathname.startsWith('/ldo') ||
    req.nextUrl.pathname.startsWith('/loa') ||
    req.nextUrl.pathname.startsWith('/importacao') ||
    req.nextUrl.pathname.startsWith('/ia') ||
    req.nextUrl.pathname.startsWith('/admin')

  if (isAppRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|transparencia).*)'],
}
