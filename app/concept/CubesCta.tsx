"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* Closing banner: a few big green 3D cubes drop into the rounded panel, tumble and pile up on its floor. Real 3D
   (three.js) with rigid-body physics (cannon-es), loaded only once the panel scrolls into view. Cubes can be
   grabbed: press on one, drag it around and let go to throw it. On touch screens a gesture that starts on a cube
   moves the cube, anywhere else the page scrolls as usual. The simulation sleeps once everything has settled.
   Reduced motion or no WebGL: a static row of CSS cubes instead. */
export default function CubesCta({ children }: { children: ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = card.current, host = canvasHost.current;
    if (!el || !host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.classList.add("cb-static"); return; }

    let dispose = () => {};
    let started = false;

    const start = async () => {
      if (started) return;
      started = true;
      let THREE: typeof import("three"), CANNON: typeof import("cannon-es"), RoundedBoxGeometry: typeof import("three/examples/jsm/geometries/RoundedBoxGeometry.js").RoundedBoxGeometry;
      try {
        [THREE, CANNON, { RoundedBoxGeometry }] = await Promise.all([
          import("three"), import("cannon-es"), import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
        ]);
      } catch { el.classList.add("cb-static"); return; }

      let renderer: import("three").WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch { el.classList.add("cb-static"); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.className = "cb-canvas";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
      const FOV_T = Math.tan((camera.fov * Math.PI) / 360);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a22, 1.15));
      const sun = new THREE.DirectionalLight(0xffffff, 1.9);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.radius = 5;
      sun.shadow.bias = -0.0008;
      scene.add(sun, sun.target);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.35 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -2600, 0) });
      world.allowSleep = true;
      (world.solver as import("cannon-es").GSSolver).iterations = 14;
      const mat = new CANNON.Material("cube");
      world.defaultContactMaterial = new CANNON.ContactMaterial(mat, mat, { friction: 0.35, restitution: 0.18 });

      const base = new THREE.Color(getComputedStyle(el).getPropertyValue("--green").trim() || "#97DD62");
      const palette = [base.clone(), base.clone().offsetHSL(0, 0, -0.07), base.clone().offsetHSL(0, 0, 0.06), base.clone().offsetHSL(0.01, -0.05, -0.14)];

      let W = 1, H = 1, S = 80, depth = 100, count = 18, sized = false;
      const statics: import("cannon-es").Body[] = [];
      const cubes: { mesh: import("three").Mesh; body: import("cannon-es").Body }[] = [];
      let geo: import("three").BufferGeometry | null = null;
      const mats = palette.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0.05 }));

      const buildStatics = () => {
        statics.forEach((b) => world.removeBody(b));
        statics.length = 0;
        const add = (pos: [number, number, number], rotY: number, rotX: number) => {
          const b = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: mat });
          b.position.set(...pos);
          b.quaternion.setFromEuler(rotX, rotY, 0);
          world.addBody(b); statics.push(b);
        };
        add([0, -H / 2, 0], 0, -Math.PI / 2);
        add([-W / 2, 0, 0], Math.PI / 2, 0);
        add([W / 2, 0, 0], -Math.PI / 2, 0);
        add([0, 0, -depth], 0, 0);
        add([0, 0, depth], Math.PI, 0);
        ground.position.y = -H / 2;
        sun.position.set(-W * 0.35, H * 0.9, 700);
        sun.target.position.set(0, -H / 2, 0);
        const sc = sun.shadow.camera as import("three").OrthographicCamera;
        sc.left = -W * 0.7; sc.right = W * 0.7; sc.top = H; sc.bottom = -H; sc.near = 10; sc.far = 3000; sc.updateProjectionMatrix();
      };

      const resize = () => {
        const r = el.getBoundingClientRect();
        W = Math.max(r.width, 1); H = Math.max(r.height, 1);
        if (!sized) { // size the cubes once: big, and few enough to sit in two or three rows
          S = Math.max(58, Math.min(112, W / 8.5));
          count = Math.max(12, Math.min(22, Math.round(W / 64)));
          sized = true;
        }
        depth = S * 0.85; // one cube deep: nothing can land behind another
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.position.set(0, 0, (H / 2) / FOV_T);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        buildStatics();
        cubes.forEach(({ body }) => {
          body.position.x = Math.max(-W / 2 + S, Math.min(W / 2 - S, body.position.x));
          if (body.position.y < -H / 2 + S / 2) body.position.y = -H / 2 + S;
          body.wakeUp();
        });
        wake();
      };

      let spawned = 0;
      const spawn = () => {
        if (!geo) geo = new RoundedBoxGeometry(S, S, S, 4, S * 0.13);
        const mesh = new THREE.Mesh(geo, mats[Math.floor(Math.random() * mats.length)]);
        mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh);
        const body = new CANNON.Body({ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(S / 2, S / 2, S / 2)), material: mat, sleepSpeedLimit: 12, sleepTimeLimit: 0.6, angularDamping: 0.08, linearDamping: 0.02 });
        const z = (Math.random() - 0.5) * S * 0.16;
        body.position.set((Math.random() - 0.5) * (W - S * 2), H / 2 + S * 2, z);
        body.quaternion.setFromEuler(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        body.angularVelocity.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
        world.addBody(body);
        cubes.push({ mesh, body });
        wake();
      };

      const timers: number[] = [];
      const runSpawns = () => { for (let i = 0; i < count; i++) timers.push(window.setTimeout(() => { spawn(); spawned++; }, 250 + i * 110)); };

      /* grab: a kinematic "hand" body drags the picked cube through a point-to-point constraint */
      const hand = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionFilterGroup: 0, collisionFilterMask: 0 });
      world.addBody(hand);
      let grip: import("cannon-es").PointToPointConstraint | null = null;
      let held: { mesh: import("three").Mesh; body: import("cannon-es").Body } | null = null;
      let heldZ = 0;
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const hit = new THREE.Vector3();
      const aim = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
        ray.setFromCamera(ndc, camera);
      };
      const pick = (e: PointerEvent) => {
        aim(e);
        const hits = ray.intersectObjects(cubes.map((c) => c.mesh), false);
        if (!hits.length) return null;
        const c = cubes.find((k) => k.mesh === hits[0].object)!;
        return { c, point: hits[0].point };
      };
      const handTo = (e: PointerEvent) => {
        aim(e);
        plane.constant = -heldZ;
        if (!ray.ray.intersectPlane(plane, hit)) return;
        hand.position.set(Math.max(-W / 2 + 10, Math.min(W / 2 - 10, hit.x)), Math.max(-H / 2 + 10, Math.min(H / 2 - 10, hit.y)), heldZ);
      };

      const onDown = (e: PointerEvent) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        const p = pick(e);
        if (!p) return;
        held = p.c;
        heldZ = p.point.z;
        hand.position.set(p.point.x, p.point.y, heldZ);
        hand.velocity.set(0, 0, 0);
        held.body.wakeUp();
        held.body.angularDamping = 0.7;
        const pivot = held.body.pointToLocalFrame(new CANNON.Vec3(p.point.x, p.point.y, p.point.z));
        grip = new CANNON.PointToPointConstraint(hand, new CANNON.Vec3(0, 0, 0), held.body, pivot, 120000);
        world.addConstraint(grip);
        try { el.setPointerCapture(e.pointerId); } catch { /* not capturable: dragging still works while the pointer stays over the panel */ }
        el.classList.add("cb-grab");
        wake();
      };
      let lastX = 0, lastY = 0, lastT = 0;
      const onMove = (e: PointerEvent) => {
        if (held) {
          const now = performance.now();
          const prev = hand.position.clone();
          handTo(e);
          const dt = Math.max((now - (lastT || now - 16)) / 1000, 0.008);
          hand.velocity.set((hand.position.x - prev.x) / dt * 0.6, (hand.position.y - prev.y) / dt * 0.6, 0);
          lastX = e.clientX; lastY = e.clientY; lastT = now;
          held.body.wakeUp();
          wake();
          return;
        }
        if (e.pointerType === "mouse") el.style.cursor = pick(e) ? "grab" : "";
      };
      const release = () => {
        if (!held) return;
        if (grip) world.removeConstraint(grip);
        held.body.angularDamping = 0.08;
        held.body.velocity.set(hand.velocity.x, hand.velocity.y, 0);
        held.body.wakeUp();
        held = null; grip = null; lastT = 0;
        hand.velocity.set(0, 0, 0);
        el.classList.remove("cb-grab");
        wake();
      };
      // a touch that starts on a cube must not scroll the page
      const onTouchStart = (e: TouchEvent) => { if (held) e.preventDefault(); };
      const onTouchMove = (e: TouchEvent) => { if (held) e.preventDefault(); };
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", release);
      el.addEventListener("pointercancel", release);
      el.addEventListener("touchstart", onTouchStart, { passive: false });
      el.addEventListener("touchmove", onTouchMove, { passive: false });
      void lastX; void lastY;

      let raf = 0, last = 0, running = false, visible = true, idleSince = 0;
      const frame = (t: number) => {
        raf = 0;
        if (!running) return;
        const dt = Math.min((t - (last || t)) / 1000, 1 / 20);
        last = t;
        world.step(1 / 60, dt, 3);
        let awake = false;
        for (const c of cubes) {
          c.mesh.position.set(c.body.position.x, c.body.position.y, c.body.position.z);
          c.mesh.quaternion.set(c.body.quaternion.x, c.body.quaternion.y, c.body.quaternion.z, c.body.quaternion.w);
          if (c.body.sleepState !== CANNON.Body.SLEEPING) awake = true;
        }
        renderer.render(scene, camera);
        if (awake || held || spawned < count) idleSince = t;
        if (visible && t - idleSince < 700) raf = requestAnimationFrame(frame); else running = false;
      };
      function wake() { if (!running && visible) { running = true; last = 0; idleSince = performance.now(); raf = requestAnimationFrame(frame); } else idleSince = performance.now(); }

      const ro = new ResizeObserver(resize);
      ro.observe(el);
      const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }, { threshold: 0 });
      io.observe(el);
      resize();
      runSpawns();

      dispose = () => {
        timers.forEach(clearTimeout);
        cancelAnimationFrame(raf); running = false;
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", release);
        el.removeEventListener("pointercancel", release);
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchmove", onTouchMove);
        ro.disconnect(); io.disconnect();
        geo?.dispose(); mats.forEach((m) => m.dispose()); ground.geometry.dispose(); (ground.material as import("three").Material).dispose();
        renderer.dispose(); renderer.domElement.remove();
      };
    };

    const io0 = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io0.disconnect(); start(); } }, { threshold: 0.35 });
    io0.observe(el);
    return () => { io0.disconnect(); dispose(); };
  }, []);

  return (
    <div className="n-final-card cb-card" ref={card}>
      <div className="cb-host" ref={canvasHost} aria-hidden="true" />
      <div className="cb-static-row" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
      {children}
    </div>
  );
}
