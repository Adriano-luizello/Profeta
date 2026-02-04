import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const res = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((c) => {
    const { name, value, ...opts } = c as { name: string; value: string; [k: string]: unknown }
    res.cookies.set(name, value, opts as Record<string, unknown>)
  })
  return res
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch {
    return supabaseResponse
  }

  // Protected routes - redirect to login if not authenticated
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/onboarding') &&
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return redirectWithCookies(url, supabaseResponse)
  }

  // Require auth for onboarding
  if (!user && request.nextUrl.pathname.startsWith('/onboarding')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return redirectWithCookies(url, supabaseResponse)
  }

  let onboardingComplete = false
  if (user) {
    const { data: pu, error: _ } = await supabase
      .from('profeta_users')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()
    onboardingComplete = pu?.onboarding_complete === true
  }

  // Logged in on login/signup: redirect to dashboard or onboarding
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = onboardingComplete ? '/dashboard' : '/onboarding/step-1-company'
    return redirectWithCookies(url, supabaseResponse)
  }

  // Dashboard access: require onboarding complete (pages only; do not redirect /api)
  if (
    user &&
    !onboardingComplete &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding/step-1-company'
    return redirectWithCookies(url, supabaseResponse)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
