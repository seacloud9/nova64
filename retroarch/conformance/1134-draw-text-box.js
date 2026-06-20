// Conformance cart 1134: nova64.draw.textBox / drawTextBox layout.
// Locks down the bounded text API used by cross-host carts for story panels
// and compact buttons: wrapping, fit-to-rect, ellipsis, metadata, and aliasing.

let errors = [];
let wrapInfo = null;
let fitInfo = null;
let ellipsisInfo = null;
let aliasInfo = null;

function checkInfo(label, info) {
   if (!info || typeof info !== 'object') {
      errors.push(label + '-no-info');
      return false;
   }
   if (!Array.isArray(info.lines)) {
      errors.push(label + '-no-lines');
      return false;
   }
   if (typeof info.truncated !== 'boolean') {
      errors.push(label + '-no-truncated');
      return false;
   }
   if (typeof info.scale !== 'number' || info.scale <= 0) {
      errors.push(label + '-bad-scale');
      return false;
   }
   return true;
}

export function init() {
   const draw = nova64 && nova64.draw;
   if (!draw || typeof draw.textBox !== 'function') {
      errors.push('draw.textBox-missing');
      return;
   }
   if (typeof draw.drawTextBox !== 'function') {
      errors.push('draw.drawTextBox-missing');
      return;
   }

   wrapInfo = draw.textBox('ALPHA BETA GAMMA DELTA', 40, 56, 74, 48, {
      color: rgba8(80, 255, 210, 255),
      overflow: 'wrap',
      scale: 1,
      lineHeight: 8,
   });
   if (!checkInfo('wrap', wrapInfo)) return;
   if (wrapInfo.lines.length < 2 || wrapInfo.truncated) {
      errors.push('wrap-layout');
      return;
   }

   fitInfo = draw.textBox('SHARDGRID SIGNAL REPEATER', 226, 56, 108, 18, {
      color: rgba8(255, 230, 90, 255),
      overflow: 'fit',
      scale: 2,
      minScale: 1,
      align: 'center',
      valign: 'middle',
   });
   if (!checkInfo('fit', fitInfo)) return;
   if (!(fitInfo.scale >= 1 && fitInfo.scale < 2)) {
      errors.push('fit-scale-' + fitInfo.scale);
      return;
   }

   ellipsisInfo = draw.textBox('ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT', 416, 56, 104, 16, {
      color: rgba8(255, 120, 220, 255),
      overflow: 'ellipsis',
      scale: 1,
      lineHeight: 8,
   });
   if (!checkInfo('ellipsis', ellipsisInfo)) return;
   if (!ellipsisInfo.truncated || !ellipsisInfo.lines.some((line) => line.indexOf('...') >= 0)) {
      errors.push('ellipsis-layout');
      return;
   }

   aliasInfo = draw.drawTextBox('RIGHT ALIAS', 478, 122, 96, 16, {
      color: rgba8(120, 160, 255, 255),
      align: 'right',
      overflow: 'wrap',
   });
   if (!checkInfo('alias', aliasInfo)) return;
   if (aliasInfo.truncated) {
      errors.push('alias-truncated');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('1134 DRAW TEXT BOX', 4, 4, rgba8(200, 220, 255, 255));

   rect(34, 50, 88, 58, rgba8(55, 70, 110, 255), false);
   rect(220, 50, 120, 32, rgba8(55, 70, 110, 255), false);
   rect(410, 50, 116, 30, rgba8(55, 70, 110, 255), false);
   rect(472, 116, 108, 28, rgba8(55, 70, 110, 255), false);

   if (wrapInfo) {
      nova64.draw.textBox('ALPHA BETA GAMMA DELTA', 40, 56, 74, 48, {
         color: rgba8(80, 255, 210, 255),
         overflow: 'wrap',
         scale: 1,
         lineHeight: 8,
      });
   }
   if (fitInfo) {
      nova64.draw.textBox('SHARDGRID SIGNAL REPEATER', 226, 56, 108, 18, {
         color: rgba8(255, 230, 90, 255),
         overflow: 'fit',
         scale: 2,
         minScale: 1,
         align: 'center',
         valign: 'middle',
      });
   }
   if (ellipsisInfo) {
      nova64.draw.textBox('ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT', 416, 56, 104, 16, {
         color: rgba8(255, 120, 220, 255),
         overflow: 'ellipsis',
         scale: 1,
         lineHeight: 8,
      });
   }
   if (aliasInfo) {
      nova64.draw.drawTextBox('RIGHT ALIAS', 478, 122, 96, 16, {
         color: rgba8(120, 160, 255, 255),
         align: 'right',
         overflow: 'wrap',
      });
   }

   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('wrap=' + wrapInfo.lines.length + ' fit=' + fitInfo.scale.toFixed(2), 4, 24, rgba8(140, 180, 255, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
