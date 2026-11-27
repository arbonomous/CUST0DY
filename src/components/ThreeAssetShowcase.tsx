"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeAssetShowcaseProps {
  name: string;
  subCategory: string;
  platform: string;
  priceLabel: string;
}

/**
 * Interactive Three.js 3D physical collectible card for an asset detail page.
 * Renders a sleek, studio-lit metallic/frosted 3D card with live cursor tilt
 * and dynamic specular sheen (Apple Card / luxury collectible aesthetic).
 */
export function ThreeAssetShowcase({
  name,
  subCategory,
  platform,
  priceLabel,
}: ThreeAssetShowcaseProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Studio lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.4));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.6);
    dir1.position.set(4, 5, 5);
    scene.add(dir1);

    const emeraldRim = new THREE.PointLight(0x10b981, 2.2, 12);
    emeraldRim.position.set(-4, -2, 3);
    scene.add(emeraldRim);

    // Draw crisp high-DPI card face onto a CanvasTexture
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 1024;
    texCanvas.height = 600;
    const ctx = texCanvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 1024, 600);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.55, "#f8fafc");
      grad.addColorStop(1, "#ecfdf5");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 600);

      // Subtle border
      ctx.strokeStyle = "#e4e4e7";
      ctx.lineWidth = 6;
      ctx.strokeRect(18, 18, 988, 564);

      // Top-left Cust0dy badge
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 28px ui-monospace, Menlo, monospace";
      ctx.fillText("Cust0dy", 64, 88);

      // Top-right Verified pill
      ctx.fillStyle = "#ecfdf5";
      ctx.fillRect(720, 52, 240, 48);
      ctx.strokeStyle = "#a7f3d0";
      ctx.lineWidth = 2;
      ctx.strokeRect(720, 52, 240, 48);
      ctx.fillStyle = "#047857";
      ctx.font = "600 22px Inter, system-ui, sans-serif";
      ctx.fillText("✓ Verified Owner", 750, 84);

      // Centerpiece Asset Name
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 92px Inter, system-ui, sans-serif";
      ctx.fillText(name, 64, 330);

      // Subtitle
      ctx.fillStyle = "#64748b";
      ctx.font = "500 28px Inter, system-ui, sans-serif";
      ctx.fillText(`${subCategory}  •  ${platform}  •  Protected Escrow`, 64, 392);

      // Bottom price
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 22px Inter, system-ui, sans-serif";
      ctx.fillText("BUY NOW", 64, 495);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 44px Inter, system-ui, sans-serif";
      ctx.fillText(priceLabel, 64, 545);
    }

    const cardTexture = new THREE.CanvasTexture(texCanvas);
    cardTexture.colorSpace = THREE.SRGBColorSpace;
    cardTexture.anisotropy = 8;

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.45,
      roughness: 0.25,
    });
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: cardTexture,
      roughness: 0.18,
      metalness: 0.06,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    });

    const cardGeo = new THREE.BoxGeometry(3.8, 2.22, 0.08);
    const cardMesh = new THREE.Mesh(cardGeo, [
      sideMat,
      sideMat,
      sideMat,
      sideMat,
      frontMat,
      sideMat,
    ]);
    scene.add(cardMesh);

    let targetY = -0.12;
    let targetX = 0.06;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetY = nx * 0.36;
      targetX = ny * 0.22;
    };
    const onPointerLeave = () => {
      targetY = -0.12;
      targetX = 0.06;
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);

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
      cardMesh.position.y = Math.sin(t * 1.4) * 0.07;
      cardMesh.rotation.y += (targetY + Math.sin(t * 0.6) * 0.04 - cardMesh.rotation.y) * 0.07;
      cardMesh.rotation.x += (targetX - cardMesh.rotation.x) * 0.07;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      cardGeo.dispose();
      cardTexture.dispose();
      sideMat.dispose();
      frontMat.dispose();
      renderer.dispose();
    };
  }, [name, subCategory, platform, priceLabel]);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-zinc-50 via-white to-emerald-50/40 border border-zinc-200/90 overflow-hidden shadow-xs">
      <div
        ref={mountRef}
        className="w-full h-[250px] sm:h-[280px] cursor-grab active:cursor-grabbing"
        aria-label={`Interactive 3D card for ${name}`}
      />
    </div>
  );
}
