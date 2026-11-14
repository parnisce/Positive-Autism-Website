import * as THREE from "three";

export type ShopScene = {
  /** 0..1 scroll progress through the hero, driven by ScrollTrigger. */
  state: { scroll: number };
  dispose: () => void;
};

const cssColor = (host: HTMLElement, name: string, fallback: string) => {
  const v = getComputedStyle(host).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
};

/** White rounded rectangle on black: used as the alpha map that rounds the cover corners. */
function roundedMask(size = 256, radius = 30) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(radius, 0);
  g.arcTo(size, 0, size, size, radius);
  g.arcTo(size, size, 0, size, radius);
  g.arcTo(0, size, 0, 0, radius);
  g.arcTo(0, 0, size, 0, radius);
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// where each cover floats: x, y, z, tilt (radians), scale
const SLOTS: [number, number, number, number, number][] = [
  [-0.4, 1.35, -0.6, -0.14, 1.5],
  [1.55, 1.05, 0.5, 0.1, 1.6],
  [3.2, 1.45, -0.9, -0.08, 1.4],
  [0.1, -0.55, 0.7, 0.12, 1.55],
  [2.0, -0.35, 1.3, -0.1, 1.7],
  [3.7, -0.5, 0, 0.14, 1.45],
  [0.8, -2.05, -0.2, -0.12, 1.4],
  [2.7, -2.0, 0.5, 0.09, 1.5],
  [4.15, -1.95, -0.7, -0.15, 1.3],
];

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export function mountShopScene(canvas: HTMLCanvasElement, covers: string[], reduceMotion: boolean): ShopScene | null {
  const host = canvas.parentElement as HTMLElement;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  const orange = cssColor(host, "--pa-orange", "#e9a15a");
  const gold = cssColor(host, "--pa-gold", "#f6c453");
  const tealSoft = cssColor(host, "--pa-teal-soft", "#46bcc4");
  const sky = cssColor(host, "--pa-sky", "#cdeaf5");

  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(3, 4, 6);
  scene.add(key);

  const world = new THREE.Group();
  scene.add(world);

  const mask = roundedMask();
  const loader = new THREE.TextureLoader();
  const disposables: { dispose: () => void }[] = [mask];

  // --- floating ebook covers ---
  type Item = { g: THREE.Group; x: number; y: number; z: number; rz: number; s: number; ph: number; sp: number; born: number };
  const items: Item[] = [];
  const frameGeo = new THREE.PlaneGeometry(1.1, 1.1);
  const coverGeo = new THREE.PlaneGeometry(1, 1);
  const shadowGeo = new THREE.PlaneGeometry(1.12, 1.12);
  disposables.push(frameGeo, coverGeo, shadowGeo);
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: mask, transparent: true });
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x0b2a30, alphaMap: mask, transparent: true, opacity: 0.22 });
  disposables.push(frameMat, shadowMat);

  let clockStart = performance.now();
  const now = () => (performance.now() - clockStart) / 1000;

  covers.slice(0, SLOTS.length).forEach((url, i) => {
    const [x, y, z, rz, s] = SLOTS[i];
    const g = new THREE.Group();
    g.scale.setScalar(0.0001);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.set(0.07, -0.09, -0.02);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -0.005;
    g.add(shadow, frame);
    const item: Item = { g, x, y, z, rz, s, ph: Math.random() * 6.28, sp: 0.5 + Math.random() * 0.5, born: Infinity };
    items.push(item);
    world.add(g);
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tex, alphaMap: mask, transparent: true });
      disposables.push(tex, mat);
      g.add(new THREE.Mesh(coverGeo, mat));
      item.born = reduceMotion ? -10 : now() + i * 0.09; // covers pop in one after another
      if (reduceMotion) draw();
    });
  });

  // --- soft shapes behind the covers (same family as the home page) ---
  const shapeGeos = [new THREE.IcosahedronGeometry(1, 1), new THREE.SphereGeometry(1, 20, 14), new THREE.OctahedronGeometry(1, 0)];
  const shapeMats = [orange, gold, tealSoft, sky].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, flatShading: true }));
  disposables.push(...shapeGeos, ...shapeMats);
  const shapes: { m: THREE.Mesh; r: number; a: number; s: number; y: number }[] = [];
  const nShapes = window.innerWidth < 700 ? 8 : 16;
  for (let i = 0; i < nShapes; i++) {
    const m = new THREE.Mesh(shapeGeos[i % 3], shapeMats[i % 4]);
    m.scale.setScalar(0.07 + Math.random() * 0.15);
    const sh = { m, r: 2.2 + Math.random() * 2.3, a: Math.random() * 6.28, s: 0.05 + Math.random() * 0.14, y: (Math.random() - 0.5) * 5 };
    shapes.push(sh);
    world.add(m);
  }

  const state = { scroll: 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  let baseY = 0;
  let unit = 1;
  let shapeCx = -0.5;
  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w > 900;
    // covers sit on the right of wide screens, below the text on narrow ones
    world.position.x = wide ? 0.6 : -1.15;
    baseY = wide ? 0.1 : -2.4;
    unit = wide ? 0.85 : 0.62;
    shapeCx = wide ? 3.3 : -0.5; // shapes orbit on the right so they stay off the headline
    world.scale.setScalar(unit);
    camera.position.z = wide ? 9 : 9.5;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
  io.observe(host);

  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    // skip rendering while the hero is off-screen or covered by the shop section
    if (!visible || document.hidden || window.scrollY > host.clientHeight * 0.95) return;
    draw();
  };
  function draw() {
    const t = now();
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    for (const it of items) {
      const a = Math.min(1, Math.max(0, (t - it.born) / 0.9));
      const e = a === 0 ? 0.0001 : easeOutBack(a);
      it.g.scale.setScalar(it.s * e * 0.62);
      // nearer covers react more to the pointer (parallax)
      it.g.position.set(
        it.x + pointer.x * (0.25 + it.z * 0.22),
        it.y + Math.sin(t * it.sp + it.ph) * 0.13 - state.scroll * (0.6 + it.z * 0.4),
        it.z,
      );
      it.g.rotation.set(-pointer.y * 0.18, pointer.x * 0.3 + Math.sin(t * 0.4 + it.ph) * 0.06, it.rz + Math.sin(t * 0.5 + it.ph) * 0.03);
    }
    for (const s of shapes) {
      const a = s.a + t * s.s;
      s.m.position.set(Math.cos(a) * s.r + shapeCx, s.y + Math.sin(t * 0.7 + s.a) * 0.2, Math.sin(a) * s.r * 0.5 - 1.8);
      s.m.rotation.x += 0.004;
      s.m.rotation.y += 0.006;
    }
    world.position.y = baseY - state.scroll * 0.8;
    world.rotation.y = pointer.x * 0.06;
    renderer.render(scene, camera);
  }
  // with reduced motion the scene is drawn once per loaded cover instead of animating
  if (!reduceMotion) frame();

  return {
    state,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
