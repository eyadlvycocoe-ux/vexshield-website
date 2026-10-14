import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  className?: string;
  mouseX?: number;
  mouseY?: number;
};

export default function Hero3DCanvas({ className = "", mouseX = 0, mouseY = 0 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: mouseX, y: mouseY });

  useEffect(() => {
    mouseRef.current = { x: mouseX, y: mouseY };
  }, [mouseX, mouseY]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0.2, 4.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const particleCount = reduced ? 400 : 1400;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 2.4 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: reduced ? 0.018 : 0.014,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(particles);

    const ringGeo = new THREE.TorusGeometry(1.55, 0.018, 12, 120);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.55 }),
    );
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);

    const ring2Geo = new THREE.TorusGeometry(1.85, 0.01, 8, 100);
    const ring2 = new THREE.Mesh(
      ring2Geo,
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.35 }),
    );
    ring2.rotation.x = Math.PI / 3.1;
    ring2.rotation.y = 0.4;
    scene.add(ring2);

    const glowGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const glow = new THREE.Mesh(
      glowGeo,
      new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.12 }),
    );
    glow.position.set(1.4, -0.35, 0.2);
    scene.add(glow);

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 1 || h < 1) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    let t0 = performance.now();
    let visible = true;
    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const dt = (now - t0) * 0.001;
      t0 = now;

      // Skip GPU work entirely when scrolled off-screen.
      if (!visible) return;

      const { x: mx, y: my } = mouseRef.current;

      if (!reduced) {
        particles.rotation.y += dt * 0.06;
        ring.rotation.z += dt * 0.35;
        ring2.rotation.z -= dt * 0.22;
      }

      camera.position.x = mx * 0.35;
      camera.position.y = 0.2 + my * 0.22;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    // Pause the loop when the canvas leaves the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) t0 = performance.now();
      },
      { threshold: 0 },
    );
    io.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      particleGeo.dispose();
      ringGeo.dispose();
      ring2Geo.dispose();
      glowGeo.dispose();
      renderer.dispose();
      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden />;
}
