// Production CSP fix for Vite-built assets
// This file provides CSP configuration that allows Vite-built assets to load properly

import { Request, Response, NextFunction } from 'express';

export function temporaryCSPFix() {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Production CSP that allows Vite-built assets
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ccl-3-final.onrender.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https://api.openrouter.ai https://ccl-3-final.onrender.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "frame-ancestors 'none'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', csp);
    next();
  };
}
