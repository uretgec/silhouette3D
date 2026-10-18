import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { SilhouetteData } from '../utils/silhouette';
import { generateThreeGeometry } from '../utils/stlGenerator';

interface STLViewerProps {
  silhouette: SilhouetteData | null;
  thickness: number;
  scale: number;
  meshMode?: 'none' | 'smooth' | 'simplify';
}

function Model({ silhouette, thickness, scale, meshMode = 'none' }: STLViewerProps) {
  const geometry = useMemo(() => {
    if (!silhouette) return null;

    const { positions, normals, indices } = generateThreeGeometry(silhouette, thickness, scale);

    // Apply smooth if requested (only visual, doesn't affect STL)
    let finalNormals = normals;
    if (meshMode === 'smooth') {
      finalNormals = smoothNormals(positions, normals);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(finalNormals, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeBoundingSphere();

    return geo;
  }, [silhouette, thickness, scale, meshMode]);

  if (!geometry) return null;

  return (
    // Rotate model so Z-up becomes Y-up for proper Three.js viewing
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#4f9cf7"
          metalness={0.3}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Smooth normals for visual appearance (doesn't affect STL)
 */
function smoothNormals(positions: Float32Array, normals: Float32Array): Float32Array {
  const smoothed = new Float32Array(normals.length);
  const vertexNormals = new Map<string, number[]>();
  
  // Collect normals for each vertex position
  for (let i = 0; i < positions.length / 3; i++) {
    const x = positions[i * 3].toFixed(3);
    const y = positions[i * 3 + 1].toFixed(3);
    const z = positions[i * 3 + 2].toFixed(3);
    const key = `${x},${y},${z}`;
    
    if (!vertexNormals.has(key)) {
      vertexNormals.set(key, [0, 0, 0, 0]); // x, y, z, count
    }
    
    const sum = vertexNormals.get(key)!;
    sum[0] += normals[i * 3];
    sum[1] += normals[i * 3 + 1];
    sum[2] += normals[i * 3 + 2];
    sum[3] += 1;
  }
  
  // Average and normalize
  for (let i = 0; i < positions.length / 3; i++) {
    const x = positions[i * 3].toFixed(3);
    const y = positions[i * 3 + 1].toFixed(3);
    const z = positions[i * 3 + 2].toFixed(3);
    const key = `${x},${y},${z}`;
    
    const sum = vertexNormals.get(key)!;
    const nx = sum[0] / sum[3];
    const ny = sum[1] / sum[3];
    const nz = sum[2] / sum[3];
    
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      smoothed[i * 3] = nx / len;
      smoothed[i * 3 + 1] = ny / len;
      smoothed[i * 3 + 2] = nz / len;
    }
  }
  
  return smoothed;
}

function CameraSetup({ silhouette, scale }: { silhouette: SilhouetteData | null; scale: number }) {
  const size = silhouette ? Math.max(silhouette.width, silhouette.height) * scale : 100;

  return (
    <OrbitControls
      makeDefault
      enableDamping={false}
      minDistance={size * 0.5}
      maxDistance={size * 5}
    />
  );
}

export default function STLViewer({ silhouette, thickness, scale, meshMode = 'none' }: STLViewerProps) {
  const size = silhouette ? Math.max(silhouette.width, silhouette.height) * scale : 100;

  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl overflow-hidden">
      <Canvas
        shadows
        camera={{
          position: [0, size * 1.5, 0.1],
          up: [0, 0, 1],
          fov: 50,
          near: 0.1,
          far: size * 20
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[size, size, size * 2]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-size, size, size]} intensity={0.5} />
        <pointLight position={[0, size * 2, size]} intensity={0.3} />

        <Model silhouette={silhouette} thickness={thickness} scale={scale} meshMode={meshMode} />

        <Grid
          args={[size * 4, size * 4]}
          cellSize={size * 0.1}
          cellThickness={0.5}
          cellColor="#4a5568"
          sectionSize={size * 0.5}
          sectionThickness={1}
          sectionColor="#718096"
          fadeDistance={size * 8}
          fadeStrength={1}
          position={[0, -0.5, 0]}
        />

        <CameraSetup silhouette={silhouette} scale={scale} />
      </Canvas>
    </div>
  );
}
