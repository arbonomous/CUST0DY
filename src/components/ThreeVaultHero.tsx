"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { ShieldCheck, Lock, ArrowLeftRight, PlusCircle, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn, formatCurrency } from "@/lib/utils";

type SceneMode = "VAULT" | "SWAP" | "SHIELD";

interface ThreeVaultHeroProps {
  totalAssets: number;
  activeEscrowCount: number;
  totalEscrowLocked: number;
  firstEscrowId: string | null;
}

export function ThreeVaultHero({
  totalAssets,
  activeEscrowCount,
  totalEscrowLocked,
  firstEscrowId,
}: ThreeVaultHeroProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<SceneMode>("VAULT");
  const [sceneMode, setSceneMode] = useState<SceneMode>("VAULT");

  useEffect(() => {
    modeRef.current = sceneMode;
  }, [sceneMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 380;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 6.2);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lighting — Crisp obsidian studio setup
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const emeraldLight = new THREE.PointLight(0x10b981, 4.2, 16);
    emeraldLight.position.set(3.2, 2.4, 3.5);
    scene.add(emeraldLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 3.8, 16);
    blueLight.position.set(-3.5, -2.0, 2.8);
    scene.add(blueLight);

    const amberLight = new THREE.PointLight(0xf59e0b, 2.2, 14);
    amberLight.position.set(0, 3.5, -2.5);
    scene.add(amberLight);

    // Root interactive group
    const vaultGroup = new THREE.Group();
    scene.add(vaultGroup);

    // 1. Inner Obsidian Core
    const coreGeo = new THREE.IcosahedronGeometry(1.18, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x121215,
      metalness: 0.85,
      roughness: 0.22,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    vaultGroup.add(coreMesh);

    // 2. Emerald Cryptographic Wireframe Cage
    const cageGeo = new THREE.IcosahedronGeometry(1.52, 1);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.42,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    vaultGroup.add(cageMesh);

    // 3. Dual Orbital Escrow Rings
    const ring1Geo = new THREE.TorusGeometry(2.15, 0.022, 16, 96);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.65,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI * 0.36;
    ring1.rotation.y = Math.PI * 0.14;
    vaultGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.45, 0.016, 16, 96);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.48,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI * 0.32;
    ring2.rotation.y = -Math.PI * 0.22;
    vaultGroup.add(ring2);

    // 4. Orbiting Verified Digital Asset Nodes (.ai domains & OG handles)
    const nodeGroup = new THREE.Group();
    vaultGroup.add(nodeGroup);
    const nodeGeo = new THREE.OctahedronGeometry(0.16, 0);
    const nodeColors = [0x10b981, 0x3b82f6, 0xf59e0b, 0x10b981, 0x3b82f6, 0xe4e4e7];
    const orbitNodes: Array<{ mesh: THREE.Mesh; radius: number; speed: number; angle: number; yOffset: number }> = [];

    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: nodeColors[i],
        emissive: nodeColors[i],
        emissiveIntensity: 0.45,
        metalness: 0.6,
        roughness: 0.25,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      const angle = (i / 6) * Math.PI * 2;
      const radius = 2.15 + (i % 2) * 0.35;
      const yOffset = (i % 3 - 1) * 0.45;
      mesh.position.set(Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius);
      nodeGroup.add(mesh);
      orbitNodes.push({ mesh, radius, speed: 0.45 + (i % 3) * 0.12, angle, yOffset });
    }

    // 5. Ambient Depth Starfield
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1.5;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x71717a,
      size: 0.035,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Smooth pointer parallax
    let targetX = 0;
    let targetY = 0;
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetX = nx * 0.45;
      targetY = ny * 0.32;
    };
    container.addEventListener("pointermove", onPointerMove);

    // ResizeObserver for crisp responsiveness
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

    // Animation loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const mode = modeRef.current;

      const speedMult = mode === "SWAP" ? 2.1 : mode === "SHIELD" ? 0.7 : 1.0;

      coreMesh.rotation.y = t * 0.28 * speedMult;
      coreMesh.rotation.x = Math.sin(t * 0.4) * 0.18;

      cageMesh.rotation.y = -t * 0.2 * speedMult;
      cageMesh.rotation.z = t * 0.14;
      const targetScale = mode === "SHIELD" ? 1.12 : 1.0;
      cageMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.06);
      cageMat.color.setHex(
        mode === "SWAP" ? 0x3b82f6 : mode === "SHIELD" ? 0xf59e0b : 0x10b981
      );

      ring1.rotation.z = t * 0.32 * speedMult;
      ring2.rotation.z = -t * 0.24 * speedMult;

      for (const n of orbitNodes) {
        const a = n.angle + t * n.speed * speedMult;
        const r = mode === "SWAP" ? n.radius * 0.88 : n.radius;
        n.mesh.position.set(
          Math.cos(a) * r,
          n.yOffset + Math.sin(t * 1.4 + n.angle) * 0.14,
          Math.sin(a) * r
        );
        n.mesh.rotation.x = t * 1.1;
        n.mesh.rotation.y = t * 0.9;
      }

      vaultGroup.rotation.y += (targetX - vaultGroup.rotation.y) * 0.05;
      vaultGroup.rotation.x += (targetY - vaultGroup.rotation.x) * 0.05;
      particles.rotation.y = t * 0.03;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      coreGeo.dispose();
      coreMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      nodeGeo.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section className="rounded-xl bg-[#121215] border border-[#27272A] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
        {/* Left: User-Friendly Value Prop & Clear CTAs */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-50 leading-[1.15]">
              Buy, Sell &amp; Swap Rare Domains and Handles — Protected by Automated Escrow
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
              Every domain (<span className="font-mono text-zinc-200">.ai, .xyz, .io, .com</span>) and handle (<span className="font-mono text-zinc-200">@X, Telegram, ENS, .sol</span>) is ownership-verified before listing. Payment locks safely in escrow until transfer keys are verified.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="#marketplace">
              <Button variant="emerald" size="lg">
                Browse {totalAssets} Verified Assets
                <ArrowDown className="w-4 h-4" />
              </Button>
            </a>
            <Link href="/list">
              <Button variant="primary" size="lg">
                <PlusCircle className="w-4 h-4" />
                Sell or Verify an Asset
              </Button>
            </Link>
            {firstEscrowId && (
              <Link href={`/escrow/${firstEscrowId}`}>
                <Button variant="secondary" size="lg">
                  <Lock className="w-4 h-4 text-[#F59E0B]" />
                  Live Escrow Room ({activeEscrowCount})
                </Button>
              </Link>
            )}
          </div>

          {/* Friendly 3-Step Escrow Trust Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#27272A]">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-100">Funds Lock Safely</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Pay via Card or USDC. Zero off-platform risk.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-100">Encrypted Handover</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">EPP codes &amp; 2FA vaults encrypted with AES-256.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#60A5FA] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-100">24h Auto-Refund Guard</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Seller misses SLA? Automatic 100% refund.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive Three.js 3D Custody Vault Stage */}
        <div className="lg:col-span-5 relative bg-[#09090B] border-t lg:border-t-0 lg:border-l border-[#27272A] min-h-[340px] lg:min-h-[410px] flex flex-col justify-between">
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
            <div className="px-2.5 py-1 rounded bg-[#121215]/90 border border-[#27272A] font-mono text-[10px] text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              THREE.JS 3D CUSTODY VAULT
            </div>
            <div className="px-2.5 py-1 rounded bg-[#121215]/90 border border-[#27272A] font-mono text-[10px] text-[#F59E0B]">
              {formatCurrency(totalEscrowLocked)} LOCKED
            </div>
          </div>

          <div
            ref={mountRef}
            className="w-full h-[340px] lg:h-[410px] cursor-grab active:cursor-grabbing"
            aria-label="Interactive Three.js 3D Custody Vault visualization"
          />

          {/* Interactive 3D Mode Controls */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-[#121215]/90 backdrop-blur border border-[#27272A] rounded-md p-1">
              {(
                [
                  { id: "VAULT", label: "Vault Core", icon: Lock },
                  { id: "SWAP", label: "Swap Orbit", icon: ArrowLeftRight },
                  { id: "SHIELD", label: "24h Shield", icon: ShieldCheck },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const active = sceneMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSceneMode(m.id)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer",
                      active
                        ? "bg-[#27272A] text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <span className="hidden sm:inline font-mono text-[10px] text-zinc-500 bg-[#121215]/80 px-2 py-1 rounded border border-[#27272A]">
              Move cursor to tilt
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
