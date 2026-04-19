// runtime/debug-panel.js
// In-browser debug overlay for Nova64 — toggle with F9 or ?debug=1
// Provides live scene graph, camera inspector, performance stats, and light editors.

export class DebugPanel {
  constructor(gpu) {
    this.gpu = gpu;
    this.opened = false;
    this._highlightHelper = null;
    this._buildUI();
    this._lastRefresh = 0;
  }

  // ── public API ──────────────────────────────────────────────────────────────

  toggle() {
    this.opened = !this.opened;
    this.wrap.style.display = this.opened ? 'flex' : 'none';
    if (this.opened) this._refresh();
  }

  /** Call once per frame from the game loop */
  update() {
    if (!this.opened) return;
    const now = performance.now();
    // Throttle DOM updates to ~10 Hz to avoid layout thrashing
    if (now - this._lastRefresh < 100) return;
    this._lastRefresh = now;
    this._refreshStats();
    this._refreshCamera();
  }

  destroy() {
    this._removeHighlight();
    this.wrap.remove();
  }

  // ── UI construction ─────────────────────────────────────────────────────────

  _buildUI() {
    const wrap = document.createElement('div');
    wrap.id = 'nova64-debug';
    wrap.style.cssText = [
      'position:fixed;top:0;right:0;bottom:0;width:340px',
      'background:rgba(12,14,22,0.92);color:#dcdfe4;font:12px/1.5 monospace',
      'display:none;flex-direction:column;z-index:99998;border-left:1px solid #2a2f42',
      'overflow-y:auto;user-select:none;backdrop-filter:blur(6px)',
    ].join(';');
    this.wrap = wrap;

    // Header
    const hdr = this._el('div', {
      css: 'padding:8px 12px;background:#151822;border-bottom:1px solid #2a2f42;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;',
    });
    hdr.innerHTML = '<span style="font-weight:700;color:#c084fc">\u{1F3AE} Nova64 Debug</span>';
    const closeBtn = this._el('button', {
      css: 'background:none;border:none;color:#888;cursor:pointer;font:14px monospace;',
      text: '\u2715',
    });
    closeBtn.onclick = () => this.toggle();
    hdr.appendChild(closeBtn);
    wrap.appendChild(hdr);

    // Sections
    this.statsSection = this._section('\u{1F4CA} Performance');
    this.statsBody = this.statsSection.querySelector('.dbg-body');
    wrap.appendChild(this.statsSection);

    this.cameraSection = this._section('\u{1F4F7} Camera');
    this.cameraBody = this.cameraSection.querySelector('.dbg-body');
    wrap.appendChild(this.cameraSection);

    this.sceneSection = this._section('\u{1F333} Scene Graph');
    this.sceneBody = this.sceneSection.querySelector('.dbg-body');
    wrap.appendChild(this.sceneSection);

    this.lightsSection = this._section('\u{1F4A1} Lights');
    this.lightsBody = this.lightsSection.querySelector('.dbg-body');
    wrap.appendChild(this.lightsSection);

    document.body.appendChild(wrap);
  }

  _section(title) {
    const sec = this._el('div', { css: 'border-bottom:1px solid #1f2433;' });
    const hdr = this._el('div', {
      css: 'padding:6px 12px;background:#1a1d2e;cursor:pointer;display:flex;justify-content:space-between;align-items:center;',
    });
    const label = this._el('span', { text: title, css: 'font-weight:600;font-size:11px;' });
    const arrow = this._el('span', { text: '\u25BE', css: 'font-size:10px;color:#888;' });
    hdr.appendChild(label);
    hdr.appendChild(arrow);
    const body = this._el('div', { css: 'padding:6px 12px;' });
    body.className = 'dbg-body';
    hdr.onclick = () => {
      const collapsed = body.style.display === 'none';
      body.style.display = collapsed ? 'block' : 'none';
      arrow.textContent = collapsed ? '\u25BE' : '\u25B8';
    };
    sec.appendChild(hdr);
    sec.appendChild(body);
    return sec;
  }

  _el(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.css) el.style.cssText = opts.css;
    if (opts.text) el.textContent = opts.text;
    return el;
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  _refreshStats() {
    const info = this.gpu.renderer.info;
    const fps = typeof globalThis.getFPS === 'function' ? globalThis.getFPS() : '\u2014';
    const mem = info.memory || {};
    const render = info.render || {};
    this.statsBody.innerHTML = [
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;">',
      '<span style="color:#888">FPS</span><span style="color:#4ade80;font-weight:700">' +
        fps +
        '</span>',
      '<span style="color:#888">Triangles</span><span>' + (render.triangles ?? 0) + '</span>',
      '<span style="color:#888">Draw calls</span><span>' + (render.calls ?? 0) + '</span>',
      '<span style="color:#888">Geometries</span><span>' + (mem.geometries ?? 0) + '</span>',
      '<span style="color:#888">Textures</span><span>' + (mem.textures ?? 0) + '</span>',
      '<span style="color:#888">Programs</span><span>' + (info.programs?.length ?? 0) + '</span>',
      '</div>',
    ].join('');
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

  _refreshCamera() {
    const cam = this.gpu.camera;
    if (!cam) return;
    const p = cam.position;
    const t = this.gpu.cameraTarget;
    // Skip refresh if user is editing an input
    if (this.cameraBody.querySelector('input:focus')) return;
    this.cameraBody.innerHTML = '';
    const grid = this._el('div', {
      css: 'display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:4px;align-items:center;',
    });

    // Position row
    grid.appendChild(this._el('span', { text: 'Pos', css: 'color:#888;' }));
    grid.appendChild(
      this._numInput(p.x, v => {
        if (typeof globalThis.setCameraPosition === 'function')
          globalThis.setCameraPosition(v, p.y, p.z);
      })
    );
    grid.appendChild(
      this._numInput(p.y, v => {
        if (typeof globalThis.setCameraPosition === 'function')
          globalThis.setCameraPosition(p.x, v, p.z);
      })
    );
    grid.appendChild(
      this._numInput(p.z, v => {
        if (typeof globalThis.setCameraPosition === 'function')
          globalThis.setCameraPosition(p.x, p.y, v);
      })
    );

    // Target row
    if (t) {
      grid.appendChild(this._el('span', { text: 'Tgt', css: 'color:#888;' }));
      grid.appendChild(
        this._numInput(t.x, v => {
          if (typeof globalThis.setCameraTarget === 'function')
            globalThis.setCameraTarget(v, t.y, t.z);
        })
      );
      grid.appendChild(
        this._numInput(t.y, v => {
          if (typeof globalThis.setCameraTarget === 'function')
            globalThis.setCameraTarget(t.x, v, t.z);
        })
      );
      grid.appendChild(
        this._numInput(t.z, v => {
          if (typeof globalThis.setCameraTarget === 'function')
            globalThis.setCameraTarget(t.x, t.y, v);
        })
      );
    }

    // FOV row
    grid.appendChild(this._el('span', { text: 'FOV', css: 'color:#888;' }));
    const fovInput = this._numInput(cam.fov, v => {
      if (typeof globalThis.setCameraFOV === 'function') globalThis.setCameraFOV(v);
    });
    fovInput.style.gridColumn = 'span 3';
    grid.appendChild(fovInput);

    this.cameraBody.appendChild(grid);
  }

  _numInput(value, onChange) {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.step = '0.1';
    inp.value = Number(value).toFixed(2);
    inp.style.cssText =
      'width:100%;background:#0d0f18;border:1px solid #2a2f42;color:#e2e8f0;padding:2px 4px;border-radius:3px;font:11px monospace;';
    inp.onchange = () => {
      const v = parseFloat(inp.value);
      if (Number.isFinite(v)) onChange(v);
    };
    return inp;
  }

  // ── Scene Graph ─────────────────────────────────────────────────────────────

  _refresh() {
    this._refreshStats();
    this._refreshCamera();
    this._refreshScene();
    this._refreshLights();
  }

  _refreshScene() {
    this.sceneBody.innerHTML = '';
    const scene = this.gpu.scene;
    if (!scene) return;
    // Render top-level children of scene (root itself is implicit)
    for (const child of scene.children) {
      this._buildTree(child, this.sceneBody, 0);
    }
  }

  _buildTree(obj, parent, depth) {
    // Skip internal helpers
    if (obj === this._highlightHelper) return;
    if (obj.isLight) return; // lights shown in their own section
    if (depth > 6) return;

    const row = this._el('div', {
      css:
        'padding:2px 0 2px ' +
        depth * 14 +
        'px;display:flex;align-items:center;gap:6px;cursor:pointer;border-radius:3px;',
    });
    row.onmouseenter = () => {
      row.style.background = '#1f2433';
    };
    row.onmouseleave = () => {
      row.style.background = 'transparent';
    };

    // Filter out light children for the count
    const visibleChildren = obj.children
      ? obj.children.filter(c => !c.isLight && c !== this._highlightHelper)
      : [];
    const hasChildren = visibleChildren.length > 0;

    const arrow = this._el('span', {
      text: hasChildren ? '\u25B8' : ' ',
      css: 'font-size:9px;color:#888;width:10px;flex-shrink:0;',
    });
    row.appendChild(arrow);

    // Type icon
    row.appendChild(
      this._el('span', { text: this._typeIcon(obj), css: 'font-size:10px;flex-shrink:0;' })
    );

    // Name
    const name = obj.name || obj.type || 'Object3D';
    row.appendChild(
      this._el('span', {
        text: name,
        css: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;',
      })
    );

    // Visibility toggle
    const visIcon = this._el('span', {
      text: obj.visible ? '\u{1F441}' : '\u{1F6AB}',
      css: 'font-size:10px;cursor:pointer;flex-shrink:0;',
    });
    visIcon.onclick = e => {
      e.stopPropagation();
      obj.visible = !obj.visible;
      visIcon.textContent = obj.visible ? '\u{1F441}' : '\u{1F6AB}';
    };
    row.appendChild(visIcon);

    // Click to highlight
    row.onclick = () => this._highlightObject(obj);

    parent.appendChild(row);

    // Children container (collapsed by default)
    if (hasChildren) {
      const childrenWrap = this._el('div', { css: 'display:none;' });
      for (const child of visibleChildren) {
        this._buildTree(child, childrenWrap, depth + 1);
      }
      parent.appendChild(childrenWrap);
      arrow.style.cursor = 'pointer';
      arrow.onclick = e => {
        e.stopPropagation();
        const collapsed = childrenWrap.style.display === 'none';
        childrenWrap.style.display = collapsed ? 'block' : 'none';
        arrow.textContent = collapsed ? '\u25BE' : '\u25B8';
      };
    }
  }

  _typeIcon(obj) {
    if (obj.isMesh) return '\u{1F537}';
    if (obj.isGroup) return '\u{1F4C1}';
    if (obj.isLine) return '\u{1F4CF}';
    if (obj.isPoints) return '\u2728';
    if (obj.isSprite) return '\u{1F5BC}';
    if (obj.isInstancedMesh) return '\u26A1';
    return '\u25FB\uFE0F';
  }

  // ── Highlight ───────────────────────────────────────────────────────────────

  _highlightObject(obj) {
    this._removeHighlight();
    if (!obj.geometry && !obj.isGroup) return;

    try {
      const THREE = globalThis.__THREE__;
      if (!THREE) return;

      if (obj.geometry) {
        obj.geometry.computeBoundingBox();
        const box = obj.geometry.boundingBox;
        if (box) {
          const size = box.getSize(new THREE.Vector3());
          const geo = new THREE.BoxGeometry(size.x * 1.05, size.y * 1.05, size.z * 1.05);
          const mat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
            depthTest: false,
          });
          const helper = new THREE.Mesh(geo, mat);
          // Copy the world transform
          obj.updateWorldMatrix(true, false);
          helper.applyMatrix4(obj.matrixWorld);
          helper.raycast = () => {};
          this.gpu.scene.add(helper);
          this._highlightHelper = helper;
        }
      }
    } catch {
      // Highlight is best-effort
    }

    // Log to console for deeper inspection
    const p = obj.position;
    console.log(
      '%c[Nova64 Debug]%c Selected: ' +
        (obj.name || obj.type) +
        ' @ (' +
        p.x.toFixed(1) +
        ', ' +
        p.y.toFixed(1) +
        ', ' +
        p.z.toFixed(1) +
        ')',
      'color:#c084fc;font-weight:bold',
      'color:inherit',
      obj
    );
  }

  _removeHighlight() {
    if (this._highlightHelper) {
      this._highlightHelper.geometry?.dispose();
      this._highlightHelper.material?.dispose();
      this.gpu.scene.remove(this._highlightHelper);
      this._highlightHelper = null;
    }
  }

  // ── Lights ──────────────────────────────────────────────────────────────────

  _refreshLights() {
    this.lightsBody.innerHTML = '';
    const scene = this.gpu.scene;
    if (!scene) return;

    const lights = [];
    scene.traverse(obj => {
      if (obj.isLight) lights.push(obj);
    });

    if (lights.length === 0) {
      this.lightsBody.innerHTML =
        '<span style="color:#666;font-size:11px">No lights in scene</span>';
      return;
    }

    for (const light of lights) {
      const row = this._el('div', {
        css: 'margin-bottom:6px;padding:4px;background:#0d0f18;border-radius:4px;',
      });

      const header = this._el('div', {
        css: 'display:flex;align-items:center;gap:6px;margin-bottom:4px;',
      });
      header.appendChild(this._el('span', { text: '\u{1F4A1}', css: 'font-size:10px;' }));
      header.appendChild(
        this._el('span', {
          text: light.type + (light.name ? ' (' + light.name + ')' : ''),
          css: 'font-size:11px;flex:1;',
        })
      );
      row.appendChild(header);

      // Color + intensity
      const colorRow = this._el('div', { css: 'display:flex;align-items:center;gap:6px;' });
      colorRow.appendChild(
        this._el('span', { text: 'Color', css: 'color:#888;font-size:10px;width:36px;' })
      );
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = '#' + light.color.getHexString();
      colorInput.style.cssText =
        'width:32px;height:18px;border:none;background:none;cursor:pointer;padding:0;';
      colorInput.oninput = () => {
        light.color.set(colorInput.value);
      };
      colorRow.appendChild(colorInput);

      colorRow.appendChild(
        this._el('span', { text: 'Int', css: 'color:#888;font-size:10px;margin-left:6px;' })
      );
      const intInput = document.createElement('input');
      intInput.type = 'range';
      intInput.min = '0';
      intInput.max = '5';
      intInput.step = '0.1';
      intInput.value = String(light.intensity);
      intInput.style.cssText = 'flex:1;accent-color:#c084fc;';
      const intLabel = this._el('span', {
        text: light.intensity.toFixed(1),
        css: 'color:#e2e8f0;font-size:10px;width:24px;text-align:right;',
      });
      intInput.oninput = () => {
        light.intensity = parseFloat(intInput.value);
        intLabel.textContent = light.intensity.toFixed(1);
      };
      colorRow.appendChild(intInput);
      colorRow.appendChild(intLabel);

      row.appendChild(colorRow);
      this.lightsBody.appendChild(row);
    }
  }
}
