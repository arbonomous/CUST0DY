"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Seamless, bright studio-lit Three.js ambient 3D background for the hero.
 * Renders soft frosted-glass & pearl geometric forms gently floating around
 * the hero edges with subtle pointer parallax (Apple / Stripe light-mode feel).
 */
export function ThreeHeroCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 9.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Soft bright studio lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1.35);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const mintLight = new THREE.PointLight(0x34d399, 2.4, 18);
    mintLight.position.set(-5, 2, 4);
    scene.add(mintLight);

    const skyLight = new THREE.PointLight(0x60a5fa, 2.4, 18);
    skyLight.position.set(5, -2, 4);
    scene.add(skyLight);

    const root = new THREE.Group();
    scene.add(root);

    // Sculptural frosted-glass / glossy ceramic forms placed framing the hero text
    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.14,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      transmission: 0.35,
      thickness: 1.2,
    });

    const mintGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd1fae5,
      roughness: 0.18,
      metalness: 0.08,
      clearcoat: 1.0,
      transmission: 0.45,
      thickness: 1.4,
    });

    const skyGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      roughness: 0.16,
      metalness: 0.08,
      clearcoat: 1.0,
      transmission: 0.45,
      thickness: 1.4,
    });

    const geometries: THREE.BufferGeometry[] = [];
    const shapes: Array<{
      mesh: THREE.Mesh;
      baseX: number;
      baseY: number;
      speed: number;
      phase: number;
    }> = [];

    // Left cluster: Soft frosted torus + floating sphere
    const torusGeo = new THREE.TorusGeometry(1.15, 0.36, 32, 72);
    geometries.push(torusGeo);
    const leftTorus = new THREE.Mesh(torusGeo, skyGlassMat);
    leftTorus.position.set(-5.2, 0.55, -1.2);
    leftTorus.rotation.set(0.5, 0.4, 0.2);
    root.add(leftTorus);
    shapes.push({ mesh: leftTorus, baseX: -5.2, baseY: 0.55, speed: 0.6, phase: 0 });

    const sphereGeo = new THREE.SphereGeometry(0.62, 36, 36);
    geometries.push(sphereGeo);
    const leftOrb = new THREE.Mesh(sphereGeo, mintGlassMat);
    leftOrb.position.set(-3.9, -1.25, 0.2);
    root.add(leftOrb);
    shapes.push({ mesh: leftOrb, baseX: -3.9, baseY: -1.25, speed: 0.85, phase: 1.7 });

    // Right cluster: Rounded octahedron gem + glossy capsule
    const gemGeo = new THREE.IcosahedronGeometry(1.05, 1);
    geometries.push(gemGeo);
    const rightGem = new THREE.Mesh(gemGeo, mintGlassMat);
    rightGem.position.set(5.2, -0.35, -0.8);
    root.add(rightGem);
    shapes.push({ mesh: rightGem, baseX: 5.2, baseY: -0.35, speed: 0.55, phase: 3.1 });

    const capsuleGeo = new THREE.CapsuleGeometry(0.45, 0.95, 16, 32);
    geometries.push(capsuleGeo);
    const rightPill = new THREE.Mesh(capsuleGeo, pearlMat);
    rightPill.position.set(4.1, 1.35, -0.4);
    rightPill.rotation.set(0.4, 0.2, -0.65);
    root.add(rightPill);
    shapes.push({ mesh: rightPill, baseX: 4.1, baseY: 1.35, speed: 0.72, phase: 4.4 });

    // Subtle tiny accent pearl spheres
    const smallGeo = new THREE.SphereGeometry(0.24, 24, 24);
    geometries.push(smallGeo);
    const accent1 = new THREE.Mesh(smallGeo, pearlMat);
    accent1.position.set(-2.9, 1.45, -1.4);
    root.add(accent1);
    shapes.push({ mesh: accent1, baseX: -2.9, baseY: 1.45, speed: 0.9, phase: 2.2 });

    const accent2 = new THREE.Mesh(smallGeo, skyGlassMat);
    accent2.position.set(3.2, -1.45, -1.2);
    root.add(accent2);
    shapes.push({ mesh: accent2, baseX: 3.2, baseY: -1.45, speed: 0.8, phase: 5.1 });

    // Gentle pointer parallax
    let targetRotX = 0;
    let targetRotY = 0;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetRotY = nx * 0.14;
      targetRotX = ny * 0.08;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    ro.observe(container);

    let animId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      for (const s of shapes) {
        s.mesh.position.y = s.baseY + Math.sin(t * s.speed + s.phase) * 0.22;
        s.mesh.rotation.x += 0.0025 * s.speed;
        s.mesh.rotation.y += 0.0038 * s.speed;
      }

      root.rotation.y += (targetRotY - root.rotation.y) * 0.04;
      root.rotation.x += (targetRotX - root.rotation.x) * 0.04;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      geometries.forEach((g) => g.dispose());
      pearlMat.dispose();
      mintGlassMat.dispose();
      skyGlassMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-90"
    />
  );
}
