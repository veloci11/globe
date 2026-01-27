"use client"

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// -----------------------------------------------------------------------------
// Constants & Utils
// -----------------------------------------------------------------------------
const STAR_COUNT = 2718 // Nombre d'étoiles derrière le globe
const SHOOTING_STAR_COUNT = 0 // Désactivé pour performance

// -----------------------------------------------------------------------------
// Background Gradient (Subtle Vignette)
// -----------------------------------------------------------------------------
const BackgroundGradient = () => {
  return (
    <mesh scale={[10000, 10000, 1]} position={[0, 0, -100]}>
      <planeGeometry />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={{
          uColor1: { value: new THREE.Color('#000000') }, // Center (Black)
          uColor2: { value: new THREE.Color('#020210') }, // Corners (Dark Blue)
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          varying vec2 vUv;
          void main() {
            float dist = distance(vUv, vec2(0.5));
            // Subtle radial gradient
            vec3 color = mix(uColor1, uColor2, smoothstep(0.2, 1.2, dist));
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  )
}

// -----------------------------------------------------------------------------
// Main Star Field
// -----------------------------------------------------------------------------
interface StarFieldProps {
  count?: number;
  densityGradient?: boolean; // Si true, 30% en haut → 90% en bas
}

const StarField = ({ count = STAR_COUNT, densityGradient = false }: StarFieldProps) => {
  const mesh = useRef<THREE.Points>(null)

  const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uDensityGradient: { value: densityGradient ? 1.0 : 0.0 }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uDensityGradient;
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aTwinkleSpeed;
      attribute float aTwinkleOffset;
      attribute float aNormalizedY;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        vColor = aColor;

        // Size attenuation
        gl_PointSize = aSize * uPixelRatio * (2000.0 / -mvPosition.z);
        
        // Twinkle effect
        float twinkle = sin(uTime * aTwinkleSpeed + aTwinkleOffset);
        twinkle = smoothstep(-1.0, 1.0, twinkle);
        float baseAlpha = 0.5 + 0.5 * twinkle;
        
        // Density gradient: 30% au top (Y=1) → 90% au bottom (Y=0)
        if (uDensityGradient > 0.5) {
          float gradientAlpha = 0.3 + (1.0 - aNormalizedY) * 0.6; // 0.3 à 0.9
          vAlpha = baseAlpha * gradientAlpha;
        } else {
          vAlpha = baseAlpha;
        }
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        // Distance from center of the point
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        // Soft circle shape
        float circle = 1.0 - smoothstep(0.0, 0.5, dist);
        
        // Glow effect
        float glow = exp(-4.0 * dist);
        
        // Combine
        float finalAlpha = vAlpha * (circle * 0.6 + glow * 0.4);
        
        if (finalAlpha < 0.01) discard;
        
        gl_FragColor = vec4(vColor, finalAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [densityGradient])

  const [positions, sizes, colors, twinkleSpeeds, twinkleOffsets, normalizedY] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const twinkleSpeeds = new Float32Array(count)
    const twinkleOffsets = new Float32Array(count)
    const normalizedY = new Float32Array(count)

    const starColors = [
      new THREE.Color('#ffffff'), // White
      new THREE.Color('#ffe9c4'), // Warm White
      new THREE.Color('#d4fbff'), // Blueish White
    ]

    // Pour trouver les valeurs min/max de Y pour normaliser
    const tempY: number[] = []

    for (let i = 0; i < count; i++) {
      // Random position in sphere - derrière le globe
      const r = 1200 + Math.random() * 2000
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      tempY.push(positions[i * 3 + 1])

      // Random size - un peu plus gros
      sizes[i] = 0.8 + Math.random() * 3.0

      // Random color
      const color = starColors[Math.floor(Math.random() * starColors.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      // Twinkle props
      twinkleSpeeds[i] = 0.5 + Math.random() * 2.0
      twinkleOffsets[i] = Math.random() * Math.PI * 2
    }

    // Normaliser Y entre 0 et 1
    const minY = Math.min(...tempY)
    const maxY = Math.max(...tempY)
    const rangeY = maxY - minY || 1

    for (let i = 0; i < count; i++) {
      normalizedY[i] = (positions[i * 3 + 1] - minY) / rangeY
    }

    return [positions, sizes, colors, twinkleSpeeds, twinkleOffsets, normalizedY]
  }, [count])

  useFrame((state) => {
    if (mesh.current) {
      // Slow rotation - très lent pour éviter distraction
      mesh.current.rotation.y = state.clock.getElapsedTime() * -0.005

      const material = mesh.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.getElapsedTime()
      material.uniforms.uPixelRatio.value = state.viewport.dpr
    }
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aTwinkleSpeed" args={[twinkleSpeeds, 1]} />
        <bufferAttribute attach="attributes-aTwinkleOffset" args={[twinkleOffsets, 1]} />
        <bufferAttribute attach="attributes-aNormalizedY" args={[normalizedY, 1]} />
      </bufferGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </points>
  )
}

// -----------------------------------------------------------------------------
// Shooting Star Component
// -----------------------------------------------------------------------------
const ShootingStar = () => {
  const mesh = useRef<THREE.Mesh>(null)
  const [active, setActive] = useState(false)

  // Reset star to a new random position
  const reset = () => {
    if (!mesh.current) return

    const r = 1000 + Math.random() * 500
    const theta = 2 * Math.PI * Math.random()
    const phi = Math.acos(2 * Math.random() - 1)

    mesh.current.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    )

    // Random direction tangent to sphere surface roughly
    const targetTheta = theta + (Math.random() - 0.5)
    const targetPhi = phi + (Math.random() - 0.5)
    const targetR = r - 500 // Move inwards slightly

    const target = new THREE.Vector3(
      targetR * Math.sin(targetPhi) * Math.cos(targetTheta),
      targetR * Math.sin(targetPhi) * Math.sin(targetTheta),
      targetR * Math.cos(targetPhi)
    )

    mesh.current.lookAt(target)
    setActive(true)
  }

  useFrame((state, delta) => {
    if (!active) {
      if (Math.random() < 0.003) reset() // Low probability spawn
      return
    }

    if (mesh.current) {
      mesh.current.translateZ(2500 * delta) // Move fast
      mesh.current.scale.z = 1 + (2500 * delta) * 0.1 // Stretch based on speed

      // If too far or out of view, reset
      if (mesh.current.position.length() > 2500 || mesh.current.position.length() < 100) {
        setActive(false)
        mesh.current.scale.z = 1
      }
    }
  })

  if (!active) return null

  return (
    <mesh ref={mesh}>
      {/* A thin cone or cylinder acting as the trail */}
      <cylinderGeometry args={[0, 2, 80, 8]} rotateX={Math.PI / 2} />
      <meshBasicMaterial color="#ccf" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
interface StarsBackgroundProps {
  count?: number;
  densityGradient?: boolean; // 30% en haut → 90% en bas
}

export default function StarsBackground({ count = 3500, densityGradient = false }: StarsBackgroundProps) {

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
      <Canvas
        camera={{ position: [0, 0, 1000], fov: 60, near: 0.1, far: 10000 }}
        // Optimization for Mac Retina: Limit pixel ratio
        dpr={[1, 1.5]}
        style={{ position: 'absolute', zIndex: -1 }}
        // Performance settings
        gl={{
          antialias: false,
          alpha: true, // Transparent pour voir le globe au-dessus
          powerPreference: "high-performance",
          stencil: false,
          depth: false
        }}
      >
        <BackgroundGradient />
        <StarField count={count} densityGradient={densityGradient} />
        {Array.from({ length: SHOOTING_STAR_COUNT }).map((_, i) => (
          <ShootingStar key={i} />
        ))}
      </Canvas>
    </div>
  )
}