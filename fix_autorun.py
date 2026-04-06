with open('/Users/brendonsmith/exp/nova64/os9-shell/src/apps/GameStudio.tsx', 'r') as f:
    src = f.read()

target = "setOutput([`\u{1F4DA} Demo loaded: ${demo.name}`, '\u{1F4D6} Read-only \u2014 click \u{1F500} Fork to edit']);"

replacement = """setOutput([`\u{1F4DA} Demo loaded: ${demo.name}`, '\u{1F579}\uFE0F Running\u2026']);
      // Auto-run the demo immediately after load
      const processed = processCartCode(gameCode);
      pendingCodeRef.current = processed;
      setShowPreview(true);
      if (iframeReadyRef.current && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'EXECUTE_CODE', code: processed }, getNovaBaseUrl()
        );
        pendingCodeRef.current = null;
      }
      // If iframe isn't ready yet, pendingCodeRef will fire on EXECUTE_READY"""

if target in src:
    src = src.replace(target, replacement, 1)
    with open('/Users/brendonsmith/exp/nova64/os9-shell/src/apps/GameStudio.tsx', 'w') as f:
        f.write(src)
    print('Applied auto-run demo fix')
else:
    # Try to find by searching for the setOutput line with demo.name
    import re
    m = re.search(r'setOutput\(\[`[^`]*Demo loaded[^`]*`[^]]*\]\);', src)
    if m:
        print('Found alt pattern at:', m.start(), repr(m.group()))
    else:
        idx = src.find('setCode(gameCode)')
        print('setCode at:', idx)
        if idx > 0:
            print(repr(src[idx:idx+400]))
