"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeEscrowSealProps {
  state: string;
}

/**
 * Compact studio-lit Three.js 3D Protection Seal medallion for the Safe Transfer page.
 * Adapts material tint to transfer state: emerald (settled), amber (in progress), slate (refunded).
 */
export function ThreeEscrowSeal({ state }: ThreeEscrowSealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const size = 84;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(3, 4, 5);
    scene.add(key);

    const colorHex =
      state === "SETTLED"
        ? 0x059669
        : state === "REFUNDED"
        ? 0x64748b
        : 0xd97706;

    const group = new THREE.Group();
    scene.add(group);

    // Outer glossy metallic ring
    const ringGeo = new THREE.TorusGeometry(1.05, 0.14, 24, 64);
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      metalness: 0.35,
      roughness: 0.18,
      clearcoat: 1.0,
    });
    group.add(new THREE.Mesh(ringGeo, ringMat));

    // Inner faceted crystal gem
    const gemGeo = new THREE.OctahedronGeometry(0.62, 0);
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      transmission: 0.45,
      thickness: 1.2,
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    group.add(gem);

    let animId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.85;
      group.rotation.x = Math.sin(t * 0.9) * 0.22;
      gem.rotation.y = -t * 1.1;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ringGeo.dispose();
      ringMat.dispose();
      gemGeo.dispose();
      gemMat.dispose();
      renderer.dispose();
    };
  }, [state]);

  return (
    <div
      ref={ref}
      className="w-[84px] h-[84px] shrink-0 flex items-center justify-center"
      aria-label="3D Custody Protection Seal"
    />
  );
}
