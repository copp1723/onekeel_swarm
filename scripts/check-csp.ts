/**
 * CSP Diagnostic Script
 * Run this to test the CSP headers on your deployed site
 */

import fetch from 'node-fetch';

const SITE_URL = process.env.SITE_URL || 'https://ccl-3-final.onrender.com';

async function checkCSPHeaders() {
  console.log(`\n🔍 Checking CSP headers for ${SITE_URL}\n`);

  try {
    const response = await fetch(SITE_URL, {
      method: 'HEAD',
      redirect: 'manual',
    });

    const cspHeader = response.headers.get('content-security-policy');
    const cspReportOnlyHeader = response.headers.get('content-security-policy-report-only');

    console.log('Response Status:', response.status);
    console.log('\n📋 Security Headers Found:');
    
    // List all security-related headers
    const securityHeaders = [
      'content-security-policy',
      'content-security-policy-report-only',
      'strict-transport-security',
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'referrer-policy',
      'permissions-policy',
    ];

    securityHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        console.log(`\n${header}:`);
        if (header.includes('content-security-policy')) {
          // Pretty print CSP directives
          const directives = value.split(';').map(d => d.trim());
          directives.forEach(directive => {
            console.log(`  ${directive}`);
          });
        } else {
          console.log(`  ${value}`);
        }
      }
    });

    // Analyze CSP for common issues
    if (cspHeader || cspReportOnlyHeader) {
      const csp = cspHeader || cspReportOnlyHeader || '';
      console.log('\n🔍 CSP Analysis:');
      
      if (csp.includes('strict-dynamic')) {
        console.log('❌ Uses strict-dynamic - requires nonces on all scripts');
      }
      
      if (csp.includes('unsafe-inline')) {
        console.log('⚠️  Allows unsafe-inline scripts - less secure but works with Vite');
      }
      
      if (!csp.includes('script-src')) {
        console.log('❌ No script-src directive found');
      }
      
      if (csp.includes('ws:') || csp.includes('wss:')) {
        console.log('✅ WebSocket connections allowed');
      } else {
        console.log('❌ WebSocket connections may be blocked');
      }
    } else {
      console.log('\n❌ No CSP headers found!');
    }

    // Test loading a page with CSP applied
    console.log('\n🌐 Testing page load...');
    const pageResponse = await fetch(SITE_URL);
    const html = await pageResponse.text();
    
    // Check if main script tags are present
    if (html.includes('script') && html.includes('.js')) {
      console.log('✅ Script tags found in HTML');
    } else {
      console.log('❌ No script tags found - may indicate a build issue');
    }

  } catch (error) {
    console.error('❌ Error checking site:', error.message);
  }
}

// Run the check
checkCSPHeaders().then(() => {
  console.log('\n✅ CSP diagnostic complete\n');
}).catch(console.error);
