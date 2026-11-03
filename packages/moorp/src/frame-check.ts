export type FrameCheck = { embeddable: boolean; reason: string; checked?: boolean }

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Says whether a URL can be embedded in an iframe, by reading its X-Frame-Options and CSP frame-ancestors.
 * Only this machine's dev servers and origins in MOORP_ALLOWED_ORIGINS are fetched; others are reported unchecked.
 */
export async function checkFrame(raw: string, ownOrigin: string, extraOrigins = (process.env.MOORP_ALLOWED_ORIGINS ?? '').split(',')): Promise<FrameCheck> {
  try {
    const target = new URL(raw, ownOrigin)
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('only http(s) URLs')
    const allowed = extraOrigins.map((o) => o.trim()).filter(Boolean)
    if (!LOCAL_HOSTS.has(target.hostname) && !allowed.includes(target.origin)) return { embeddable: true, reason: '', checked: false }
    const r = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(5000) })
    const xfo = r.headers.get('x-frame-options') ?? ''
    const fa = /frame-ancestors\s+([^;]+)/i.exec(r.headers.get('content-security-policy') ?? '')?.[1]?.trim()
    const sameOrigin = target.origin === ownOrigin
    // DENY blocks everyone; SAMEORIGIN and a restrictive frame-ancestors block cross-origin embedders.
    const denied = /deny/i.test(xfo) || (!sameOrigin && (/sameorigin/i.test(xfo) || (fa !== undefined && !/\*/.test(fa))))
    const reason = xfo ? `X-Frame-Options: ${xfo}` : fa ? `CSP frame-ancestors ${fa}` : ''
    return { embeddable: !denied, reason: denied ? reason : '', checked: true }
  } catch (e) {
    return { embeddable: false, reason: e instanceof Error ? e.message : String(e), checked: true }
  }
}
