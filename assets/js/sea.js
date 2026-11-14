/* Faint drifting jellyfish behind the whole page. Author: KiaVafa */
(() => {
'use strict';
if (!window.THREE) return;
const T = THREE;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOB = matchMedia('(max-width:820px)').matches;
const cv = document.getElementById('seaCv');
if (!cv) return;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ptr = { x: .5, y: .5, on: false };
addEventListener('pointermove', e => { ptr.x = e.clientX / innerWidth; ptr.y = e.clientY / innerHeight; ptr.on = true; }, { passive: true });
document.addEventListener('pointerleave', () => { ptr.on = false; });

const BELL_VS = `
uniform float uC;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv; vec3 p = position; float s = uv.y;
  p.xz *= 1. - (.02 + .17 * s * s) * uC; p.y *= 1. + .09 * uC;
  float ang = uv.x * 6.28318, sc = smoothstep(.85, 1., s);
  p.xz *= 1. + sc * .012 * sin(ang * 16.);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BELL_FS = `
uniform vec3 uTint; uniform float uGlow; uniform float uDim; uniform float uA; uniform float uGon;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 N = normalize(vN), V = normalize(vV);
  float fr = pow(1. - abs(dot(N, V)), 2.1);
  float s = vUv.y, ang = vUv.x * 6.28318;
  float can = pow(abs(cos(vUv.x * 3.14159 * 32.)), 40.) * smoothstep(.3, .95, s);
  float lob = .5 + .5 * cos(ang * 4.);
  float gon = exp(-pow((s - .2 - .1 * lob) / .045, 2.)) * uGon;
  float rim = smoothstep(.9, 1., s);
  float a = .03 + .5 * fr + can * .035 + gon * .14 + rim * .2;
  vec3 col = uTint * (.78 + .4 * fr) + vec3(1.) * gon * .15;
  vec3 L = normalize(vec3(-.5, .8, .5));
  float sp = pow(max(dot(reflect(-L, N), V), 0.), 22.) * .22;
  col += vec3(sp); a += sp * .3;
  gl_FragColor = vec4(col, clamp(a, 0., 1.) * uA * uDim * (1. + uGlow * .7));
}`;
const STR_VS = `
attribute float aT; attribute float aAng; attribute vec4 aP; attribute vec4 aQ;
uniform float uTime; uniform float uC; uniform vec3 uDrag;
varying float vT; varying float vK; varying float vAl; varying vec3 vN; varying vec3 vV;
void main(){
  float t = aT, ph = aQ.x, amp = aQ.y;
  vec3 c = vec3(aP.x, -.2 - aP.z * t, aP.y);
  c.xz *= mix(1. - .17 * uC, 1., min(1., t * 2.5));
  c.xz += vec2(aP.x, aP.y) * .2 * t;
  c.x += sin(uTime * 1.5 - t * 4.6 + ph) * amp * t;
  c.z += cos(uTime * 1.2 - t * 4. + ph * 1.7) * amp * t * .8;
  c += uDrag * t * t;
  float r = aP.w * (1. - .75 * t);
  if (aQ.z > .5) r *= 1. + .45 * sin(t * 22. + aAng * 3. - uTime * 1.4);
  vec3 n = vec3(cos(aAng), 0., sin(aAng));
  vec4 mv = modelViewMatrix * vec4(c + n * r, 1.);
  vN = normalize(normalMatrix * n); vV = normalize(-mv.xyz);
  vT = t; vK = aQ.z; vAl = aQ.w;
  gl_Position = projectionMatrix * mv;
}`;
const STR_FS = `
uniform vec3 uTint; uniform float uDim; uniform float uGlow; uniform float uA;
varying float vT; varying float vK; varying float vAl; varying vec3 vN; varying vec3 vV;
void main(){
  float fr = 1. - abs(dot(normalize(vN), normalize(vV)));
  float a = vAl * (1. - vT * .7) * (.55 + .45 * fr);
  gl_FragColor = vec4(uTint * (.8 + .3 * fr), a * uA * uDim * (1. + uGlow * .7));
}`;

function bellGeo() {
  const pts = [];
  for (let i = 0; i <= 28; i++) { const s = i / 28, a = s * 1.72; pts.push(new T.Vector2(Math.max(.0001, Math.sin(a) * (1 + .04 * s * s * s * s)), Math.cos(a) * .92)); }
  pts.push(new T.Vector2(.975, -.2));
  return new T.LatheGeometry(pts, 56);
}
function strandGeo(list, S, M) {
  const n = list.length, vc = n * (S + 1) * M;
  const pos = new Float32Array(vc * 3), aT = new Float32Array(vc), aAng = new Float32Array(vc), aP = new Float32Array(vc * 4), aQ = new Float32Array(vc * 4), idx = [];
  let v = 0;
  for (const o of list) {
    const base = v;
    for (let i = 0; i <= S; i++) for (let j = 0; j < M; j++) { aT[v] = i / S; aAng[v] = j / M * Math.PI * 2; aP.set([o.ax, o.az, o.len, o.rad], v * 4); aQ.set([o.phase, o.amp, o.kind, o.alpha], v * 4); v++; }
    for (let i = 0; i < S; i++) for (let j = 0; j < M; j++) { const a = base + i * M + j, b = base + i * M + (j + 1) % M, c = a + M, d = b + M; idx.push(a, c, b, b, c, d); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aT', new T.BufferAttribute(aT, 1)); g.setAttribute('aAng', new T.BufferAttribute(aAng, 1));
  g.setAttribute('aP', new T.BufferAttribute(aP, 4)); g.setAttribute('aQ', new T.BufferAttribute(aQ, 4)); g.setIndex(idx); return g;
}

let R;
try { R = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' }); } catch (e) { return; }
R.setClearColor(0x000000, 0);
const scene = new T.Scene(), cam = new T.PerspectiveCamera(35, 1, .1, 60); cam.position.set(0, 0, 10);
const halfH = Math.tan(35 * Math.PI / 360) * 10; let halfW = halfH, W = 0, H = 0;
function size() {
  W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
  R.setPixelRatio(Math.min(devicePixelRatio || 1, MOB ? 1.5 : 1)); R.setSize(W, H, false);
  cam.aspect = W / H; cam.updateProjectionMatrix(); halfW = halfH * W / H;
}
new ResizeObserver(size).observe(cv); size();
const hz = z => halfH * (10 - z) / 10, hw = z => halfW * (10 - z) / 10;
const uTime = { value: 0 }, uA = { value: MOB ? .4 : .34 }, gBell = bellGeo(), jellies = [];
const TINTS = [[.88, .94, 1], [.93, .9, 1], [.87, .98, .96], [1, .95, .9]];
// [size, depth]
const CFG = MOB ? [[.3, 1], [.2, 0], [.17, -1.4], [.24, .4], [.14, -2.8]]
                : [[.44, 1.3], [.3, 0], [.25, -1.3], [.36, .6], [.2, -2.8], [.17, -3.4], [.3, .1], [.16, -2.1]];
CFG.forEach(([s, z], i) => {
  const g = new T.Group(), dim = clamp(.92 + z * .1, .45, 1.05), tint = new T.Color().fromArray(TINTS[i % 4]);
  const U = { uC: { value: 0 }, uGlow: { value: 0 }, uDim: { value: dim }, uTint: { value: tint }, uTime, uA, uDrag: { value: new T.Vector3() } };
  const mk = gon => new T.ShaderMaterial({ uniforms: Object.assign({}, U, { uGon: { value: gon } }), vertexShader: BELL_VS, fragmentShader: BELL_FS, transparent: true, depthWrite: false, side: T.DoubleSide });
  const bell = new T.Mesh(gBell, mk(1)), inner = new T.Mesh(gBell, mk(0));
  inner.scale.set(.8, .55, .8); inner.position.y = -.03;
  const list = [];
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + .2; list.push({ ax: Math.cos(a) * .94, az: Math.sin(a) * .94, len: 1.7 + .9 * Math.abs(Math.sin(k * 2.3)), rad: .012 + .006 * (k % 3), phase: k * 1.3, amp: .22, kind: 0, alpha: .34 }); }
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + .4; list.push({ ax: Math.cos(a) * .17, az: Math.sin(a) * .17, len: 1.25 + .25 * Math.sin(k * 2.1), rad: .07, phase: k * 2, amp: .12, kind: 1, alpha: .2 }); }
  const strands = new T.Mesh(strandGeo(list, 20, 5), new T.ShaderMaterial({ uniforms: U, vertexShader: STR_VS, fragmentShader: STR_FS, transparent: true, depthWrite: false, side: T.DoubleSide }));
  strands.frustumCulled = false;
  g.add(strands, inner, bell); g.scale.setScalar(s); scene.add(g);
  jellies.push({ g, U, s, z, parts: [strands, inner, bell], par: .3 + .28 * (z + 3.4) / 4.7,
    x: 0, y: 0, vx: 0, vy: rand(.04, .1), ph: Math.random(), f: rand(.2, .32), pow: rand(.6, .9), a: rand(0, 9), b: rand(0, 9), dir: rand(-.25, .25), glow: 0, rz: 0 });
});
const n = jellies.length;
jellies.forEach((j, i) => { j.x = (-.84 + 1.68 * (i + .5) / n + rand(-.05, .05)) * hw(j.z); j.y = (-.8 + 1.6 * (((i * 5) % n) + .5) / n) * hz(j.z); });
jellies.slice().sort((p, q) => p.z - q.z).forEach((j, i) => j.parts.forEach((m, k) => { m.renderOrder = i * 10 + k; }));
let camX = 0, camY = 0;

function frame(t, dt) {
  if (!W) return;
  uTime.value = t;
  const sc = scrollY / Math.max(1, innerHeight);
  for (const j of jellies) {
    const HZ = hz(j.z), HW = hw(j.z), span = HZ + 3 * j.s;
    j.ph = (j.ph + dt * j.f * (1 + j.glow * .6)) % 1;
    const ph = j.ph, c = ph < .3 ? Math.sin(ph / .3 * Math.PI / 2) : Math.pow(Math.cos((ph - .3) / .7 * Math.PI / 2), 1.5);
    const thrust = ph < .3 ? Math.cos(ph / .3 * Math.PI / 2) : 0;
    let head = j.dir + Math.sin(t * .11 + j.a) * .5 + Math.sin(t * .27 + j.b) * .22;
    if (j.x > HW * .9) head -= .5; if (j.x < -HW * .9) head += .5;
    j.vx += Math.sin(head) * thrust * j.pow * dt; j.vy += Math.cos(head) * thrust * j.pow * dt;
    let y = j.y + sc * 2 * HZ * j.par; y = ((y + span) % (2 * span) + 2 * span) % (2 * span) - span;
    let tg = 0;
    if (ptr.on) {
      const sx = j.x / HW * .5 + .5, sy = .5 - y / HZ * .5, dx = (sx - ptr.x) * W / H, dy = sy - ptr.y, d = Math.hypot(dx, dy) || 1e-3, rad = MOB ? .16 : .22;
      if (d < rad) { const f = (1 - d / rad) * (1 - d / rad); j.vx += dx / d * f * 1.1 * dt; j.vy -= dy / d * f * 1.1 * dt; tg = Math.min(1, f * 1.5); }
    }
    j.glow += (tg - j.glow) * Math.min(1, dt * 3);
    const dr = Math.exp(-.9 * dt); j.vx *= dr; j.vy *= dr; j.vy -= .012 * dt;
    j.x += j.vx * dt; j.y += j.vy * dt;
    const tz = clamp(-Math.atan2(j.vx, Math.max(.05, j.vy)) * .55, -.6, .6);
    j.rz += (tz - j.rz) * Math.min(1, dt * 1.4);
    j.g.position.set(j.x, y, j.z);
    j.g.rotation.set(.28 + Math.sin(t * .35 + j.a) * .12, t * .12 + j.b, j.rz + Math.sin(t * .4 + j.b) * .05, 'ZXY');
    j.U.uC.value = c; j.U.uGlow.value = j.glow;
    const cz = Math.cos(j.rz), sz = Math.sin(j.rz), lx = -(j.vx * cz + j.vy * sz), ly = -(-j.vx * sz + j.vy * cz);
    j.U.uDrag.value.set(lx * 2.4 / j.s, Math.min(0, ly) * .5 / j.s, 0);
  }
  const tx = ptr.on ? (ptr.x - .5) * -.35 : 0, ty = ptr.on ? (ptr.y - .5) * .2 : 0;
  camX += (tx - camX) * Math.min(1, dt * 2); camY += (ty - camY) * Math.min(1, dt * 2);
  cam.position.set(camX, camY, 10); cam.lookAt(0, 0, 0);
  R.render(scene, cam);
}
let prev = performance.now(), t0 = prev, first = true;
function loop(now) {
  const dt = Math.min(.05, (now - prev) / 1000); prev = now;
  if (!document.hidden) { frame((now - t0) / 1000, dt); if (first) { first = false; cv.classList.add('on'); } }
  requestAnimationFrame(loop);
}
if (RM) { for (let i = 0; i < 40; i++) frame(i * .05, .05); cv.classList.add('on'); addEventListener('scroll', () => frame(2, 0), { passive: true }); }
else requestAnimationFrame(loop);
})();
