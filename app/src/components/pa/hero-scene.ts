import * as THREE from "three";

export type HeroScene = {
  /** 0..1 scroll progress through the hero, driven by GSAP ScrollTrigger. */
  state: { scroll: number };
  dispose: () => void;
};

const cssColor = (host: HTMLElement, name: string, fallback: string) => {
  const v = getComputedStyle(host).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
};

function heartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0.25, 0.25);
  s.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
  s.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
  s.bezierCurveTo(-0.3, 0.55, -0.15, 0.77, 0.25, 0.95);
  s.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
  s.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
  s.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.1,
    bevelSegments: 10,
    curveSegments: 40,
  });
  g.center();
  return g;
}

export function mountHeroScene(canvas: HTMLCanvasElement, reduceMotion: boolean): HeroScene | null {
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
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  const teal = cssColor(host, "--pa-teal", "#167a83");
  const tealSoft = cssColor(host, "--pa-teal-soft", "#46bcc4");
  const orange = cssColor(host, "--pa-orange", "#e9a15a");
  const gold = cssColor(host, "--pa-gold", "#f6c453");
  const sky = cssColor(host, "--pa-sky", "#cdeaf5");

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const warm = new THREE.PointLight(orange, 40, 14);
  warm.position.set(-3.5, -1.5, 3);
  scene.add(warm);

  const world = new THREE.Group();
  scene.add(world);

  const heartGeo = heartGeometry();
  const heartMat = new THREE.MeshStandardMaterial({ color: teal, roughness: 0.38, metalness: 0.08 });
  const heart = new THREE.Mesh(heartGeo, heartMat);
  heart.scale.setScalar(1.5);
  world.add(heart);

  // inner "A" ring so the heart reads as the brand mark
  const ringGeo = new THREE.TorusGeometry(1.45, 0.035, 16, 120);
  const ringMat = new THREE.MeshStandardMaterial({ color: gold, roughness: 0.3, metalness: 0.3 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.6;
  world.add(ring);

  // orbiting soft pieces (the "community" around the heart)
  const palette = [orange, gold, sky, tealSoft];
  const geos = [new THREE.IcosahedronGeometry(1, 1), new THREE.SphereGeometry(1, 24, 16), new THREE.OctahedronGeometry(1, 0)];
  const mats = palette.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, flatShading: true }));
  const pieces: { m: THREE.Mesh; r: number; a: number; s: number; y: number; spin: number }[] = [];
  const count = window.innerWidth < 700 ? 18 : 34;
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geos[i % geos.length], mats[i % mats.length]);
    const size = 0.07 + Math.random() * 0.16;
    m.scale.setScalar(size);
    const r = 1.7 + Math.random() * 1.4;
    pieces.push({ m, r, a: Math.random() * Math.PI * 2, s: 0.08 + Math.random() * 0.22, y: (Math.random() - 0.5) * 3.6, spin: Math.random() * 1.2 });
    world.add(m);
  }

  const state = { scroll: 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the heart on the right on wide screens, centred on narrow ones
    world.position.x = w > 900 ? 2.3 : 0;
    camera.position.z = w > 900 ? 7 : 8.5;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
  io.observe(host);

  const t0 = performance.now();
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = (performance.now() - t0) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    heart.rotation.y = Math.sin(t * 0.6) * 0.35 + pointer.x * 0.5 + state.scroll * Math.PI * 1.2;
    heart.rotation.x = pointer.y * 0.25 - 0.05;
    const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 2.2)), 8) * 0.05;
    heart.scale.setScalar(1.5 * beat);
    ring.rotation.z = t * 0.25;
    ring.rotation.y = pointer.x * 0.3;
    for (const p of pieces) {
      const a = p.a + t * p.s;
      p.m.position.set(Math.cos(a) * p.r, p.y + Math.sin(t * 0.8 + p.a) * 0.2, Math.sin(a) * p.r * 0.6);
      p.m.rotation.x += 0.004 + p.spin * 0.004;
      p.m.rotation.y += 0.006;
    }
    world.position.y = -state.scroll * 1.2;
    renderer.render(scene, camera);
  };
  if (reduceMotion) {
    renderer.render(scene, camera);
  } else {
    frame();
  }

  return {
    state,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      io.disconnect();
      heartGeo.dispose();
      heartMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
