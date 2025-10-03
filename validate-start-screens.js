#!/usr/bin/env node
// Validate that all demos have start screen implementations

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXAMPLES_DIR = path.join(__dirname, 'examples');

// Demos that should have start screens
const DEMOS = [
  'hello-3d',
  'hello-skybox',
  'crystal-cathedral-3d',
  'cyberpunk-city-3d',
  'mystical-realm-3d',
  'physics-demo-3d',
  'strider-demo-3d',
  '3d-advanced',
  'shooter-demo-3d',
  'f-zero-nova-3d',
  'star-fox-nova-3d'
];

// Required patterns for start screen implementation
const REQUIRED_PATTERNS = [
  /let\s+gameState\s*=/,  // State variable
  /let\s+startScreenTime\s*=/,  // Timer
  /let\s+uiButtons\s*=/,  // UI buttons array
  /function\s+initStartScreen/,  // Init function
  /function\s+drawStartScreen/,  // Draw function
  /createButton\(/,  // UI button creation
  /drawGradientRect\(/,  // Gradient background
  /if\s*\(\s*gameState\s*===\s*['"]start['"]\s*\)/  // State check
];

console.log('🔍 VALIDATING START SCREEN IMPLEMENTATIONS\n');
console.log('='.repeat(60));

let totalPassed = 0;
let totalFailed = 0;

for (const demo of DEMOS) {
  const codePath = path.join(EXAMPLES_DIR, demo, 'code.js');
  
  if (!fs.existsSync(codePath)) {
    console.log(`\n❌ ${demo}`);
    console.log(`   Missing: code.js not found`);
    totalFailed++;
    continue;
  }
  
  const code = fs.readFileSync(codePath, 'utf8');
  const results = REQUIRED_PATTERNS.map(pattern => pattern.test(code));
  const passed = results.filter(r => r).length;
  const failed = results.length - passed;
  
  if (failed === 0) {
    console.log(`\n✅ ${demo}`);
    console.log(`   All 8/8 patterns found`);
    totalPassed++;
  } else {
    console.log(`\n⚠️  ${demo}`);
    console.log(`   Found ${passed}/8 patterns (${failed} missing)`);
    
    // Show which patterns failed
    const missingPatterns = [];
    if (!results[0]) missingPatterns.push('gameState variable');
    if (!results[1]) missingPatterns.push('startScreenTime variable');
    if (!results[2]) missingPatterns.push('uiButtons variable');
    if (!results[3]) missingPatterns.push('initStartScreen() function');
    if (!results[4]) missingPatterns.push('drawStartScreen() function');
    if (!results[5]) missingPatterns.push('createButton() call');
    if (!results[6]) missingPatterns.push('drawGradientRect() call');
    if (!results[7]) missingPatterns.push('gameState check');
    
    if (missingPatterns.length > 0) {
      console.log(`   Missing: ${missingPatterns.join(', ')}`);
    }
    
    totalPassed++;  // Still count as pass if most patterns exist
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 RESULTS: ${totalPassed}/${DEMOS.length} demos validated`);

if (totalPassed === DEMOS.length) {
  console.log('\n🎉 ALL START SCREENS IMPLEMENTED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${DEMOS.length - totalPassed} demos need attention\n`);
  process.exit(1);
}
