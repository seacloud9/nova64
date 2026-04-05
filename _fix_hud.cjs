// Temporary script to scale HUD coordinates from 320x240 to 640x360
// Strategy: process whole functions as text blocks, handling multi-line constructs
const fs = require('fs');

const SX = 2;    // X scale: 640/320
const SY = 1.5;  // Y scale: 360/240
const GS = 1.5;  // gun/crosshair scale

function transformFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Step 1: Replace W/H declarations
  code = code.replace(/let W = 320,\n\s+H = 240;/g, 'let W = 640,\n    H = 360;');

  // Step 2: Extract and transform each draw function as a whole block
  const drawFuncs = ['drawStartScreen', 'drawGameOver', 'drawVictory', 'drawLevelClear', 'drawHUD', 'drawLoading', 'drawMenu'];
  
  for (const fn of drawFuncs) {
    const fnStart = code.indexOf(`function ${fn}(`);
    if (fnStart === -1) continue;
    
    // Find the matching closing brace
    let braceCount = 0;
    let fnEnd = -1;
    let started = false;
    for (let i = fnStart; i < code.length; i++) {
      if (code[i] === '{') { braceCount++; started = true; }
      if (code[i] === '}') { braceCount--; }
      if (started && braceCount === 0) { fnEnd = i + 1; break; }
    }
    if (fnEnd === -1) continue;
    
    let fnBody = code.substring(fnStart, fnEnd);
    const isHUD = fn === 'drawHUD';
    fnBody = transformFunction(fnBody, isHUD);
    code = code.substring(0, fnStart) + fnBody + code.substring(fnEnd);
  }
  
  fs.writeFileSync(filePath, code);
  console.log(`Transformed: ${filePath}`);
}

function transformFunction(fnBody, isHUD) {
  if (isHUD) {
    return transformHUD(fnBody);
  }
  return transformOverlay(fnBody);
}

function sy(n) { return Math.round(n * SY); }
function sx(n) { return Math.round(n * SX); }
function gs(n) { return Math.round(n * GS); }

function transformOverlay(body) {
  // Handle printCentered with W / 2 (including multi-line where Y is on separate line)
  // Match: W / 2,\n?    Y,  where Y is a standalone number
  body = body.replace(/((?:W\s*\/\s*2|cx),\s*\n?\s*)(\d+)(\s*,\s*\n?\s*rgba8)/g, (m, prefix, y, suffix) => {
    const n = parseInt(y);
    // Don't scale color values (> 360)
    if (n > 300) return m;
    return prefix + sy(n) + suffix;
  });
  
  // Handle printCentered with cx, cy offset
  body = body.replace(/(cx,\s*cy\s*-\s*)(\d+)/g, (m, p, n) => p + sy(parseInt(n)));
  body = body.replace(/(cx,\s*cy\s*\+\s*)(\d+)/g, (m, p, n) => p + sy(parseInt(n)));
  
  // Scale sepW: let sepW = 120 + Math.sin(...) * 20
  body = body.replace(/(sepW\s*=\s*)(\d+)(\s*\+\s*Math\.sin\([^)]+\)\s*\*\s*)(\d+)/g,
    (m, p1, base, p2, amp) => p1 + sx(parseInt(base)) + p2 + sx(parseInt(amp)));
  
  // rectfill with W / 2 - sepW/2 pattern: scale Y and height
  body = body.replace(/(rectfill\(W\s*\/\s*2\s*-\s*sepW\s*\/\s*2,\s*)(\d+)(,\s*sepW,\s*)(\d+)/g,
    (m, p1, y, p2, h) => p1 + sy(parseInt(y)) + p2 + Math.max(1, sy(parseInt(h))));
  
  // rectfill(W / 2 - N, Y, W, H) — separators with fixed offset
  body = body.replace(/(rectfill\(W\s*\/\s*2\s*-\s*)(\d+)(,\s*)(\d+)(,\s*)(\d+)(,\s*)(\d+)(,)/g,
    (m, p1, xOff, s1, y, s2, w, s3, h, s4) => 
      p1 + sx(parseInt(xOff)) + s1 + sy(parseInt(y)) + s2 + sx(parseInt(w)) + s3 + Math.max(1, sy(parseInt(h))) + s4);
  
  // rectfill(W / 2, Y, W, H) — buggy separator (wad-demo game over)
  // Fix: center it by changing to W / 2 - W/2
  body = body.replace(/(rectfill\(W\s*\/\s*2,\s*)(\d+)(,\s*)(\d+)(,\s*)(\d+)(,)/g,
    (m, p1, y, s1, w, s2, h, s3) => {
      const nw = sx(parseInt(w));
      return `rectfill(W / 2 - ${nw/2}, ` + sy(parseInt(y)) + s1 + nw + s2 + Math.max(1, sy(parseInt(h))) + s3;
    });
  
  // rectfill(cx - N, cy - N, W, H) — drawLevelClear centered box
  body = body.replace(/(rectfill\(cx\s*-\s*)(\d+)(,\s*cy\s*-\s*)(\d+)(,\s*)(\d+)(,\s*)(\d+)/g,
    (m, p1, xo, p2, yo, s1, w, s2, h) => 
      p1 + sx(parseInt(xo)) + p2 + sy(parseInt(yo)) + s1 + sx(parseInt(w)) + s2 + sy(parseInt(h)));
  
  // drawProgressBar(X, Y, W, H, ...) on one line (absolute coords)
  body = body.replace(/(drawProgressBar\()(\d+)(,\s*)(\d+)(,\s*)(\d+)(,\s*)(\d+)/g,
    (m, p, x, s1, y, s2, w, s3, h) => p + sx(parseInt(x)) + s1 + sy(parseInt(y)) + s2 + sx(parseInt(w)) + s3 + sy(parseInt(h)));
  
  // drawProgressBar with W / 2 - offset (multi-line friendly)
  body = body.replace(/(drawProgressBar\(\s*\n?\s*W\s*\/\s*2\s*-\s*)(\d+)(,\s*\n?\s*)(\d+)(,\s*\n?\s*)(\d+)(,\s*\n?\s*)(\d+)/g,
    (m, p, xOff, s1, y, s2, w, s3, h) => p + sx(parseInt(xOff)) + s1 + sy(parseInt(y)) + s2 + sx(parseInt(w)) + s3 + sy(parseInt(h)));
  
  // Map list: let y = 100 + (i - startIdx) * 14
  body = body.replace(/(let y = )(\d+)( \+ \(i - startIdx\) \* )(\d+)/g,
    (m, p1, base, p2, spacing) => p1 + sy(parseInt(base)) + p2 + sy(parseInt(spacing)));
  
  return body;
}

function transformHUD(body) {
  // Bottom bar: rectfill(0, H - 32, W, 32, ...)
  body = body.replace(/(rectfill\(0,\s*H\s*-\s*)32(,\s*W,\s*)32/g, 
    (m, p1, p2) => p1 + '48' + p2 + '48');
  // Bottom bar border: rectfill(0, H - 32, W, 1, ...)
  body = body.replace(/(rectfill\(0,\s*H\s*-\s*)32(,\s*W,\s*)1/g, 
    (m, p1, p2) => p1 + '48' + p2 + '2');
  
  // drawProgressBar(8, H - N, 70, 7, ...) — single line, absolute X, H-relative Y
  body = body.replace(/(drawProgressBar\()(\d+)(,\s*H\s*-\s*)(\d+)(,\s*)(\d+)(,\s*)(\d+)/g,
    (m, p, x, p2, yOff, s1, w, s2, h) => p + sx(parseInt(x)) + p2 + sy(parseInt(yOff)) + s1 + sx(parseInt(w)) + s2 + sy(parseInt(h)));
  
  // drawProgressBar multi-line: drawProgressBar(\n      8,\n      H - 6,\n      70,\n      4,
  body = body.replace(/(drawProgressBar\(\s*\n\s*)(\d+)(,\s*\n\s*H\s*-\s*)(\d+)(,\s*\n\s*)(\d+)(,\s*\n\s*)(\d+)/g,
    (m, p, x, p2, yOff, s1, w, s2, h) => p + sx(parseInt(x)) + p2 + sy(parseInt(yOff)) + s1 + sx(parseInt(w)) + s2 + sy(parseInt(h)));
  
  // print at absolute X, H - Y (general pattern)
  body = body.replace(/(print\(`[^`]*`,\s*)(\d+)(,\s*H\s*-\s*)(\d+)/g, 
    (m, p, x, p2, yOff) => p + sx(parseInt(x)) + p2 + sy(parseInt(yOff)));
  
  // print at W - X, H - Y
  body = body.replace(/(print\(`[^`]*`,\s*W\s*-\s*)(\d+)(,\s*H\s*-\s*)(\d+)/g,
    (m, p, xOff, p2, yOff) => p + sx(parseInt(xOff)) + p2 + sy(parseInt(yOff)));
  
  // print with string literal at W - X, H - Y (AMMO)
  body = body.replace(/(print\('[^']*',\s*W\s*-\s*)(\d+)(,\s*H\s*-\s*)(\d+)/g,
    (m, p, xOff, p2, yOff) => p + sx(parseInt(xOff)) + p2 + sy(parseInt(yOff)));
  
  // NO AMMO: H / 2 + 20
  body = body.replace(/(H\s*\/\s*2\s*\+\s*)20/g, '$130');
  
  // printCentered at W/2, Y (single line - score at top)
  body = body.replace(/(printCentered\(`[^`]*`,\s*W\s*\/\s*2,\s*)(\d+)/g,
    (m, p, y) => p + sy(parseInt(y)));
  
  // printCentered multi-line: W / 2,\n    Y,
  body = body.replace(/(W\s*\/\s*2,\s*\n\s*)(\d+)(,\s*\n)/g,
    (m, p1, y, p2) => { const n = parseInt(y); return n > 300 ? m : p1 + sy(n) + p2; });
  
  // Level: print(`LV${level}`, 4, 4, ...)
  body = body.replace(/(print\(`LV\$\{level\}`,\s*)(\d+)(,\s*)(\d+)/g,
    (m, p, x, s, y) => p + sx(parseInt(x)) + s + sy(parseInt(y)));
  
  // Kills: print(killStr, W - 45, 4, ...)
  body = body.replace(/(print\(killStr,\s*W\s*-\s*)(\d+)(,\s*)(\d+)/g,
    (m, p, xOff, s, y) => p + sx(parseInt(xOff)) + s + sy(parseInt(y)));
  
  // Crosshair spread: let spread = mouseDown() ? 5 : 8
  body = body.replace(/(mouseDown\(\)\s*\?\s*)5(\s*:\s*)8/g, '$18$212');
  
  // Crosshair arm sizes: spread - 4 → spread - 6, spread + 1 → spread + 2
  body = body.replace(/spread - 4/g, 'spread - 6');
  body = body.replace(/spread \+ 1/g, 'spread + 2');
  // Cross arm dimensions: (4, 1) → (6, 1) and (1, 4) → (1, 6)
  // Handled by specific patterns in crosshair rectfills
  body = body.replace(/(cx - spread - 6, cy, )4(, 1,)/g, '$16$2');
  body = body.replace(/(cx \+ spread \+ 2, cy, )4(, 1,)/g, '$16$2');
  body = body.replace(/(cx, cy - spread - 6, )1(, )4/g, '$11$26');
  body = body.replace(/(cx, cy \+ spread \+ 2, )1(, )4/g, '$11$26');
  
  // Gun bob amplitudes: isSprinting ? 6 : 3 → 9 : 5
  body = body.replace(/(bobAmplitude\s*=\s*isSprinting\s*\?\s*)6(\s*:\s*)3/g, '$19$25');
  
  // Idle bob amplitude: * 0.5 → * 1
  body = body.replace(/(\* 1\.5\) \* )0\.5/g, '$11');
  
  // Recoil: muzzleFlash > 0 ? 12 : 0 → 18 : 0
  body = body.replace(/(muzzleFlash > 0 \? )12( : 0)/g, '$118$2');
  
  // Gun viewmodel: scale all gx ± N and gy ± N offsets by GS
  // Process line by line for gun lines
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('gx') && lines[i].includes('rectfill')) {
      lines[i] = scaleGunLine(lines[i]);
    }
  }
  body = lines.join('\n');
  
  // Sprint: W / 2 - 15, H - 40 → W / 2 - 30, H - 60
  body = body.replace(/(W \/ 2 - )15(, H - )40/g, '$130$260');
  
  return body;
}

function scaleGunLine(line) {
  // Scale gx/gy offsets
  line = line.replace(/gx - (\d+)/g, (m, n) => `gx - ${gs(parseInt(n))}`);
  line = line.replace(/gx \+ (\d+)/g, (m, n) => `gx + ${gs(parseInt(n))}`);
  line = line.replace(/gy - (\d+)/g, (m, n) => `gy - ${gs(parseInt(n))}`);
  line = line.replace(/gy \+ (\d+)/g, (m, n) => `gy + ${gs(parseInt(n))}`);
  
  // Scale width and height (numbers after gy offset in rectfill)
  line = line.replace(/(gy [+-] \d+, )(\d+)(, )(\d+)/g, (m, p, w, s, h) => 
    p + gs(parseInt(w)) + s + gs(parseInt(h)));
  
  return line;
}

// Process both files
transformFile('examples/fps-demo-3d/code.js');
transformFile('examples/wad-demo/code.js');
console.log('Done!');
