// Legacy BrandingProvider - now redirects to ClientProvider
// This file is kept for backward compatibility

import React from 'react'
import { ClientProvider, useClient } from '../contexts/ClientContext'

interface BrandingContextType {
  branding: any
}

// Legacy hook for backward compatibility
export function useBrandingContext(): BrandingContextType {
  const { activeClient } = useClient()
  return { branding: activeClient?.brand_config || {} }
}

interface BrandingProviderProps {
  children: React.ReactNode
}

// Legacy provider - now uses ClientProvider
export function BrandingProvider({ children }: BrandingProviderProps) {
  return (
    <ClientProvider>
      {children}
    </ClientProvider>
  )
}