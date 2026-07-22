// ============================================================================
//  3D 可探索课件展示 · 引擎  (vanilla Three.js, no build step)
//  概念源自 ringhyacinth/hyacinth.im-site（Ring Hyacinth 3D Portfolio Plaza）
//  由 generate.py 复制到产物目录，配合 window.PROFILE 使用。
//  数据模型：{ title, subtitle, intro, modules:[{name,icon,color,summary,content}] }
// ============================================================================
import * as THREE from 'three';

const PROFILE = window.PROFILE || {};

// ---------------------------------------------------------------------------
// 基础设置
// ---------------------------------------------------------------------------
const canvasMount = document.getElementById('app');
const labelsLayer = document.getElementById('labels');
const hintEl = document.getElementById('hint');
const panelEl = document.getElementById('panel');
const panelIcon = document.getElementById('panel-icon');
const panelName = document.getElementById('panel-name');
const panelSummary = document.getElementById('panel-summary');
const sectionNav = document.getElementById('section-nav');
const sectionBody = document.getElementById('section-body');
const panelClose = document.getElementById('panel-close');
const prevSecBtn = document.getElementById('prev-sec');
const nextSecBtn = document.getElementById('next-sec');
const secIndicator = document.getElementById('sec-indicator');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const interactBtn = document.getElementById('interact-btn');
const guideBubble = document.getElementById('guide-bubble');
const bgmBtn = document.getElementById('bgm-btn');
const welcomeEl = document.getElementById('welcome');
const welcomeStart = document.getElementById('w-start');

const PLAZA_RADIUS = 26;
const INTERACT_RADIUS = 4.6;
const STATION_RING = 15;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvasMount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdfeefc, 38, 72);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

// ---------------------------------------------------------------------------
// 灯光
// ---------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xffffff, 0x9bbf8a, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d6, 1.05);
sun.position.set(18, 30, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
sun.shadow.bias = -0.0004;
scene.add(sun);

// ---------------------------------------------------------------------------
// 天空
// ---------------------------------------------------------------------------
(function buildSky() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#a9e0ff');
  grad.addColorStop(0.55, '#d8ecff');
  grad.addColorStop(1.0, '#ffe9c7');
  g.fillStyle = grad; g.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
  );
  scene.add(sky);
})();

// ---------------------------------------------------------------------------
// 地面
// ---------------------------------------------------------------------------
(function buildGround() {
  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(PLAZA_RADIUS + 8, 64),
    new THREE.MeshStandardMaterial({ color: 0x9ad68f, roughness: 1, flatShading: true })
  );
  grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);

  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(STATION_RING + 4, 64),
    new THREE.MeshStandardMaterial({ color: 0xe4d3ad, roughness: 0.95, flatShading: true })
  );
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true; scene.add(plaza);

  for (let r = 5; r < STATION_RING + 3; r += 4) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r, r + 0.12, 64),
      new THREE.MeshBasicMaterial({ color: 0xcbb78c, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; scene.add(ring);
  }
})();

// ---------------------------------------------------------------------------
// 装饰：树 / 喷泉 / 栅栏 / 灯笼
// ---------------------------------------------------------------------------
function makeTree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28 * s, 0.38 * s, 2.2 * s, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a5a3b, roughness: 1, flatShading: true })
  );
  trunk.position.y = 1.1 * s; trunk.castShadow = true; g.add(trunk);
  const leafColor = [0x6fbf73, 0x8fd98f, 0x57b06a][Math.floor(Math.random() * 3)];
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry((1.7 - i * 0.4) * s, (1.8 - i * 0.2) * s, 7),
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 1, flatShading: true })
    );
    cone.position.y = (2.4 + i * 1.0) * s; cone.castShadow = true; g.add(cone);
  }
  g.position.set(x, 0, z); scene.add(g);
}

(function buildDecor() {
  const treeCount = 14;
  for (let i = 0; i < treeCount; i++) {
    const a = (i / treeCount) * Math.PI * 2;
    const r = PLAZA_RADIUS - 1.5;
    makeTree(Math.cos(a) * r, Math.sin(a) * r, 0.9 + Math.random() * 0.3);
  }
  const fountain = new THREE.Group();
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.6, 0.7, 16),
    new THREE.MeshStandardMaterial({ color: 0xcfc4ad, roughness: 0.9, flatShading: true })
  );
  basin.position.y = 0.35; basin.castShadow = true; basin.receiveShadow = true; fountain.add(basin);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0x6fc6e8, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85 })
  );
  water.position.y = 0.66; fountain.add(water);
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 1.6, 10),
    new THREE.MeshStandardMaterial({ color: 0xcfc4ad, flatShading: true })
  );
  col.position.y = 1.3; fountain.add(col);
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xcfc4ad, flatShading: true })
  );
  top.position.y = 2.1; fountain.add(top);
  scene.add(fountain);

  const fenceCount = 40;
  for (let i = 0; i < fenceCount; i++) {
    const a = (i / fenceCount) * Math.PI * 2;
    const r = PLAZA_RADIUS + 2.5;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 1.1, 5),
      new THREE.MeshStandardMaterial({ color: 0xb9a37a, flatShading: true })
    );
    post.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r);
    post.castShadow = true; scene.add(post);
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * (Math.PI / 2);
    const r = STATION_RING + 1.5;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b5a44 })
    );
    pole.position.set(Math.cos(a) * r, 1.5, Math.sin(a) * r);
    scene.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb347, emissiveIntensity: 0.9 })
    );
    lamp.position.set(Math.cos(a) * r, 3.1, Math.sin(a) * r);
    scene.add(lamp);
    const pl = new THREE.PointLight(0xffcf8a, 0.6, 12, 2);
    pl.position.copy(lamp.position); scene.add(pl);
  }
})();

// ---------------------------------------------------------------------------
// 玩家（披风小猫）
// ---------------------------------------------------------------------------
function buildCat(bodyColor = 0xffb86b, capeColor = 0x6c5ce7) {
  const g = new THREE.Group();
  const mat = (c, rough = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, flatShading: true });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.7, 4, 8), mat(bodyColor));
  body.position.y = 0.95; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat(bodyColor));
  head.position.set(0, 1.75, 0.05); head.castShadow = true; g.add(head);
  const earGeo = new THREE.ConeGeometry(0.22, 0.4, 5);
  const earL = new THREE.Mesh(earGeo, mat(bodyColor)); earL.position.set(-0.28, 2.15, 0); earL.rotation.z = 0.2; g.add(earL);
  const earR = new THREE.Mesh(earGeo, mat(bodyColor)); earR.position.set(0.28, 2.15, 0); earR.rotation.z = -0.2; g.add(earR);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0xffe0c0));
  snout.position.set(0, 1.68, 0.45); g.add(snout);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.8, 3, 6), mat(bodyColor));
  tail.position.set(0, 1.0, -0.6); tail.rotation.x = -0.9; g.add(tail);
  const cape = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.3, 1, 1),
    new THREE.MeshStandardMaterial({ color: capeColor, side: THREE.DoubleSide, roughness: 0.9, flatShading: true })
  );
  cape.position.set(0, 1.1, -0.45); cape.rotation.x = 0.25; g.add(cape);
  g.userData.cape = cape;
  return g;
}

const player = buildCat(0xffb86b, 0x6c5ce7);
player.position.set(0, 0, STATION_RING + 2);
scene.add(player);

const guide = buildCat(0xb8e0ff, 0xff8fab);
guide.position.set(0, 0, STATION_RING + 4.5);
guide.rotation.y = Math.PI;
scene.add(guide);
let guideGreeted = false;

// ---------------------------------------------------------------------------
// 学习模块（牌子 signboards）
// ---------------------------------------------------------------------------
const stations = [];
const labelEls = [];

function hexToColor(h) { return new THREE.Color(h || '#4f8cff'); }

// 牌子画布纹理：图标 + 名称 + 一句话 + 进入提示
function signTexture(icon, name, summary, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  const col = '#' + hexToColor(color).getHexString();
  // 底板
  g.fillStyle = '#ffffff';
  roundRect(g, 8, 8, 496, 272, 22); g.fill();
  // 顶部色条
  g.fillStyle = col;
  roundRect(g, 8, 8, 496, 96, 22); g.fill();
  g.fillStyle = col; g.fillRect(8, 80, 496, 24);
  // 图标 + 名称
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.font = '56px sans-serif';
  g.fillText(icon || '📘', 34, 58);
  g.fillStyle = '#ffffff';
  g.font = 'bold 40px "PingFang SC","Microsoft YaHei",sans-serif';
  g.fillText(truncate(g, name || '模块', 360), 110, 58);
  // 一句话
  g.fillStyle = '#5a5a5a';
  g.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
  g.textAlign = 'center';
  wrapText(g, summary || '', 256, 168, 440, 30);
  // 进入提示
  g.fillStyle = col;
  g.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
  g.fillText('▶ 点击进入学习', 256, 244);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = (text || '').split('');
  let line = ''; let yy = y;
  for (const ch of words) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      ctx.fillText(line, x, yy); line = ch; yy += lh;
    } else line += ch;
  }
  if (line) ctx.fillText(line, x, yy);
}

function makeLabel(text) {
  const el = document.createElement('div');
  el.className = 'label';
  el.textContent = text;
  labelsLayer.appendChild(el);
  return el;
}

function buildSignboard(mod, color) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.3, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: 0xcdbfa0, roughness: 0.9, flatShading: true })
  );
  base.position.y = 0.2; base.castShadow = true; base.receiveShadow = true; g.add(base);

  // 两根立柱
  const postMat = new THREE.MeshStandardMaterial({ color: 0x9c8466, roughness: 1, flatShading: true });
  for (const dx of [-1.45, 1.45]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), postMat);
    post.position.set(dx, 1.5, 0); post.castShadow = true; g.add(post);
  }
  // 牌子
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.8),
    new THREE.MeshStandardMaterial({ map: signTexture(mod.icon, mod.name, mod.summary, color), roughness: 0.85 })
  );
  board.position.y = 2.0; board.castShadow = true; g.add(board);
  // 色彩边框
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.0, 0.12),
    new THREE.MeshStandardMaterial({ color: hexToColor(color), roughness: 0.6, flatShading: true })
  );
  frame.position.set(0, 2.0, -0.08); g.add(frame);

  // 互动高亮环
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
  g.userData.ring = ring;
  g.userData.topY = 3.0;
  return g;
}

// 根据 PROFILE.modules 生成牌子
(function buildStations() {
  const mods = PROFILE.modules || [];
  const n = Math.max(mods.length, 1);
  mods.forEach((mod, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const pos = new THREE.Vector3(Math.cos(a) * STATION_RING, 0, Math.sin(a) * STATION_RING);
    const color = mod.color || '#4f8cff';
    const mesh = buildSignboard(mod, color);
    mesh.position.copy(pos);
    mesh.lookAt(0, mesh.position.y, 0);
    scene.add(mesh);
    const label = makeLabel(mod.name || ('模块 ' + (i + 1)));
    const st = { group: mesh, data: mod, label: mod.name || ('模块 ' + (i + 1)), basePos: pos, labelEl: label };
    stations.push(st);
    labelEls.push({ st, el: label });
  });
})();

// ---------------------------------------------------------------------------
// 输入
// ---------------------------------------------------------------------------
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'e' && !panelEl.classList.contains('open')) tryInteract();
  if (e.key === 'Escape') closePanel();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

let camYaw = 0, camPitch = 0.45;
let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, moved = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY; downX = e.clientX; downY = e.clientY; moved = 0;
});
window.addEventListener('pointerup', (e) => {
  if (dragging && moved < 6) handleClick(e.clientX, e.clientY);
  dragging = false;
});
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
  camYaw -= dx * 0.005;
  camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.004, 0.12, 1.15);
});

function handleClick(cx, cy) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(stations.map((s) => s.group), true);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj && !stations.find((s) => s.group === obj)) obj = obj.parent;
    const st = stations.find((s) => s.group === obj);
    if (st) openModule(st);
  }
}

// 虚拟摇杆
const joy = { active: false, id: null, x: 0, y: 0 };
function joyCompute(e) {
  const rect = joystickBase.getBoundingClientRect();
  let dx = e.clientX - (rect.left + 50);
  let dy = e.clientY - (rect.top + 50);
  const len = Math.hypot(dx, dy) || 1;
  const max = 42;
  if (len > max) { dx = dx / len * max; dy = dy / len * max; }
  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joy.x = dx / max; joy.y = dy / max;
}
function joyStart(e) { e.stopPropagation(); e.preventDefault(); joy.active = true; joy.id = e.pointerId; joyCompute(e); }
function joyMove(e) { if (!joy.active || e.pointerId !== joy.id) return; e.stopPropagation(); joyCompute(e); }
function joyEnd(e) { if (e.pointerId !== joy.id) return; joy.active = false; joy.x = 0; joy.y = 0; joystickKnob.style.transform = 'translate(0,0)'; }
joystickBase.addEventListener('pointerdown', joyStart);
joystickBase.addEventListener('pointermove', joyMove);
window.addEventListener('pointerup', joyEnd);
window.addEventListener('pointercancel', joyEnd);

// ---------------------------------------------------------------------------
// 内容面板（模块小节）
// ---------------------------------------------------------------------------
let activeModule = null;
let currentSections = [];
let currentSec = 0;

function tryInteract() {
  if (activeModule) openModule(activeModule);
}
interactBtn.addEventListener('click', tryInteract);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// 把 content 解析为小节：以 # / ## / ### 开头的行作为小节标题
function parseSections(content) {
  const lines = (content || '').split('\n');
  const sections = [];
  let cur = null;
  const push = () => { if (cur) { cur.body = cur.body.join('\n').trim(); sections.push(cur); } };
  for (let raw of lines) {
    const line = raw.replace(/\r$/, '');
    const m = line.match(/^#{1,3}\s+(.+)$/);
    if (m) { push(); cur = { title: m[1].trim(), body: [] }; }
    else { if (!cur) cur = { title: '内容', body: [] }; cur.body.push(line); }
  }
  push();
  if (!sections.length) sections.push({ title: '内容', body: '' });
  return sections;
}

function renderBody(text) {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/`([^`]+?)`/g, '<code>$1</code>');
  return s;
}

function openModule(st) {
  activeModule = st;
  const mod = st.data;
  const color = mod.color || '#4f8cff';
  panelIcon.textContent = mod.icon || '📘';
  panelName.textContent = mod.name || '模块';
  panelSummary.textContent = mod.summary || '';
  panelEl.style.setProperty('--mc', color);
  currentSections = parseSections(mod.content);
  currentSec = 0;
  renderSectionNav();
  showSection(0);
  panelEl.classList.add('open');
}

function renderSectionNav() {
  sectionNav.innerHTML = '';
  currentSections.forEach((sec, i) => {
    const b = document.createElement('button');
    b.className = 'sec-item' + (i === currentSec ? ' active' : '');
    b.textContent = sec.title;
    b.addEventListener('click', () => showSection(i));
    sectionNav.appendChild(b);
  });
}

function showSection(i) {
  currentSec = i;
  const sec = currentSections[i];
  sectionBody.innerHTML = `<h3>${esc(sec.title)}</h3><div class="content">${renderBody(sec.body)}</div>`;
  sectionBody.scrollTop = 0;
  [...sectionNav.children].forEach((el, idx) => el.classList.toggle('active', idx === i));
  secIndicator.textContent = `${i + 1} / ${currentSections.length}`;
  prevSecBtn.disabled = (i === 0);
  nextSecBtn.disabled = (i === currentSections.length - 1);
}

prevSecBtn.addEventListener('click', () => { if (currentSec > 0) showSection(currentSec - 1); });
nextSecBtn.addEventListener('click', () => { if (currentSec < currentSections.length - 1) showSection(currentSec + 1); });

function closePanel() {
  panelEl.classList.remove('open');
  activeModule = null;
}
panelClose.addEventListener('click', closePanel);

// ---------------------------------------------------------------------------
// 开场欢迎层
// ---------------------------------------------------------------------------
welcomeStart.addEventListener('click', () => welcomeEl.classList.add('hide'));

// ---------------------------------------------------------------------------
// 背景音乐（可选）
// ---------------------------------------------------------------------------
let bgm = null;
if (PROFILE.bgm) {
  bgmBtn.style.display = 'block';
  bgm = new Audio(PROFILE.bgm);
  bgm.loop = true; bgm.volume = 0.5;
  let on = false;
  bgmBtn.addEventListener('click', () => {
    if (!on) { bgm.play().catch(() => {}); bgmBtn.textContent = '🔊 音乐开'; }
    else { bgm.pause(); bgmBtn.textContent = '🎵 音乐'; }
    on = !on;
  });
}

// ---------------------------------------------------------------------------
// 主循环
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
const tmp = new THREE.Vector3();

function update(dt) {
  forward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)).normalize();
  right.set(forward.z, 0, -forward.x);

  let ix = 0, iz = 0;
  if (keys['w'] || keys['arrowup']) iz -= 1;
  if (keys['s'] || keys['arrowdown']) iz += 1;
  if (keys['a'] || keys['arrowleft']) ix -= 1;
  if (keys['d'] || keys['arrowright']) ix += 1;
  if (joy.active) { ix += joy.x; iz += joy.y; }

  move.set(0, 0, 0);
  if (ix !== 0 || iz !== 0) {
    move.addScaledVector(forward, -iz).addScaledVector(right, ix);
    move.y = 0; move.normalize();
    const speed = 7.5;
    player.position.addScaledVector(move, speed * dt);
    const targetYaw = Math.atan2(move.x, move.z);
    player.rotation.y = lerpAngle(player.rotation.y, targetYaw, 0.2);
    if (player.userData.cape) player.userData.cape.rotation.x = 0.25 + Math.sin(clock.elapsedTime * 6) * 0.08;
  }
  const dist = Math.hypot(player.position.x, player.position.z);
  if (dist > PLAZA_RADIUS) {
    player.position.x = player.position.x / dist * PLAZA_RADIUS;
    player.position.z = player.position.z / dist * PLAZA_RADIUS;
  }

  const camDist = 8, camHeight = 3.2;
  const ox = Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  const oz = Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  const oy = Math.sin(camPitch) * camDist + camHeight;
  tmp.set(player.position.x + ox, player.position.y + oy, player.position.z + oz);
  camera.position.lerp(tmp, 0.12);
  camera.lookAt(player.position.x, player.position.y + 1.4, player.position.z);

  let nearest = null, nearestD = INTERACT_RADIUS;
  for (const st of stations) {
    const d = Math.hypot(player.position.x - st.basePos.x, player.position.z - st.basePos.z);
    const ring = st.group.userData.ring;
    if (d < INTERACT_RADIUS) {
      ring.material.opacity = 0.5 * (1 - d / INTERACT_RADIUS) + 0.15;
      if (d < nearestD) { nearestD = d; nearest = st; }
    } else {
      ring.material.opacity = Math.max(0, ring.material.opacity - dt);
    }
  }
  activeModule = (panelEl.classList.contains('open')) ? activeModule : nearest;

  if (nearest && !panelEl.classList.contains('open')) {
    hintEl.style.opacity = '1';
    hintEl.textContent = `按 E 或点击查看「${nearest.label}」`;
    interactBtn.style.display = isTouch ? 'block' : 'none';
  } else {
    hintEl.style.opacity = '0';
    interactBtn.style.display = 'none';
  }

  const gd = Math.hypot(player.position.x - guide.position.x, player.position.z - guide.position.z);
  if (!guideGreeted && gd < 6) {
    guideGreeted = true;
    guideBubble.style.display = 'block';
    guideBubble.textContent = `你好，我是向导 Nika～${PROFILE.intro ? PROFILE.intro : '用 WASD/方向键走动，靠近牌子按 E 进入学习吧！'}`;
    setTimeout(() => { guideBubble.style.display = 'none'; }, 7000);
  }

  for (const { st, el } of labelEls) {
    tmp.copy(st.basePos); tmp.y = st.group.userData.topY + 0.6;
    tmp.project(camera);
    if (tmp.z < 1) {
      el.style.display = 'block';
      el.style.left = (tmp.x * 0.5 + 0.5) * window.innerWidth + 'px';
      el.style.top = (-tmp.y * 0.5 + 0.5) * window.innerHeight + 'px';
    } else el.style.display = 'none';
  }
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('load', () => document.body.classList.add('ready'));
setTimeout(() => document.body.classList.add('ready'), 10000);
