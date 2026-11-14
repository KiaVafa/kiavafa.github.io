/* Sea life for the top banner: lantern jellyfish and a ribbon eel from Sunken Opera, in 3D. Author: KiaVafa */
(() => {
'use strict';
if (!window.THREE) return;
const T = THREE;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOB = matchMedia('(max-width:820px)').matches;
const hero = document.getElementById('top'), seaCv = document.getElementById('seaCv'),
      eelCv = document.getElementById('eelCv'), bwrap = document.getElementById('bwrap');
if (!hero || !seaCv || !eelCv || !bwrap) return;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rgb = s => { const [r, g, b] = s.split(',').map(Number); return new T.Color(r / 255, g / 255, b / 255); };

let vis = true;
new IntersectionObserver(e => { vis = e[0].isIntersecting; }).observe(hero);
const ptr = { x: .5, y: .5, cx: -9999, cy: -9999, on: false };
addEventListener('pointermove', e => {
  const r = hero.getBoundingClientRect();
  ptr.x = (e.clientX - r.left) / r.width; ptr.y = (e.clientY - r.top) / r.height;
  ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.on = ptr.y >= 0 && ptr.y <= 1;
}, { passive: true });
addEventListener('pointerleave', () => { ptr.on = false; });

/* soft round glow used for the lantern flame, halos and bubbles */
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)');
  g.addColorStop(.6, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(c);
})();

/* ================= jellyfish ================= */
const PALS = [
  { core: '255,236,180', mid: '255,190,120', edge: '170,130,255', ten: ['200,170,255', '170,235,255'], arm: '255,214,150', glow: '255,200,130' },
  { core: '225,255,250', mid: '110,235,215', edge: '60,170,200', ten: ['140,240,225', '190,255,245'], arm: '150,245,225', glow: '120,240,220' },
  { core: '255,232,242', mid: '255,140,190', edge: '220,90,160', ten: ['255,170,210', '255,210,230'], arm: '255,160,200', glow: '255,150,200' },
  { core: '245,240,255', mid: '190,170,255', edge: '120,100,230', ten: ['200,185,255', '160,200,255'], arm: '210,195,255', glow: '190,175,255' }
];
const BELL_VS = `
uniform float uC;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv; vec3 p = position; float s = uv.y;
  p.xz *= 1. - (.02 + .17 * s * s) * uC; p.y *= 1. + .09 * uC;
  float ang = uv.x * 6.28318, sc = smoothstep(.78, 1., s);
  p.xz *= 1. + sc * .04 * sin(ang * 8.);
  p.y -= sc * .06 * (.5 + .5 * cos(ang * 8.));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BELL_FS = `
uniform vec3 uCore; uniform vec3 uMid; uniform vec3 uEdge;
uniform float uGlow; uniform float uDim; uniform float uRib; uniform float uA;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 N = normalize(vN), V = normalize(vV);
  float fr = pow(1. - abs(dot(N, V)), 1.5);
  float s = vUv.y;
  float rib = pow(abs(cos(vUv.x * 3.14159 * 14.)), 26.) * uRib * smoothstep(.02, .25, s);
  vec3 col = mix(uMid, uEdge, smoothstep(.15, .95, fr));
  col += uCore * rib * (.3 + .4 * s);
  col += uCore * (1. - s) * (1. - s) * (.45 + .5 * uGlow);
  float rim = smoothstep(.86, 1., s);
  col = mix(col, uEdge * 1.25, rim * .55);
  float a = .16 + .66 * fr + rib * .2 + (1. - s) * .14 + rim * .3;
  vec3 L = normalize(vec3(-.55, .75, .6));
  float sp = pow(max(dot(reflect(-L, N), V), 0.), 42.);
  col += vec3(1.) * sp * .8; a += sp * .55;
  gl_FragColor = vec4(col * (.82 + uGlow * .45) * uDim, clamp(a, 0., 1.) * uA * uDim);
}`;
const STR_VS = `
attribute float aT; attribute float aAng; attribute vec4 aP; attribute vec4 aQ; attribute vec4 aC;
uniform float uTime; uniform float uC; uniform vec3 uDrag;
varying vec4 vC; varying float vT; varying float vK; varying vec3 vN; varying vec3 vV;
void main(){
  float t = aT, ph = aQ.x, amp = aQ.y;
  vec3 c = vec3(aP.x, -.2 - aP.z * t, aP.y);
  c.xz *= mix(1. - .17 * uC, 1., min(1., t * 2.5));
  c.xz += vec2(aP.x, aP.y) * .22 * t;
  c.x += sin(uTime * 2.3 - t * 5. + ph) * amp * t;
  c.z += cos(uTime * 1.9 - t * 4.3 + ph * 1.7) * amp * t * .8;
  c += uDrag * t * t;
  float r = aP.w * (1. - .72 * t);
  if (aQ.z > .5) r *= 1. + .42 * sin(t * 24. + aAng * 3. - uTime * 2.);
  vec3 n = vec3(cos(aAng), 0., sin(aAng));
  vec4 mv = modelViewMatrix * vec4(c + n * r, 1.);
  vN = normalize(normalMatrix * n); vV = normalize(-mv.xyz);
  vC = aC; vT = t; vK = aQ.z;
  gl_Position = projectionMatrix * mv;
}`;
const STR_FS = `
uniform vec3 uCore; uniform float uTime; uniform float uDim; uniform float uGlow;
varying vec4 vC; varying float vT; varying float vK; varying vec3 vN; varying vec3 vV;
void main(){
  float fr = 1. - abs(dot(normalize(vN), normalize(vV)));
  vec3 col = vC.rgb * (.7 + .55 * fr);
  float run = pow(max(0., sin(vT * 7. - uTime * 3.)), 10.) * vK;
  col += uCore * run * .7;
  float a = vC.a * (1. - vT * .6) * (.6 + .4 * fr) + run * .22;
  gl_FragColor = vec4(col * (.9 + uGlow * .4) * uDim, a * uDim);
}`;

function bellGeo() {
  const pts = [];
  for (let i = 0; i <= 26; i++) { const s = i / 26, a = s * 1.74; pts.push(new T.Vector2(Math.max(.0001, Math.sin(a) * (1 + .05 * s * s * s * s)), Math.cos(a) * 1.04)); }
  pts.push(new T.Vector2(.97, -.24), new T.Vector2(.9, -.26));
  return new T.LatheGeometry(pts, 48);
}
function strandGeo(list, S, M) {
  const n = list.length, vc = n * (S + 1) * M;
  const pos = new Float32Array(vc * 3), aT = new Float32Array(vc), aAng = new Float32Array(vc),
        aP = new Float32Array(vc * 4), aQ = new Float32Array(vc * 4), aC = new Float32Array(vc * 4), idx = [];
  let v = 0;
  for (const o of list) {
    const base = v;
    for (let i = 0; i <= S; i++) for (let j = 0; j < M; j++) {
      aT[v] = i / S; aAng[v] = j / M * Math.PI * 2;
      aP.set([o.ax, o.az, o.len, o.rad], v * 4); aQ.set([o.phase, o.amp, o.kind, 0], v * 4); aC.set([o.col.r, o.col.g, o.col.b, o.alpha], v * 4); v++;
    }
    for (let i = 0; i < S; i++) for (let j = 0; j < M; j++) {
      const a = base + i * M + j, b = base + i * M + (j + 1) % M, c = a + M, d = b + M; idx.push(a, c, b, b, c, d);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aT', new T.BufferAttribute(aT, 1));
  g.setAttribute('aAng', new T.BufferAttribute(aAng, 1)); g.setAttribute('aP', new T.BufferAttribute(aP, 4));
  g.setAttribute('aQ', new T.BufferAttribute(aQ, 4)); g.setAttribute('aC', new T.BufferAttribute(aC, 4));
  g.setIndex(idx); return g;
}

function makeSea() {
  let R;
  try { R = new T.WebGLRenderer({ canvas: seaCv, alpha: true, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  R.setClearColor(0x000000, 0);
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(35, 1, .1, 60); cam.position.set(0, 0, 10);
  const halfH = Math.tan(35 * Math.PI / 360) * 10; let halfW = halfH, W = 0, H = 0;
  function size() {
    const r = seaCv.getBoundingClientRect(); W = r.width; H = r.height; if (!W || !H) return;
    R.setPixelRatio(Math.min(devicePixelRatio || 1, W > 1300 ? 1.25 : 1.5)); R.setSize(W, H, false);
    cam.aspect = W / H; cam.updateProjectionMatrix(); halfW = halfH * W / H;
  }
  new ResizeObserver(size).observe(seaCv); size();
  const uTime = { value: 0 }, gBell = bellGeo(), jellies = [];
  // [palette, size, depth]
  const CFG = MOB
    ? [[0, .34, 1.2], [1, .24, 0], [2, .2, -1.2], [3, .27, .4], [1, .17, -2.6]]
    : [[0, .5, 1.6], [1, .36, 0], [2, .3, -1.2], [3, .42, .7], [0, .24, -2.8], [1, .22, -3.4], [2, .38, .2], [3, .2, -2]];
  CFG.forEach(([pi, s, z], i) => {
    const P = PALS[pi], g = new T.Group();
    const dim = clamp(1 + z * .11, .5, 1.08);
    const U = { uC: { value: 0 }, uGlow: { value: 0 }, uDim: { value: dim }, uCore: { value: rgb(P.core) }, uMid: { value: rgb(P.mid) }, uEdge: { value: rgb(P.edge) }, uTime, uDrag: { value: new T.Vector3() } };
    const mk = (rib, a) => new T.ShaderMaterial({ uniforms: Object.assign({}, U, { uRib: { value: rib }, uA: { value: a } }), vertexShader: BELL_VS, fragmentShader: BELL_FS, transparent: true, depthWrite: false, side: T.DoubleSide });
    const bell = new T.Mesh(gBell, mk(1, 1)), inner = new T.Mesh(gBell, mk(0, .5));
    inner.scale.set(.76, .58, .76); inner.position.y = -.04;
    const list = [];
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + .3; list.push({ ax: Math.cos(a) * .92, az: Math.sin(a) * .92, len: 1.9 + .5 * Math.cos(k * 1.7), rad: k % 2 ? .026 : .038, phase: k * 1.3, amp: .2, kind: 0, col: rgb(P.ten[k % 2]), alpha: .62 }); }
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; list.push({ ax: Math.cos(a) * .2, az: Math.sin(a) * .2, len: 1.15 + .2 * Math.sin(k * 2.1), rad: .085, phase: k * 2, amp: .12, kind: 1, col: rgb(P.arm), alpha: .5 }); }
    const strands = new T.Mesh(strandGeo(list, 18, 6), new T.ShaderMaterial({ uniforms: U, vertexShader: STR_VS, fragmentShader: STR_FS, transparent: true, depthWrite: false, side: T.DoubleSide }));
    strands.frustumCulled = false;
    const sp = (col, op) => new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: op }));
    const halo = sp(rgb(P.glow), .2 * dim), flame = sp(rgb(P.mid), .85 * dim), core = sp(new T.Color(1, 1, .92), .9 * dim);
    halo.scale.setScalar(4.4); flame.position.y = .3; flame.scale.setScalar(1.5); core.position.y = .32; core.scale.setScalar(.5);
    g.add(halo, strands, inner, flame, core, bell);
    g.scale.setScalar(s); scene.add(g);
    jellies.push({ g, U, s, z, dim, halo, flame, core, parts: [halo, strands, inner, flame, core, bell],
      x: 0, y: 0, vx: 0, vy: rand(.05, .15), ph: Math.random(), f: rand(.3, .46), pow: rand(.85, 1.25), a: rand(0, 9), b: rand(0, 9), dir: rand(-.25, .25), glow: 0, rz: 0, lane: i });
  });
  const hz = z => halfH * (10 - z) / 10, hw = z => halfW * (10 - z) / 10;
  const n = jellies.length, ys = jellies.map((_, i) => (i * 5) % n);
  jellies.forEach((j, i) => { j.x = (-.82 + 1.64 * (i + .5) / n + rand(-.06, .06)) * hw(j.z); j.y = (-.75 + 1.5 * (ys[i] + .5) / n) * hz(j.z); });
  jellies.slice().sort((p, q) => p.z - q.z).forEach((j, i) => j.parts.forEach((m, k) => { m.renderOrder = i * 10 + k; }));

  // slow bubbles
  const NB = MOB ? 18 : 34, bp = new Float32Array(NB * 3), bs = [];
  for (let i = 0; i < NB; i++) { bs.push({ x: rand(-1, 1), y: rand(-1, 1), z: rand(-4, 2), sp: rand(.12, .35), w: rand(0, 9) }); }
  const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(bp, 3));
  const bub = new T.Points(bg, new T.PointsMaterial({ map: glowTex, size: .11, transparent: true, opacity: .32, depthWrite: false, blending: T.AdditiveBlending, color: 0xcfefff, sizeAttenuation: true }));
  bub.frustumCulled = false; bub.renderOrder = -5; scene.add(bub);
  let camX = 0, camY = 0;

  function frame(t, dt) {
    if (!W) return;
    uTime.value = t;
    for (const j of jellies) {
      const HZ = hz(j.z), HW = hw(j.z);
      j.ph = (j.ph + dt * j.f * (1 + j.glow * .9)) % 1;
      const ph = j.ph, c = ph < .28 ? Math.sin(ph / .28 * Math.PI / 2) : Math.pow(Math.cos((ph - .28) / .72 * Math.PI / 2), 1.5);
      const thrust = ph < .28 ? Math.cos(ph / .28 * Math.PI / 2) : 0;
      let head = j.dir + Math.sin(t * .13 + j.a) * .5 + Math.sin(t * .31 + j.b) * .22;
      if (j.x > HW * .88) head -= .5; if (j.x < -HW * .88) head += .5;
      j.vx += Math.sin(head) * thrust * j.pow * dt; j.vy += Math.cos(head) * thrust * j.pow * dt;
      let tg = 0;
      if (ptr.on) {
        const sx = j.x / HW * .5 + .5, sy = .5 - j.y / HZ * .5, dx = (sx - ptr.x) * W / H, dy = sy - ptr.y, d = Math.hypot(dx, dy) || 1e-3, rad = MOB ? .16 : .24;
        if (d < rad) { const f = (1 - d / rad) * (1 - d / rad); j.vx += dx / d * f * 1.5 * dt; j.vy -= dy / d * f * 1.5 * dt; tg = Math.min(1, f * 1.6); }
      }
      j.glow += (tg - j.glow) * Math.min(1, dt * 3.5);
      const dr = Math.exp(-.9 * dt); j.vx *= dr; j.vy *= dr; j.vy -= .015 * dt;
      j.x += j.vx * dt; j.y += j.vy * dt;
      if (j.y > HZ + 1.4 * j.s) { j.y = -HZ - 1.3 * j.s; j.x = rand(-.85, .85) * HW; j.vx = 0; }
      if (j.y < -HZ - 3.2 * j.s) j.y = -HZ - 1.3 * j.s;
      const tz = clamp(-Math.atan2(j.vx, Math.max(.06, j.vy)) * .55, -.6, .6);
      j.rz += (tz - j.rz) * Math.min(1, dt * 1.5);
      j.g.position.set(j.x, j.y, j.z);
      j.g.rotation.set(.3 + Math.sin(t * .4 + j.a) * .12, t * .16 + j.b, j.rz + Math.sin(t * .5 + j.b) * .05, 'ZXY');
      j.U.uC.value = c; j.U.uGlow.value = j.glow;
      const cz = Math.cos(j.rz), sz = Math.sin(j.rz), lx = -(j.vx * cz + j.vy * sz), ly = -(-j.vx * sz + j.vy * cz);
      j.U.uDrag.value.set(lx * 2.2 / j.s, Math.min(0, ly) * .5 / j.s, 0);
      const fl = .85 + .15 * Math.sin(t * 7 + j.a) + .06 * Math.sin(t * 13 + j.b);
      j.flame.scale.setScalar(1.5 * fl * (1 + j.glow * .35)); j.flame.material.opacity = (.8 + j.glow * .2) * j.dim;
      j.halo.material.opacity = (.17 + j.glow * .2 + c * .05) * j.dim;
    }
    for (let i = 0; i < NB; i++) {
      const b = bs[i]; b.y += b.sp * dt * .12; if (b.y > 1.1) { b.y = -1.1; b.x = rand(-1, 1); }
      const HZ = hz(b.z), HW = hw(b.z);
      bp[i * 3] = b.x * HW + Math.sin(t * .8 + b.w) * .08; bp[i * 3 + 1] = b.y * HZ; bp[i * 3 + 2] = b.z;
    }
    bg.attributes.position.needsUpdate = true;
    const tx = ptr.on ? (ptr.x - .5) * -.5 : 0, ty = ptr.on ? (ptr.y - .5) * .3 : 0;
    camX += (tx - camX) * Math.min(1, dt * 2); camY += (ty - camY) * Math.min(1, dt * 2);
    cam.position.set(camX, camY, 10); cam.lookAt(0, 0, 0);
    R.render(scene, cam);
  }
  return { frame };
}

/* ================= ribbon eel circling the badge ================= */
function makeEel() {
  let R;
  try { R = new T.WebGLRenderer({ canvas: eelCv, alpha: true, antialias: true }); } catch (e) { return null; }
  R.setClearColor(0x000000, 0);
  const scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  let S = 0, Rb = 1;
  const root = new T.Group(); root.rotation.order = 'ZXY'; scene.add(root);
  const disc = new T.Mesh(new T.CircleGeometry(1, 72), new T.MeshBasicMaterial({ colorWrite: false })); disc.renderOrder = -1; scene.add(disc);
  function size() {
    S = eelCv.clientWidth; if (!S) return; Rb = bwrap.offsetWidth / 2;
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.setSize(S, S, false);
    cam.left = -S / 2; cam.right = S / 2; cam.top = S / 2; cam.bottom = -S / 2; cam.updateProjectionMatrix();
    root.scale.setScalar(Rb); disc.scale.setScalar(Rb);
  }
  new ResizeObserver(size).observe(eelCv); size();
  scene.add(new T.HemisphereLight(0xbfeaff, 0x040c12, .42));
  const key = new T.DirectionalLight(0xffffff, .95); key.position.set(-.5, .9, .8); scene.add(key);
  const rim = new T.DirectionalLight(0x58e6ff, .8); rim.position.set(.8, -.3, -.5); scene.add(rim);
  const warm = new T.DirectionalLight(0xff8a50, .28); warm.position.set(0, -.6, .7); scene.add(warm);

  // painted skin: x runs head to tail, y runs around the body (.25 = back, .75 = belly)
  const TW = 1024, TH = 128, mk = () => { const c = document.createElement('canvas'); c.width = TW; c.height = TH; return c; };
  const skin = mk(), glow = mk(), sx = skin.getContext('2d'), gx = glow.getContext('2d');
  const A = [16, 35, 47], B = [43, 95, 115], BE = [127, 179, 192], mix = (p, q, k) => p.map((v, i) => Math.round(v + (q[i] - v) * k));
  for (let y = 0; y < TH; y++) { const m = Math.sin(y / TH * Math.PI * 2), c = m > 0 ? mix(B, A, Math.pow(m, .8)) : mix(B, BE, Math.pow(-m, 1.2)); sx.fillStyle = 'rgb(' + c + ')'; sx.fillRect(0, y, TW, 1); }
  sx.fillStyle = 'rgba(6,16,24,.22)'; for (let i = 0; i < 30; i++) sx.fillRect(60 + i * 32, 0, 9, TH * .5);
  gx.fillStyle = '#000'; gx.fillRect(0, 0, TW, TH);
  for (let i = 0; i < 20; i++) {
    const u = .1 + i * .043, x = u * TW, r = 8.5 * (1 - u * .55);
    for (const v of [.06, .44]) { const y = v * TH + (i % 2 ? 5 : -5);
      for (const [cx, col] of [[sx, 'rgba(150,245,255,.95)'], [gx, 'rgba(110,235,255,1)']]) { cx.fillStyle = col; cx.beginPath(); cx.ellipse(x, y, r, r * .78, 0, 0, 7); cx.fill(); } }
  }
  const tSkin = new T.CanvasTexture(skin), tGlow = new T.CanvasTexture(glow);
  const N = 88, M = 14, RR = 1.4, ARC = 4.6, R0 = .185;
  const pos = new Float32Array((N + 1) * (M + 1) * 3), nor = new Float32Array((N + 1) * (M + 1) * 3), uv = new Float32Array((N + 1) * (M + 1) * 2), idx = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= M; j++) { const k = i * (M + 1) + j; uv[k * 2] = i / N; uv[k * 2 + 1] = j / M; }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + 1, c = a + M + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const bodyG = new T.BufferGeometry();
  bodyG.setAttribute('position', new T.BufferAttribute(pos, 3)); bodyG.setAttribute('normal', new T.BufferAttribute(nor, 3)); bodyG.setAttribute('uv', new T.BufferAttribute(uv, 2)); bodyG.setIndex(idx);
  const body = new T.Mesh(bodyG, new T.MeshStandardMaterial({ map: tSkin, emissiveMap: tGlow, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: .26, metalness: .2 }));
  body.frustumCulled = false; root.add(body);
  // fins: back fin and a smaller belly fin, both run to the tail
  const finMat = new T.MeshStandardMaterial({ color: 0x2c93ab, emissive: 0x072f3a, roughness: .45, transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: true });
  const mkFin = () => { const p = new Float32Array((N + 1) * 2 * 3), nn = new Float32Array((N + 1) * 2 * 3), ix = []; for (let i = 0; i < N; i++) { const a = i * 2; ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('normal', new T.BufferAttribute(nn, 3)); g.setIndex(ix); const m = new T.Mesh(g, finMat); m.frustumCulled = false; root.add(m); return { p, nn, g }; };
  const finA = mkFin(), finB = mkFin();
  // head
  const head = new T.Group(); root.add(head);
  const mTop = new T.MeshStandardMaterial({ color: 0x2b5f73, roughness: .26, metalness: .2 }), mLow = new T.MeshStandardMaterial({ color: 0x4f8d9d, roughness: .32, metalness: .15 }),
        mMouth = new T.MeshStandardMaterial({ color: 0x3a0a14, roughness: .8 }), mTooth = new T.MeshStandardMaterial({ color: 0xf4efe0, roughness: .4 }),
        mEye = new T.MeshBasicMaterial({ color: 0xb8f8ff }), mPupil = new T.MeshBasicMaterial({ color: 0x021016 });
  const sph = new T.SphereGeometry(1, 24, 16);
  const skull = new T.Mesh(sph, mTop); skull.scale.set(1.55, .47, .95); skull.position.set(.75, .4, 0);
  const jawP = new T.Group(); jawP.position.set(-.3, -.1, 0);
  const jaw = new T.Mesh(sph, mLow); jaw.scale.set(1.3, .27, .8); jaw.position.set(1.05, -.2, 0); jawP.add(jaw);
  const mouth = new T.Mesh(sph, mMouth); mouth.scale.set(1.25, .24, .7); mouth.position.set(.8, -.02, 0);
  head.add(skull, mouth, jawP);
  const eyes = [];
  for (const sd of [-1, 1]) {
    const e = new T.Mesh(sph, mEye); e.scale.setScalar(.2); e.position.set(1.05, .62, sd * .74);
    const p = new T.Mesh(sph, mPupil); p.scale.set(.07, .15, .07); p.position.set(1.08, .63, sd * .9);
    const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0x7ff0ff, blending: T.AdditiveBlending, transparent: true, opacity: .75, depthWrite: false })); gl.scale.setScalar(2.1); gl.position.copy(e.position);
    head.add(e, p, gl); eyes.push(gl);
  }
  const prof = u => { if (u < .15) { const k = u / .15; return .9 + .1 * k; } return Math.max(.1, 1 - .86 * Math.pow((u - .15) / .85, 1.25)); };
  const C = [], P = new T.Vector3(), Tn = new T.Vector3(), Sd = new T.Vector3(), Up = new T.Vector3(), UP = new T.Vector3(0, 1, 0), tmp = new T.Vector3(), m4 = new T.Matrix4();
  for (let i = 0; i <= N; i++) C.push(new T.Vector3());
  let th = 0, boost = 0;
  const center = (u, t, out) => {
    const a = th - u * ARC, w = .03 + .075 * u;
    const rho = RR + Math.sin(u * 15 - t * 5.2) * w, e = Math.sin(u * 10 - t * 3.6 + 1) * (.03 + .06 * u);
    return out.set(Math.cos(a) * rho, e, Math.sin(a) * rho);
  };
  function frame(t, dt) {
    if (!S) return;
    const br = bwrap.getBoundingClientRect(), d = Math.hypot(ptr.cx - (br.left + br.width / 2), ptr.cy - (br.top + br.height / 2));
    boost += ((d < Rb * 2 ? 1 : 0) - boost) * Math.min(1, dt * 3);
    th += dt * (.62 + boost * .9);
    root.rotation.set(.66 + .1 * Math.sin(t * .37), 0, -.3 + .14 * Math.sin(t * .23));
    for (let i = 0; i <= N; i++) center(i / N, t, C[i]);
    for (let i = 0; i <= N; i++) {
      const u = i / N, c = C[i];
      Tn.subVectors(C[Math.max(0, i - 1)], C[Math.min(N, i + 1)]).normalize();          // points towards the head
      Sd.crossVectors(Tn, UP).normalize(); Up.crossVectors(Sd, Tn).normalize();
      // keep "side" pointing away from the badge
      if (Sd.x * c.x + Sd.z * c.z < 0) Sd.negate();
      const r = R0 * prof(u), rs = r * .84, ru = r * 1.16;
      for (let j = 0; j <= M; j++) {
        const ph = j / M * Math.PI * 2, cs = Math.cos(ph), sn = Math.sin(ph), k = (i * (M + 1) + j) * 3;
        pos[k] = c.x + Sd.x * cs * rs + Up.x * sn * ru; pos[k + 1] = c.y + Sd.y * cs * rs + Up.y * sn * ru; pos[k + 2] = c.z + Sd.z * cs * rs + Up.z * sn * ru;
        tmp.set(Sd.x * cs + Up.x * sn, Sd.y * cs + Up.y * sn, Sd.z * cs + Up.z * sn).normalize();
        nor[k] = tmp.x; nor[k + 1] = tmp.y; nor[k + 2] = tmp.z;
      }
      const fh = R0 * (.25 + .75 * Math.min(1, u * 9)) * (1.05 - .5 * u), fl = Math.sin(u * 30 - t * 7) * R0 * .22 * (.3 + u);
      for (const [f, sg, hk] of [[finA, 1, 1], [finB, -1, u < .28 ? 0 : .6]]) {
        const k = i * 6, b = ru * .82, h = b + fh * hk;
        f.p[k] = c.x + Up.x * b * sg; f.p[k + 1] = c.y + Up.y * b * sg; f.p[k + 2] = c.z + Up.z * b * sg;
        f.p[k + 3] = c.x + Up.x * h * sg + Sd.x * fl; f.p[k + 4] = c.y + Up.y * h * sg + Sd.y * fl; f.p[k + 5] = c.z + Up.z * h * sg + Sd.z * fl;
        f.nn[k] = f.nn[k + 3] = Sd.x; f.nn[k + 1] = f.nn[k + 4] = Sd.y; f.nn[k + 2] = f.nn[k + 5] = Sd.z;
      }
      if (i === 1) { m4.makeBasis(Tn, Up, Sd); head.setRotationFromMatrix(m4); head.position.copy(C[0]).addScaledVector(Tn, -R0 * .35); head.scale.setScalar(R0 * 1.02); }
    }
    bodyG.attributes.position.needsUpdate = true; bodyG.attributes.normal.needsUpdate = true;
    finA.g.attributes.position.needsUpdate = finA.g.attributes.normal.needsUpdate = true;
    finB.g.attributes.position.needsUpdate = finB.g.attributes.normal.needsUpdate = true;
    jawP.rotation.z = -(.13 + .09 * Math.max(0, Math.sin(t * 1.3)) + boost * .32);
    const eg = .65 + .2 * Math.sin(t * 2.2) + boost * .3; eyes.forEach(e => { e.material.opacity = eg; });
    R.render(scene, cam);
  }
  return { frame };
}

const sea = makeSea(), eel = makeEel();
if (!sea && !eel) return;
let prev = performance.now(), t0 = prev, first = true;
function loop(now) {
  const dt = Math.min(.05, (now - prev) / 1000); prev = now;
  const t = (now - t0) / 1000;
  if (vis && !document.hidden) { if (sea) sea.frame(t, dt); if (eel) eel.frame(t, dt); if (first) { first = false; hero.classList.add('sea-on'); } }
  if (!RM) requestAnimationFrame(loop);
}
if (RM) { for (let i = 0; i < 40; i++) { if (sea) sea.frame(i * .05, .05); if (eel) eel.frame(i * .05, .05); } hero.classList.add('sea-on'); }
else requestAnimationFrame(loop);
})();
