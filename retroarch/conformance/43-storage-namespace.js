// Conformance cart 43: namespaced storage handles.

let errors = [];

export function init() {
   if (typeof nova64.storage.open !== 'function') throw new Error('storage.open missing');
   storageClear();

   const profile = nova64.storage.open('profile');
   const settings = nova64.storage.open('settings');
   if (!profile || !settings) errors.push('open');

   profile.saveData('slot', { hp: 64 });
   settings.saveData('slot', { hp: 7 });
   saveData('slot', { hp: 1 });

   if (!profile.has('slot')) errors.push('profile-has');
   if (!settings.has('slot')) errors.push('settings-has');
   if (profile.loadData('slot').hp !== 64) errors.push('profile-load');
   if (settings.loadData('slot').hp !== 7) errors.push('settings-load');
   if (loadData('slot').hp !== 1) errors.push('root-load');
   if (!profile.remove('slot')) errors.push('remove');
   if (profile.has('slot')) errors.push('profile-remove');
   if (settings.loadData('slot').hp !== 7) errors.push('settings-after-remove');
}

export function update() {}

export function draw() {
   cls(rgba8(12, 8, 18, 255));
   const ok = errors.length === 0;
   rect(30, 38, 124, 38, ok ? rgba8(180, 120, 250, 255) : rgba8(225, 70, 80, 255), true);
   print(ok ? '43 storage ns ok' : '43 storage ns fail', 4, 4, ok ? rgba8(110, 255, 140, 255) : rgba8(255, 120, 120, 255));
   if (!ok) print(errors[0], 4, 16, rgba8(255, 190, 120, 255));
}
