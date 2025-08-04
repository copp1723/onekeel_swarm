#!/usr/bin/env node
/**
 * Generate PWA icons quickly
 */

const fs = require('fs');
const path = require('path');

// Simple 1x1 transparent PNG as placeholder
const transparentPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const iconSizes = ['192x192', '512x512'];
const publicDir = path.join(__dirname, '../client/public');

// Create public dir if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate placeholder icons
iconSizes.forEach(size => {
  const filename = `pwa-${size}.png`;
  const filepath = path.join(publicDir, filename);
  fs.writeFileSync(filepath, transparentPNG);
  console.log(`✅ Created ${filename}`);
});

console.log('PWA icons created! (These are placeholders - replace with real icons later)');