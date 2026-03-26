import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { FadingLabel } from './Planet';

// ─── Boiling plasma surface ───────────────────────────────────────────────────
function SunPlasma() {
  const meshRef = useRef();
  const shader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vNormal;
      void main(){ vUv=uv; vNormal=normalize(normalMatrix*normal);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform float time; varying vec2 vUv; varying vec3 vNormal;
      float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      vec2 h22(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
      float voro(vec2 uv,float t){
        vec2 g=floor(uv),f=fract(uv); float res=8.0;
        for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
          vec2 b=vec2(float(i),float(j));
          vec2 r=b-f+(0.5+0.5*sin(t*0.3+6.2832*h22(g+b)));
          res=min(res,dot(r,r)); } return sqrt(res); }
      float fbm(vec2 p,float t){ float v=0.0,a=0.5;
        for(int i=0;i<4;i++){v+=a*h21(p);p=p*2.1+vec2(1.7,2.3)+t*0.01;a*=0.5;} return v; }
      void main(){
        float limb=pow(max(0.0,vNormal.z),0.35);
        float g1=1.0-voro(vUv*5.0,time), g2=1.0-voro(vUv*11.0+1.7,time*1.4), g3=fbm(vUv*20.0,time);
        float pl=pow(g1*0.5+g2*0.3+g3*0.2,1.3)*limb;
        vec3 c=mix(vec3(0.5,0.04,0.0),vec3(1.0,0.35,0.02),smoothstep(0.0,0.6,pl));
        c=mix(c,vec3(1.0,0.80,0.30),smoothstep(0.4,0.8,pl));
        c=mix(c,vec3(1.0,0.97,0.88),smoothstep(0.75,1.0,pl));
        c*=0.92+0.08*sin(time*0.7);
        gl_FragColor=vec4(c,clamp(pl*0.85,0.0,1.0)); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }), []);
  useFrame(s => { if (meshRef.current) meshRef.current.material.uniforms.time.value = s.clock.elapsedTime; });
  return <mesh ref={meshRef} material={shader}><sphereGeometry args={[1.01, 64, 64]} /></mesh>;
}

// ─── 3D Volumetric corona (vertex-displaced sphere) ──────────────────────────
// This is the key 3D effect: each vertex of a sphere is pushed outward by
// 3D fractal noise that evolves over time, creating an irregular lumpy plasma
// volume with genuine 3D depth — not a flat ring or line.
function SunVolumeCorona() {
  const meshRef = useRef();

  const shader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      uniform float time;
      varying vec3 vNormal;
      varying float vDisplace;

      // 3D value noise — works in vertex shader
      float h3(vec3 p){
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }
      float n3(vec3 p){
        vec3 i=floor(p); vec3 f=fract(p);
        f=f*f*(3.0-2.0*f);
        return mix(
          mix(mix(h3(i),           h3(i+vec3(1,0,0)),f.x),
              mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),
              mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float fbm3(vec3 p){
        float v=0.0,a=0.55;
        // 4-octave fBm for organic fractal plasma shape
        for(int i=0;i<4;i++){ v+=a*n3(p); p=p*2.07+vec3(1.7,2.3,0.8); a*=0.48; }
        return v;
      }

      void main(){
        // 3D displacement: outward along normal, magnitude driven by fBm
        // Slow time evolution (0.11) for organic but not jittery motion
        float disp = fbm3(position * 2.2 + time * 0.11);
        // Map fBm [0..1] → displacement range: 0.02 to 0.28 (thick to thin blobs)
        disp = 0.02 + disp * 0.26;
        vec3 displaced = position + normal * disp;

        vDisplace = disp;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vNormal;
      varying float vDisplace;

      void main(){
        // View-space edge factor: brighter at silhouette edges (Fresnel-like)
        float edge = 1.0 - abs(vNormal.z);
        edge = pow(edge, 1.2);

        // Combine displacement magnitude with edge factor
        // High-displacement (tall blob) areas glow brighter
        float plasma = edge * 0.45 + vDisplace * 2.2 * edge;
        plasma = clamp(plasma, 0.0, 1.0);
        plasma = pow(plasma, 1.4);

        // Pulsing brightness
        float pulse = 0.88 + 0.12 * sin(time * 0.55 + vDisplace * 8.0);

        // Deep red → bright orange → yellow-white at tips
        vec3 c = mix(vec3(0.75, 0.08, 0.0), vec3(1.0,  0.42, 0.0),  smoothstep(0.0, 0.55, plasma));
        c       = mix(c,                     vec3(1.0,  0.82, 0.25), smoothstep(0.4, 0.85, plasma));
        c       = mix(c,                     vec3(1.0,  0.97, 0.8),  smoothstep(0.75,1.0,  plasma));
        c *= pulse;

        gl_FragColor = vec4(c, plasma * 0.55);
      }
    `,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  }), []);

  useFrame(s => {
    if (meshRef.current) meshRef.current.material.uniforms.time.value = s.clock.elapsedTime;
  });

  return (
    // High segment count (80×80) for smooth vertex displacement — enough geo to
    // express the fine lumpy plasma blob shapes without faceting
    <mesh ref={meshRef} material={shader}>
      <sphereGeometry args={[1.12, 80, 80]} />
    </mesh>
  );
}

// ─── Bézier arc prominences (structural loops) ───────────────────────────────
const ARC_COUNT = 40;
const ARC_SEG   = 16;

function SunProminences() {
  const arcs = useMemo(() => {
    return Array.from({ length: ARC_COUNT }, () => {
      const phi1 = Math.random() * Math.PI * 2, th1 = Math.acos(2*Math.random()-1);
      const phi2 = phi1 + (Math.random()-0.5)*1.5, th2 = th1 + (Math.random()-0.5)*1.5;
      const p1 = new THREE.Vector3(Math.sin(th1)*Math.cos(phi1), Math.cos(th1), Math.sin(th1)*Math.sin(phi1));
      const p2 = new THREE.Vector3(Math.sin(th2)*Math.cos(phi2), Math.cos(th2), Math.sin(th2)*Math.sin(phi2));
      const mid = p1.clone().add(p2).normalize();
      return {
        p1x:p1.x, p1y:p1.y, p1z:p1.z,
        p2x:p2.x, p2y:p2.y, p2z:p2.z,
        mx:mid.x, my:mid.y, mz:mid.z,
        maxH: 0.12 + Math.random()*0.20,
        phase: Math.random()*Math.PI*2,
        speed: 0.2 + Math.random()*0.5,
      };
    });
  }, []);

  const PAIR_COUNT = ARC_COUNT * ARC_SEG;
  const posArr = useMemo(() => new Float32Array(PAIR_COUNT * 2 * 3), []);
  const colArr = useMemo(() => {
    const ca = new Float32Array(PAIR_COUNT * 2 * 3);
    for (let ai=0;ai<ARC_COUNT;ai++) for (let si=0;si<ARC_SEG;si++){
      const b = (ai*ARC_SEG+si)*6;
      const b0 = Math.sin((si/ARC_SEG)*Math.PI), b1 = Math.sin(((si+1)/ARC_SEG)*Math.PI);
      ca[b+0]=1.0; ca[b+1]=0.28+b0*0.55; ca[b+2]=0.0;
      ca[b+3]=1.0; ca[b+4]=0.28+b1*0.55; ca[b+5]=0.0;
    }
    return ca;
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    g.setAttribute('color',    new THREE.BufferAttribute(colArr, 3));
    return g;
  }, []);

  const mat = useMemo(() => new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }), []);

  const INNER = 1.02;
  useFrame(s => {
    const t = s.clock.elapsedTime;
    const pos = posArr; let idx = 0;
    for (let ai=0;ai<ARC_COUNT;ai++){
      const a = arcs[ai];
      const H = a.maxH * (0.2 + 0.8*Math.abs(Math.sin(t*a.speed+a.phase)));
      const ax=a.mx*(INNER+H), ay=a.my*(INNER+H), az=a.mz*(INNER+H);
      const p1x=a.p1x*INNER, p1y=a.p1y*INNER, p1z=a.p1z*INNER;
      const p2x=a.p2x*INNER, p2y=a.p2y*INNER, p2z=a.p2z*INNER;
      let px=p1x, py=p1y, pz=p1z;
      for (let si=1;si<=ARC_SEG;si++){
        const u=si/ARC_SEG, mu=1-u, mu2=mu*mu, u2=u*u, muu=2*mu*u;
        const nx=mu2*p1x+muu*ax+u2*p2x;
        const ny=mu2*p1y+muu*ay+u2*p2y;
        const nz=mu2*p1z+muu*az+u2*p2z;
        pos[idx++]=px; pos[idx++]=py; pos[idx++]=pz;
        pos[idx++]=nx; pos[idx++]=ny; pos[idx++]=nz;
        px=nx; py=ny; pz=nz;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  return <lineSegments geometry={geo} material={mat} />;
}

// ─── Sun root ─────────────────────────────────────────────────────────────────
export default function Sun({ position, scale, onSelect }) {
  const meshRef  = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const texture = useTexture('/textures/8k_sun.jpg');

  const innerGlow = useMemo(() => {
    const c = document.createElement('canvas'); c.width=c.height=256;
    const ctx=c.getContext('2d');
    const g=ctx.createRadialGradient(128,128,58,128,128,128);
    g.addColorStop(0.0,'rgba(255,140,20,0.0)');
    g.addColorStop(0.62,'rgba(255,85,5,0.32)');
    g.addColorStop(0.88,'rgba(210,40,0,0.12)');
    g.addColorStop(1.0,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,256,256);
    return new THREE.CanvasTexture(c);
  }, []);

  const outerGlow = useMemo(() => {
    const c = document.createElement('canvas'); c.width=c.height=256;
    const ctx=c.getContext('2d');
    const g=ctx.createRadialGradient(128,128,0,128,128,128);
    g.addColorStop(0.0,'rgba(255,180,60,0.0)');
    g.addColorStop(0.5,'rgba(255,90,10,0.08)');
    g.addColorStop(0.8,'rgba(150,30,0,0.04)');
    g.addColorStop(1.0,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,256,256);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetS = hovered ? scale[0]*1.03 : scale[0];
      groupRef.current.scale.lerp(new THREE.Vector3(targetS,targetS,targetS), 1.0-Math.exp(-8.0*delta));
      groupRef.current.rotation.y += 0.0006*delta*60;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <FadingLabel targetRef={meshRef} radius={scale[0]} name="THE SUN" position={[0, scale[1]*1.4, 0]} fontSize="14px" />

      {/* 8K NASA surface texture */}
      <mesh>
        <sphereGeometry args={[1.0, 64, 64]} />
        <meshBasicMaterial map={texture} color="#ffffff" />
      </mesh>

      {/* Boiling surface granulation */}
      <SunPlasma />

      {/* Soft atmospheric sprite glows */}
      <sprite scale={[2.6, 2.6, 1]}>
        <spriteMaterial map={innerGlow} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
      </sprite>
      <sprite scale={[3.6, 3.6, 1]}>
        <spriteMaterial map={outerGlow} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
      </sprite>

      <mesh
        ref={meshRef}
        onClick={(e)=>{ e.stopPropagation(); onSelect(); }}
        onPointerOver={(e)=>{ e.stopPropagation(); document.body.style.cursor='pointer'; setHovered(true); }}
        onPointerOut={()=>{ document.body.style.cursor='auto'; setHovered(false); }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <pointLight intensity={3.5} color="#ffffff" distance={2000} decay={1.0} />
    </group>
  );
}
