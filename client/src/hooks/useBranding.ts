import { useState, useEffect } from 'react'
import { CCLBrandingConfig, getBrandingFromDomain, DEFAULT_BRANDING } from '../../../shared/config/branding-config'

export function useBranding(): CCLBrandingConfig {
  const [branding, setBranding] = useState<CCLBrandingConfig>(DEFAULT_BRANDING)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const domainBranding = getBrandingFromDomain(window.location.hostname)
      setBranding(domainBranding)
    }
  }, [])

  return branding
}

export function getServerBranding(request?: Request): CCLBrandingConfig {
  if (request) {
    return getBrandingFromDomain(new URL(request.url).hostname)
  }
  return DEFAULT_BRANDING
}