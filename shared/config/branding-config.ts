export interface CCLBrandingConfig {
  companyName: string
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  domain?: string
  emailFromName: string
  supportEmail: string
  websiteUrl?: string
  favicon?: string
  customCss?: string
}

export interface ClientBrandingData {
  id: string
  name: string
  domain?: string
  branding: CCLBrandingConfig
  isStatic: boolean
  cached?: boolean
  cacheExpiry?: number
}

export const DEFAULT_BRANDING: CCLBrandingConfig = {
  companyName: 'CCL-3 SWARM',
  primaryColor: '#2563eb',
  secondaryColor: '#1d4ed8',
  emailFromName: 'CCL-3 SWARM',
  supportEmail: 'support@ccl3swarm.com'
}

const CLIENT_BRANDINGS: Record<string, CCLBrandingConfig> = {
  'default': DEFAULT_BRANDING,
  'ccl3': DEFAULT_BRANDING,
  'ccl-3-final': DEFAULT_BRANDING,
  'demo-client': {
    companyName: 'Demo Lead Solutions',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    emailFromName: 'Demo Lead Solutions',
    supportEmail: 'support@demoleads.com',
    logoUrl: '/logos/demo-client.png',
    domain: 'demo.localhost'
  },
  'localhost': {
    companyName: 'Local Development',
    primaryColor: '#7c3aed',
    secondaryColor: '#5b21b6',
    emailFromName: 'Local Development',
    supportEmail: 'dev@localhost',
    domain: 'localhost'
  }
}

// Branding cache with TTL
class BrandingCache {
  private cache = new Map<string, { data: ClientBrandingData; expiry: number }>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  set(key: string, data: ClientBrandingData): void {
    this.cache.set(key, { data, expiry: Date.now() + this.TTL })
  }

  get(key: string): ClientBrandingData | null {
    const cached = this.cache.get(key)
    if (!cached || Date.now() > cached.expiry) {
      this.cache.delete(key)
      return null
    }
    return cached.data
  }

  clear(): void {
    this.cache.clear()
  }
}

const brandingCache = new BrandingCache()

// CSS sanitization
export function sanitizeCSS(css: string): string {
  if (!css) return ''
  // Remove potentially dangerous CSS
  return css
    .replace(/@import\s+[^;]+;/gi, '') // Remove @import
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/behavior\s*:/gi, '') // Remove IE behaviors
    .trim()
}

export function getBrandingForClient(clientId?: string): CCLBrandingConfig {
  if (!clientId) return DEFAULT_BRANDING
  return CLIENT_BRANDINGS[clientId] || DEFAULT_BRANDING
}

export function getBrandingFromDomain(domain: string): CCLBrandingConfig {
  const cacheKey = `domain:${domain}`
  const cached = brandingCache.get(cacheKey)
  if (cached) return cached.branding

  for (const [key, branding] of Object.entries(CLIENT_BRANDINGS)) {
    if (branding.domain === domain) {
      brandingCache.set(cacheKey, {
        id: key,
        name: branding.companyName,
        domain: branding.domain,
        branding,
        isStatic: true
      })
      return branding
    }
  }
  return DEFAULT_BRANDING
}

export function getStaticBrandings(): ClientBrandingData[] {
  return Object.entries(CLIENT_BRANDINGS).map(([key, branding]) => ({
    id: key,
    name: branding.companyName,
    domain: branding.domain,
    branding,
    isStatic: true
  }))
}

export { CLIENT_BRANDINGS, brandingCache }