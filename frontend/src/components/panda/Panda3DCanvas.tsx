"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  getTraitTier,
  getGrowthStage,
  getVisualTier,
  type PandaStats,
} from "@/utils/pandaHelper";

interface Panda3DCanvasProps {
  stats: PandaStats;
  showBackground?: boolean;
}

export function Panda3DCanvas({ stats, showBackground = true }: Panda3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 384;
    const height = container.clientHeight || 384;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(showBackground ? 0x0d0e11 : 0xefece3);

    // 2. Camera Setup (Closer for Chibi details)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 11);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 18;
    controls.target.set(0, 1.8, 0);

    // 5. Lights (Cyber Synthwave Studio Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    // Key Light (Warm neon gold)
    const keyLight = new THREE.DirectionalLight(0xf1c40f, 1.5);
    keyLight.position.set(6, 6, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Fill Light (Cyber Cyan)
    const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.8);
    fillLight.position.set(-6, 3, 4);
    scene.add(fillLight);

    // Rim Light (Neon Pink/Magenta back light for sick edges)
    const rimLight = new THREE.DirectionalLight(0xff007f, 1.2);
    rimLight.position.set(0, 4, -6);
    scene.add(rimLight);

    // 6. Cyber Grid Floor (More sci-fi cyber grid)
    if (showBackground) {
      const gridHelper = new THREE.GridHelper(16, 16, 0xf1c40f, 0x1f2430);
      gridHelper.position.y = 0;
      if (Array.isArray(gridHelper.material)) {
        gridHelper.material.forEach((mat) => {
          mat.transparent = true;
          mat.opacity = 0.15;
        });
      } else {
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.15;
      }
      scene.add(gridHelper);

      // Glowing center ring on floor
      const ringGeo = new THREE.RingGeometry(1.8, 2.0, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf1c40f,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2,
      });
      const floorRing = new THREE.Mesh(ringGeo, ringMat);
      floorRing.rotation.x = Math.PI / 2;
      floorRing.position.y = 0.01;
      scene.add(floorRing);
    }

    // Floor Shadow Receiver
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.5 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // 7. Visor Canvas Texture (Dynamic HUD)
    const visorCanvas = document.createElement("canvas");
    visorCanvas.width = 512;
    visorCanvas.height = 256;
    const visorCtx = visorCanvas.getContext("2d");
    const visorTexture = new THREE.CanvasTexture(visorCanvas);

    // 8. Materials Definition (Matte Carbon & Neon Gold)
    const materials = {
      matteCarbon: new THREE.MeshStandardMaterial({
        color: 0x151618, // Deep matte black
        roughness: 0.85,
        metalness: 0.2,
      }),
      cyberWhite: new THREE.MeshStandardMaterial({
        color: 0xf3f4f6, // Clean cyber white
        roughness: 0.45,
        metalness: 0.1,
      }),
      neonGold: new THREE.MeshStandardMaterial({
        color: 0xf1c40f,
        emissive: 0xf1c40f,
        emissiveIntensity: 2.2,
        roughness: 0.1,
        metalness: 0.9,
      }),
      neonCyan: new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 2.0,
      }),
      neonRed: new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        emissive: 0xff3b30,
        emissiveIntensity: 2.0,
      }),
      chromeGold: new THREE.MeshStandardMaterial({
        color: 0xf1c40f,
        roughness: 0.1,
        metalness: 0.95,
      }),
      visor: new THREE.MeshStandardMaterial({
        map: visorTexture,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.95,
      }),
      blush: new THREE.MeshBasicMaterial({
        color: 0xff007f,
        transparent: true,
        opacity: 0.25,
      }),
    };

    // 9. Tiers & Growth Stages mapping
    const growthStage = getGrowthStage(stats.experience);
    const patienceTier = getTraitTier(stats.patience);
    const boldnessTier = getTraitTier(stats.boldness);
    const intuitionTier = getTraitTier(stats.intuition);
    const focusTier = getTraitTier(stats.focus);
    const contrarianTier = getTraitTier(stats.contrarian);

    const patienceVisual = getVisualTier(patienceTier);
    const boldnessVisual = getVisualTier(boldnessTier);
    const intuitionVisual = getVisualTier(intuitionTier);
    const focusVisual = getVisualTier(focusTier);
    const contrarianVisual = getVisualTier(contrarianTier);

    // 10. Construct the Cute Chibi Panda Group
    const pandaGroup = new THREE.Group();
    scene.add(pandaGroup);

    if (growthStage === "infant") {
      pandaGroup.scale.set(0.85, 0.85, 0.85);
    }

    // --- PANDA BODY PARTS (Super Round Chibi Proportions) ---
    const bodyGroup = new THREE.Group();
    pandaGroup.add(bodyGroup);

    // Chubby Torso (Sphere)
    const torsoGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const torso = new THREE.Mesh(torsoGeo, materials.matteCarbon);
    torso.scale.set(1.0, 1.05, 0.95);
    torso.position.y = 1.3;
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    // Cute White Tummy (Sphere offset forward)
    const tummyGeo = new THREE.SphereGeometry(0.9, 32, 16);
    const tummy = new THREE.Mesh(tummyGeo, materials.cyberWhite);
    tummy.scale.set(1.0, 1.0, 0.5);
    tummy.position.set(0, 1.3, 0.72);
    tummy.castShadow = true;
    bodyGroup.add(tummy);

    // Stubby Legs (Capsules)
    const legGeo = new THREE.CapsuleGeometry(0.32, 0.4, 8, 16);
    
    const leftLeg = new THREE.Mesh(legGeo, materials.matteCarbon);
    leftLeg.position.set(-0.65, 0.4, 0.1);
    leftLeg.rotation.z = 0.15;
    leftLeg.castShadow = true;
    bodyGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, materials.matteCarbon);
    rightLeg.position.set(0.65, 0.4, 0.1);
    rightLeg.rotation.z = -0.15;
    rightLeg.castShadow = true;
    bodyGroup.add(rightLeg);

    // Glowing Neon Foot Pads
    const footPadGeo = new THREE.SphereGeometry(0.22, 16, 8);
    const leftFootPad = new THREE.Mesh(footPadGeo, materials.neonGold);
    leftFootPad.scale.set(1, 0.15, 1.3);
    leftFootPad.position.set(-0.65, 0.12, 0.2);
    bodyGroup.add(leftFootPad);

    const rightFootPad = new THREE.Mesh(footPadGeo, materials.neonGold);
    rightFootPad.scale.set(1, 0.15, 1.3);
    rightFootPad.position.set(0.65, 0.12, 0.2);
    bodyGroup.add(rightFootPad);

    // Stubby Arms (Capsules)
    const armGeo = new THREE.CapsuleGeometry(0.26, 0.5, 8, 16);

    // Left Arm (Cute wave/guard pose)
    const leftArm = new THREE.Mesh(armGeo, materials.matteCarbon);
    leftArm.position.set(-1.15, 1.4, 0.2);
    leftArm.rotation.set(0.4, 0.1, 0.6);
    leftArm.castShadow = true;
    bodyGroup.add(leftArm);

    // Right Arm (Relaxed/ready pose)
    const rightArm = new THREE.Mesh(armGeo, materials.matteCarbon);
    rightArm.position.set(1.15, 1.4, 0.2);
    rightArm.rotation.set(0.2, -0.1, -0.6);
    rightArm.castShadow = true;
    bodyGroup.add(rightArm);

    // Glowing Neon Wrist Bands
    const bandGeo = new THREE.TorusGeometry(0.28, 0.04, 8, 16);
    const leftBand = new THREE.Mesh(bandGeo, materials.neonGold);
    leftBand.position.set(-1.15, 1.25, 0.25);
    leftBand.rotation.set(0.4, 0.1, 0.6);
    bodyGroup.add(leftBand);

    const rightBand = new THREE.Mesh(bandGeo, materials.neonGold);
    rightBand.position.set(1.15, 1.25, 0.25);
    rightBand.rotation.set(0.2, -0.1, -0.6);
    bodyGroup.add(rightBand);

    // Cute Tail (Sphere)
    const tailGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const tail = new THREE.Mesh(tailGeo, materials.matteCarbon);
    tail.position.set(0, 0.8, -0.9);
    bodyGroup.add(tail);

    // --- PANDA HEAD PARTS (Big Chibi Head) ---
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.65; // Position on top of torso
    pandaGroup.add(headGroup);

    // Big Head Sphere
    const headGeo = new THREE.SphereGeometry(1.45, 32, 32);
    const head = new THREE.Mesh(headGeo, materials.cyberWhite);
    head.scale.set(1.08, 0.96, 1.02);
    head.castShadow = true;
    headGroup.add(head);

    // Big Cute Ears
    const earGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const leftEar = new THREE.Mesh(earGeo, materials.matteCarbon);
    leftEar.position.set(-1.0, 1.0, -0.1);
    leftEar.scale.set(1, 1, 0.7);
    leftEar.castShadow = true;
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, materials.matteCarbon);
    rightEar.position.set(1.0, 1.0, -0.1);
    rightEar.scale.set(1, 1, 0.7);
    rightEar.castShadow = true;
    headGroup.add(rightEar);

    // Glowing Neon Rings at Ear Bases
    const earRingGeo = new THREE.TorusGeometry(0.38, 0.04, 8, 24);
    const leftEarRing = new THREE.Mesh(earRingGeo, materials.neonGold);
    leftEarRing.position.set(-0.9, 0.85, -0.1);
    leftEarRing.rotation.set(0.3, 0.2, 0.4);
    headGroup.add(leftEarRing);

    const rightEarRing = new THREE.Mesh(earRingGeo, materials.neonGold);
    rightEarRing.position.set(0.9, 0.85, -0.1);
    rightEarRing.rotation.set(0.3, -0.2, -0.4);
    headGroup.add(rightEarRing);

    // --- SLEEK TACTICAL CYBER VISOR ---
    // Curved visor wrapping around the front of the head
    const visorGeo = new THREE.CylinderGeometry(1.48, 1.48, 0.58, 32, 1, true, -Math.PI / 3.2, Math.PI * 2 / 3.2);
    const visor = new THREE.Mesh(visorGeo, materials.visor);
    visor.position.set(0, 0.06, 0.04);
    // Rotate to face forward (Cylinder faces along Z by default when rotated)
    visor.rotation.y = Math.PI;
    headGroup.add(visor);

    // Visor Frame (Top and bottom glowing gold borders)
    const frameTopGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.04, 32, 1, true, -Math.PI / 3.2, Math.PI * 2 / 3.2);
    const frameTop = new THREE.Mesh(frameTopGeo, materials.neonGold);
    frameTop.position.set(0, 0.35, 0.04);
    frameTop.rotation.y = Math.PI;
    headGroup.add(frameTop);

    const frameBottomGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.04, 32, 1, true, -Math.PI / 3.2, Math.PI * 2 / 3.2);
    const frameBottom = new THREE.Mesh(frameBottomGeo, materials.neonGold);
    frameBottom.position.set(0, -0.23, 0.04);
    frameBottom.rotation.y = Math.PI;
    headGroup.add(frameBottom);

    // Cute Blush (Pink spheres below visor)
    const blushLeft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 8), materials.blush);
    blushLeft.scale.set(1.2, 0.6, 0.2);
    blushLeft.position.set(-0.7, -0.35, 1.2);
    blushLeft.rotation.set(0.1, 0.2, -0.1);
    headGroup.add(blushLeft);

    const blushRight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 8), materials.blush);
    blushRight.scale.set(1.2, 0.6, 0.2);
    blushRight.position.set(0.7, -0.35, 1.2);
    blushRight.rotation.set(0.1, -0.2, 0.1);
    headGroup.add(blushRight);

    // Small Cute Carbon Nose
    const noseGeo = new THREE.SphereGeometry(0.08, 16, 8);
    const nose = new THREE.Mesh(noseGeo, materials.matteCarbon);
    nose.scale.set(1.3, 0.7, 0.7);
    nose.position.set(0, -0.25, 1.38);
    headGroup.add(nose);

    // --- GROWTH STAGE CLOTHING (Cyber Chibi Editions) ---
    if (growthStage === "apprentice") {
      // Sleek Neon Gold Vest
      const vestGeo = new THREE.CylinderGeometry(1.22, 1.22, 0.8, 24, 1, true);
      const vest = new THREE.Mesh(vestGeo, materials.neonGold);
      vest.position.set(0, 1.3, 0);
      bodyGroup.add(vest);

      // Carbon Belt
      const beltGeo = new THREE.CylinderGeometry(1.24, 1.24, 0.15, 24);
      const belt = new THREE.Mesh(beltGeo, materials.matteCarbon);
      belt.position.set(0, 1.0, 0);
      bodyGroup.add(belt);
    } else if (growthStage === "mature") {
      // Cyber Grandmaster Cape & Shoulder Armor
      const robeGeo = new THREE.CylinderGeometry(1.23, 1.3, 1.1, 24, 1, true);
      const robe = new THREE.Mesh(robeGeo, materials.matteCarbon);
      robe.position.set(0, 1.25, 0);
      bodyGroup.add(robe);

      // Neon Gold Trim Collar
      const trimGeo = new THREE.TorusGeometry(1.23, 0.05, 8, 32);
      const trim = new THREE.Mesh(trimGeo, materials.neonGold);
      trim.rotation.x = Math.PI / 2;
      trim.position.set(0, 1.78, 0);
      bodyGroup.add(trim);

      // Neon Gold Belt with holographic buckle
      const beltGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.18, 24);
      const belt = new THREE.Mesh(beltGeo, materials.neonGold);
      belt.position.set(0, 0.95, 0);
      bodyGroup.add(belt);

      const buckleGeo = new THREE.BoxGeometry(0.25, 0.25, 0.1);
      const buckle = new THREE.Mesh(buckleGeo, materials.cyberWhite);
      buckle.position.set(0, 0.95, 1.25);
      bodyGroup.add(buckle);
    } else if (growthStage === "infant") {
      // Cute Neon Pacifier
      const pacifierGroup = new THREE.Group();
      pacifierGroup.position.set(0, -0.38, 1.35);
      const shield = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 8), materials.neonGold);
      shield.scale.set(1.4, 0.7, 0.2);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16), materials.cyberWhite);
      ring.position.set(0, -0.06, 0.06);
      pacifierGroup.add(shield, ring);
      headGroup.add(pacifierGroup);
    }

    // --- PERSONALITY DIMENSIONS (Cute 3D Cyber Equipment) ---

    // 1. Patience: Quantum Tesseract (量子超立方体)
    const tesseractGroup = new THREE.Group();
    tesseractGroup.position.set(2.0, 1.8, 0.5);
    scene.add(tesseractGroup);

    if (patienceVisual === "mid" || patienceVisual === "high") {
      // Outer Wireframe Cube
      const outerCubeGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
      const outerWire = new THREE.LineSegments(
        new THREE.EdgesGeometry(outerCubeGeo),
        new THREE.LineBasicMaterial({ color: 0xf1c40f, linewidth: 2 })
      );
      tesseractGroup.add(outerWire);

      // Inner Wireframe Cube
      const innerCubeGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const innerWire = new THREE.LineSegments(
        new THREE.EdgesGeometry(innerCubeGeo),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1.5 })
      );
      tesseractGroup.add(innerWire);

      // Glowing Core
      const glowCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), materials.cyberWhite);
      tesseractGroup.add(glowCore);

      if (patienceVisual === "high") {
        const tesseractLight = new THREE.PointLight(0xf1c40f, 1.8, 3);
        tesseractGroup.add(tesseractLight);

        // Cute glowing zen beads around neck (发光能量念珠)
        const beadsGroup = new THREE.Group();
        beadsGroup.position.set(0, 1.75, 0);
        bodyGroup.add(beadsGroup);

        const beadCount = 12;
        const radius = 1.35;
        const beadGeo = new THREE.SphereGeometry(0.08, 12, 12);
        for (let i = 0; i < beadCount; i++) {
          const angle = (i / beadCount) * Math.PI * 2;
          const bead = new THREE.Mesh(beadGeo, materials.neonGold);
          bead.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
          beadsGroup.add(bead);
        }
      }
    }

    // 2. Boldness: Plasma Dagger / Short Sword (等离子短刃)
    let plasmaBlade: THREE.Group | null = null;
    if (boldnessVisual === "mid" || boldnessVisual === "high") {
      plasmaBlade = new THREE.Group();
      
      // Stubby Hilt
      const hiltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);
      const hilt = new THREE.Mesh(hiltGeo, materials.matteCarbon);
      hilt.position.y = -0.15;
      plasmaBlade.add(hilt);

      const guardGeo = new THREE.BoxGeometry(0.25, 0.05, 0.08);
      const guard = new THREE.Mesh(guardGeo, materials.neonGold);
      plasmaBlade.add(guard);

      // Cute Stubby Blade
      const bladeLength = boldnessVisual === "high" ? 1.5 : 0.9;
      const bladeGeo = new THREE.BoxGeometry(0.12, bladeLength, 0.04);
      const blade = new THREE.Mesh(bladeGeo, materials.neonGold);
      blade.position.y = bladeLength / 2;
      plasmaBlade.add(blade);

      // White inner glow
      const coreGeo = new THREE.BoxGeometry(0.05, bladeLength - 0.08, 0.05);
      const bladeCore = new THREE.Mesh(coreGeo, materials.cyberWhite);
      bladeCore.position.y = bladeLength / 2;
      plasmaBlade.add(bladeCore);

      // Position floating near left arm
      plasmaBlade.position.set(-1.6, 1.3, 0.8);
      plasmaBlade.rotation.set(0.6, 0.3, 0.4);
      bodyGroup.add(plasmaBlade);

      // Cute mini thruster fire (Aura) for Boldness High
      if (boldnessVisual === "high") {
        const auraGroup = new THREE.Group();
        auraGroup.position.set(0, 1.3, -0.6);
        bodyGroup.add(auraGroup);

        const flameCount = 3;
        for (let i = 0; i < flameCount; i++) {
          const flameGeo = new THREE.ConeGeometry(0.15 + Math.random() * 0.1, 0.8 + Math.random() * 0.5, 8);
          const flame = new THREE.Mesh(flameGeo, materials.neonRed);
          flame.position.set((Math.random() - 0.5) * 1.2, Math.random() * 0.3, (Math.random() - 0.5) * 0.3);
          flame.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
          auraGroup.add(flame);
        }
      }
    }

    // 3. Intuition: AI Spirit Companion Drone (全息灵兽无人机)
    const intuitionGroup = new THREE.Group();
    intuitionGroup.position.set(-1.8, 2.2, -0.5);
    scene.add(intuitionGroup);

    if (intuitionVisual === "mid" || intuitionVisual === "high") {
      // Mini Cyber Compass (风水罗盘)
      const compassGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16);
      const compass = new THREE.Mesh(compassGeo, materials.matteCarbon);
      compass.rotation.x = 0.4;
      intuitionGroup.add(compass);

      const innerCompassGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.07, 16);
      const innerCompass = new THREE.Mesh(innerCompassGeo, materials.cyberWhite);
      innerCompass.rotation.x = 0.4;
      innerCompass.position.y = 0.01;
      intuitionGroup.add(innerCompass);

      // Needle
      const needleGeo = new THREE.ConeGeometry(0.03, 0.22, 4);
      const needle = new THREE.Mesh(needleGeo, materials.neonRed);
      needle.rotation.x = Math.PI / 2 + 0.4;
      needle.position.set(0, 0.04, 0);
      intuitionGroup.add(needle);

      if (intuitionVisual === "high") {
        // Super Cute AI Companion Drone (智能机械蜂鸟/飞球)
        const droneGroup = new THREE.Group();
        droneGroup.position.set(-2.0, 3.2, 0.8);
        scene.add(droneGroup);

        // Round Drone Body
        const coreGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const droneCore = new THREE.Mesh(coreGeo, materials.matteCarbon);
        droneGroup.add(droneCore);

        // Glowing Eye
        const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const droneEye = new THREE.Mesh(eyeGeo, materials.neonGold);
        droneEye.position.set(0, 0, 0.14);
        droneGroup.add(droneEye);

        // Glowing Wing Rings
        const ringGeo = new THREE.TorusGeometry(0.26, 0.02, 8, 24);
        const droneRing = new THREE.Mesh(ringGeo, materials.neonCyan);
        droneRing.rotation.x = Math.PI / 2;
        droneGroup.add(droneRing);

        // Save reference for animation
        (intuitionGroup as any).drone = droneGroup;
      }
    }

    // 4. Focus: Chest Singularity Core (胸口奇点核心)
    if (focusVisual === "mid" || focusVisual === "high") {
      // Concentric glowing rings on tummy
      const coreTorusGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 24);
      const coreTorus = new THREE.Mesh(coreTorusGeo, materials.neonGold);
      coreTorus.position.set(0, 1.3, 0.95);
      bodyGroup.add(coreTorus);

      const coreCenterGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const coreCenter = new THREE.Mesh(coreCenterGeo, materials.cyberWhite);
      coreCenter.position.set(0, 1.3, 0.98);
      bodyGroup.add(coreCenter);

      if (focusVisual === "high") {
        // Extra outer ring & light
        const outerTorusGeo = new THREE.TorusGeometry(0.38, 0.02, 8, 24);
        const outerTorus = new THREE.Mesh(outerTorusGeo, materials.neonCyan);
        outerTorus.position.set(0, 1.3, 0.93);
        bodyGroup.add(outerTorus);

        const coreLight = new THREE.PointLight(0xf1c40f, 1.5, 2);
        coreLight.position.set(0, 1.3, 1.1);
        bodyGroup.add(coreLight);
      }
    }

    // 5. Contrarian: Renegade Hair & Electric Arcs (反叛者机械白发与电弧)
    const contrarianGroup = new THREE.Group();
    pandaGroup.add(contrarianGroup);

    if (contrarianVisual === "mid" || contrarianVisual === "high") {
      // Cute stylized white hair spikes on head back
      const hairGroup = new THREE.Group();
      hairGroup.position.set(0, 0.7, -0.5);
      headGroup.add(hairGroup);

      const spikeCount = 6;
      const spikeGeo = new THREE.ConeGeometry(0.15, 0.6, 4);
      for (let i = 0; i < spikeCount; i++) {
        const spike = new THREE.Mesh(spikeGeo, materials.cyberWhite);
        spike.position.set(
          (Math.random() - 0.5) * 0.9,
          (Math.random() - 0.2) * 0.4,
          (Math.random() - 0.5) * 0.3
        );
        spike.rotation.set(
          -0.7 - Math.random() * 0.3,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.4
        );
        hairGroup.add(spike);
      }

      if (contrarianVisual === "high") {
        // Cute glowing electric spheres (crackling arcs) orbiting the panda
        const arcCount = 3;
        const arcs: THREE.Mesh[] = [];
        const arcGeo = new THREE.SphereGeometry(0.06, 8, 8);
        
        for (let i = 0; i < arcCount; i++) {
          const arc = new THREE.Mesh(arcGeo, materials.neonGold);
          contrarianGroup.add(arc);
          arcs.push(arc);
        }
        (contrarianGroup as any).arcs = arcs;
      }
    }

    // 11. Visor HUD Drawing Logic (Based on Emotion)
    const drawVisorHUD = (time: number) => {
      if (!visorCtx) return;
      
      // Clear with deep carbon black background
      visorCtx.fillStyle = "#151618";
      visorCtx.fillRect(0, 0, 512, 256);

      // Draw subtle grid lines
      visorCtx.strokeStyle = "rgba(241, 196, 15, 0.08)";
      visorCtx.lineWidth = 1.5;
      for (let i = 0; i < 512; i += 64) {
        visorCtx.beginPath();
        visorCtx.moveTo(i, 0);
        visorCtx.lineTo(i, 256);
        visorCtx.stroke();
      }
      for (let j = 0; j < 256; j += 32) {
        visorCtx.beginPath();
        visorCtx.moveTo(0, j);
        visorCtx.lineTo(512, j);
        visorCtx.stroke();
      }

      // Draw HUD Borders
      visorCtx.strokeStyle = "rgba(241, 196, 15, 0.3)";
      visorCtx.lineWidth = 3;
      visorCtx.strokeRect(16, 16, 480, 224);

      // Draw Corner brackets
      const drawBrackets = (x: number, y: number, w: number, h: number) => {
        visorCtx.strokeStyle = "#f1c40f";
        visorCtx.lineWidth = 4;
        // Top-Left
        visorCtx.beginPath();
        visorCtx.moveTo(x + 20, y); visorCtx.lineTo(x, y); visorCtx.lineTo(x, y + 20);
        visorCtx.stroke();
        // Top-Right
        visorCtx.beginPath();
        visorCtx.moveTo(x + w - 20, y); visorCtx.lineTo(x + w, y); visorCtx.lineTo(x + w, y + 20);
        visorCtx.stroke();
        // Bottom-Left
        visorCtx.beginPath();
        visorCtx.moveTo(x, y + h - 20); visorCtx.lineTo(x, y + h); visorCtx.lineTo(x + 20, y + h);
        visorCtx.stroke();
        // Bottom-Right
        visorCtx.beginPath();
        visorCtx.moveTo(x + w - 20, y + h); visorCtx.lineTo(x + w, y + h); visorCtx.lineTo(x + w, y + h - 20);
        visorCtx.stroke();
      };
      drawBrackets(10, 10, 492, 236);

      // Draw Header Text
      visorCtx.fillStyle = "#ffffff";
      visorCtx.font = "bold 18px monospace";
      visorCtx.fillText("PANDA OS v2.0", 36, 42);

      // Draw dynamic content based on emotion
      const emotion = stats.emotion;
      const pulse = Math.sin(time * 8) * 0.5 + 0.5;

      if (emotion === "calm") {
        // Calm scrolling green K-line
        visorCtx.fillStyle = "#2ecc71";
        visorCtx.fillText("SYS: STABLE", 360, 42);

        // Draw emoticon
        visorCtx.fillStyle = "#f1c40f";
        visorCtx.font = "bold 64px sans-serif";
        visorCtx.textAlign = "center";
        visorCtx.fillText("^ _ ^", 256, 135);

        // Small chart
        drawMiniChart(time, 1.0);
      } else if (emotion === "excited") {
        // Rapidly rising golden K-line
        visorCtx.fillStyle = "#f1c40f";
        visorCtx.fillText("SYS: MOONING!", 360, 42);

        // Emoticon
        visorCtx.fillStyle = "#ffffff";
        visorCtx.font = "bold 64px sans-serif";
        visorCtx.textAlign = "center";
        visorCtx.fillText("O v O", 256, 135);

        // Flashing "PUMP"
        if (Math.floor(time * 3) % 2 === 0) {
          visorCtx.fillStyle = "#2ecc71";
          visorCtx.font = "bold 24px monospace";
          visorCtx.fillText("▲ PUMP 99.9%", 256, 210);
        }

        drawMiniChart(time, 2.5);
      } else if (emotion === "greedy") {
        // Dollar Signs flashing
        visorCtx.fillStyle = "#2ecc71";
        visorCtx.fillText("SYS: LONG 100x", 340, 42);

        visorCtx.fillStyle = "#f1c40f";
        visorCtx.font = "bold 72px sans-serif";
        visorCtx.textAlign = "center";
        visorCtx.fillText("$ _ $", 256, 135);

        visorCtx.fillStyle = "#ffffff";
        visorCtx.font = "bold 20px monospace";
        visorCtx.fillText("PROFIT: +888%", 256, 210);
      } else if (emotion === "cautious") {
        // Scanning warning
        visorCtx.fillStyle = "#e67e22";
        visorCtx.fillText("SYS: SCANNING", 340, 42);

        visorCtx.fillStyle = "#f1c40f";
        visorCtx.font = "bold 64px sans-serif";
        visorCtx.textAlign = "center";
        visorCtx.fillText("o _ o", 256, 135);

        visorCtx.fillStyle = "#e67e22";
        visorCtx.font = "bold 18px monospace";
        visorCtx.fillText("[⚠️ RISK DETECTED]", 256, 210);
      } else if (emotion === "panic") {
        // Crashing red chart
        visorCtx.fillStyle = "#ff3b30";
        visorCtx.fillText("SYS: LIQ ALERT!", 340, 42);

        visorCtx.fillStyle = "#ff3b30";
        visorCtx.font = "bold 64px sans-serif";
        visorCtx.textAlign = "center";
        visorCtx.fillText("X _ X", 256, 135);

        if (Math.floor(time * 4) % 2 === 0) {
          visorCtx.fillStyle = "#ff3b30";
          visorCtx.font = "bold 22px monospace";
          visorCtx.fillText("▼ DUMP / MARGIN CALL", 256, 210);
        }

        drawMiniChart(time, -3.0);
      } else if (emotion === "numb") {
        // Flat line
        visorCtx.fillStyle = "#7f8c8d";
        visorCtx.fillText("SYS: HODL MODE", 340, 42);

        visorCtx.fillStyle = "#bdc3c7";
        visorCtx.font = "bold 64px sans-serif";
        visorCtx.textAlign = "center";
        visorCtx.fillText("- _ -", 256, 135);

        visorCtx.font = "bold 18px monospace";
        visorCtx.fillText("NO SIGNAL / FLATLINE", 256, 210);

        // Draw flat line
        visorCtx.strokeStyle = "#bdc3c7";
        visorCtx.lineWidth = 4;
        visorCtx.beginPath();
        visorCtx.moveTo(50, 180);
        visorCtx.lineTo(462, 180);
        visorCtx.stroke();
      } else if (emotion === "frustrated") {
        // Sad teary eyes
        visorCtx.fillStyle = "#ff3b30";
        visorCtx.fillText("SYS: REKTD", 360, 42);

        visorCtx.fillStyle = "#3498db";
        visorCtx.font = "bold 64px sans-serif";
        visorCtx.textAlign = "center";
        visorCtx.fillText("; _ ;", 256, 135);

        visorCtx.fillStyle = "#ffffff";
        visorCtx.font = "bold 18px monospace";
        visorCtx.fillText("LOSS: -50% (RE-EVALUATING)", 256, 210);
      }

      visorTexture.needsUpdate = true;
    };

    // Helper to draw a scrolling candlestick chart on visor
    const drawMiniChart = (time: number, trend: number) => {
      if (!visorCtx) return;
      visorCtx.strokeStyle = trend >= 0 ? "#2ecc71" : "#ff3b30";
      visorCtx.fillStyle = trend >= 0 ? "#2ecc71" : "#ff3b30";
      visorCtx.lineWidth = 2;

      const shift = (time * 80) % 80;
      const startY = trend >= 0 ? 180 : 120;

      for (let i = 0; i < 6; i++) {
        const x = i * 80 - shift + 60;
        if (x < 30 || x > 480) continue;

        const h = Math.sin(time * 2 + i) * 20 + 10;
        const o = startY - i * trend * 10 + Math.cos(time + i) * 15;
        const c = o - h * (trend >= 0 ? 1 : -1);

        // Wick
        visorCtx.beginPath();
        visorCtx.moveTo(x, o - 15);
        visorCtx.lineTo(x, c + 15);
        visorCtx.stroke();

        // Body
        visorCtx.fillRect(x - 8, Math.min(o, c), 16, Math.abs(o - c));
      }
    };

    // 12. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // --- DYNAMIC VISOR HUD UPDATE ---
      drawVisorHUD(time);

      // --- CUTE CHIBI BOUNCE IDLE ANIMATION ---
      // Round body bounces up/down and squashes slightly (Cute breathing)
      const bounce = Math.sin(time * 3.2);
      bodyGroup.position.y = bounce * 0.06;
      bodyGroup.scale.y = 1 + bounce * 0.012;
      bodyGroup.scale.x = 1 - bounce * 0.008;

      // Big head bobs slightly out of phase
      headGroup.position.y = 2.65 + Math.sin(time * 3.2 + 0.5) * 0.03;
      headGroup.rotation.z = Math.sin(time * 1.6) * 0.012;
      headGroup.rotation.y = Math.sin(time * 0.8) * 0.015;

      // Stubby arms move slightly
      leftArm.rotation.z = 0.6 + Math.sin(time * 3.2) * 0.03;
      rightArm.rotation.z = -0.6 + Math.sin(time * 3.2 + 0.3) * 0.03;

      // --- PERSONALITY EQUIPMENT ANIMATIONS ---
      // Quantum Tesseract floats and rotates
      tesseractGroup.position.y = 1.8 + Math.sin(time * 2.2) * 0.12;
      tesseractGroup.rotation.x += 0.01;
      tesseractGroup.rotation.y += 0.015;

      // Compass floats and needle spins
      intuitionGroup.position.y = 2.2 + Math.sin(time * 2.2 + 0.8) * 0.1;
      const needle = intuitionGroup.children.find(
        (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.geometry instanceof THREE.ConeGeometry
      );
      if (needle) {
        needle.rotation.y = time * 5 + Math.sin(time * 10) * 0.6;
      }

      // AI Spirit Drone floats and orbits
      const droneGroup = (intuitionGroup as any).drone;
      if (droneGroup) {
        droneGroup.position.y = 3.2 + Math.sin(time * 3.5) * 0.15;
        droneGroup.position.x = -2.0 + Math.cos(time * 1.8) * 0.35;
        droneGroup.position.z = 0.8 + Math.sin(time * 1.8) * 0.35;
        droneGroup.rotation.y += 0.03;
      }

      // Electric Arcs crackle & orbit
      const arcs = (contrarianGroup as any).arcs;
      if (arcs) {
        arcs.forEach((arc: THREE.Mesh, index: number) => {
          const angle = time * 2.5 + (index * Math.PI * 2) / arcs.length;
          const radius = 1.8 + Math.sin(time * 5 + index) * 0.2;
          arc.position.set(
            Math.cos(angle) * radius,
            1.5 + Math.sin(time * 3 + index) * 0.5,
            Math.sin(angle) * radius
          );
          // Flicker scale
          const scale = 0.5 + Math.random() * 0.6;
          arc.scale.set(scale, scale, scale);
        });
      }

      // Plasma Blade energy pulse
      if (plasmaBlade) {
        const bladeCore = plasmaBlade.children.find(
          (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.material === materials.cyberWhite
        );
        if (bladeCore) {
          (bladeCore.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(time * 12) * 0.5;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 13. Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 14. Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      
      // Dispose geometries & materials to prevent memory leaks
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        
        if (object.geometry) object.geometry.dispose();

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      visorTexture.dispose();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [stats, showBackground]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full min-h-[300px] min-w-[300px] aspect-square select-none overflow-hidden rounded-xl"
    />
  );
}
