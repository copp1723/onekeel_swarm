// Temporary CSP fix for production
// This file provides a quick fix to disable strict CSP while maintaining other security headers

import { Request, Response, NextFunction } from 'express';

export function temporaryCSPFix() {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Temporary CSP to allow Vite-built assets without nonces
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';";
    res.setHeader('Content-Security-Policy', csp);
    next();
  };
}
