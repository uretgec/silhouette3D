import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { SilhouetteData } from '../utils/silhouette';
import { generateThreeGeometry, MeshMode } from '../utils/stlGenerator';

interface STLViewerProps {
  silhouette: SilhouetteData | null;
  thickness: number;
  scale: number;
  meshMode?: MeshMode;
  baseThickness?: number;
  baseMode?: 'bounding' | 'cover';
}

function Model({ silhouette, thickness, scale, meshMode = 'none', baseThickness = 0, baseMode = 'bounding' }: STLViewerProps) {
  const geometry = useMemo(() => {
    if (!silhouette) return null;
    const { positions, normals, indices, baseVertexCount } = generateThreeGeometry(silhouette, thickness, scale, baseThickness, baseMode);
    let finalNormals = normals;
    if (meshMode === 'smooth') {
      finalNormals = smoothNormals(positions, normals, baseVertexCount);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(finalNormals, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [silhouette, thickness, scale, meshMode, baseThickness, baseMode]);

  if (!geometry) return null;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#4f9cf7" metalness={0.3} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function smoothNormals(positions: Float32Array, normals: Float32Array, baseVertexCount: number = 0): Float32Array {
  const smoothed = new Float32Array(normals.length);
  const vn = new Map<string, number[]>();
  
  // Only process silhouette vertices (skip base layer)
  const startIndex = baseVertexCount;
  const totalVertices = positions.length / 3;
  
  for (let i = startIndex; i < totalVertices; i++) {
    const key = `${positions[i*3].toFixed(3)},${positions[i*3+1].toFixed(3)},${positions[i*3+2].toFixed(3)}`;
    if (!vn.has(key)) vn.set(key, [0,0,0,0]);
    const s = vn.get(key)!;
    s[0]+=normals[i*3]; s[1]+=normals[i*3+1]; s[2]+=normals[i*3+2]; s[3]+=1;
  }
  
  // Apply smoothed normals only to silhouette vertices
  for (let i = startIndex; i < totalVertices; i++) {
    const key = `${positions[i*3].toFixed(3)},${positions[i*3+1].toFixed(3)},${positions[i*3+2].toFixed(3)}`;
    const s = vn.get(key)!;
    const nx=s[0]/s[3],ny=s[1]/s[3],nz=s[2]/s[3];
    const len=Math.sqrt(nx*nx+ny*ny+nz*nz);
    if(len>0){smoothed[i*3]=nx/len;smoothed[i*3+1]=ny/len;smoothed[i*3+2]=nz/len;}
  }
  
  // Keep base layer normals unchanged
  for (let i = 0; i < startIndex; i++) {
    smoothed[i*3] = normals[i*3];
    smoothed[i*3+1] = normals[i*3+1];
    smoothed[i*3+2] = normals[i*3+2];
  }
  
  return smoothed;
}

export default function STLViewer({ silhouette, thickness, scale, meshMode = 'none', baseThickness = 0, baseMode = 'bounding' }: STLViewerProps) {
  const size = silhouette ? Math.max(silhouette.width, silhouette.height) * scale : 100;

  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl overflow-hidden">
      <Canvas shadows camera={{ position: [0, size * 1.5, 0.1], up: [0, 0, 1], fov: 50, near: 0.1, far: size * 20 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[size, size, size * 2]} intensity={1} castShadow />
        <directionalLight position={[-size, size, size]} intensity={0.5} />
        <Model silhouette={silhouette} thickness={thickness} scale={scale} meshMode={meshMode} baseThickness={baseThickness} baseMode={baseMode} />
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
          position={[0, -0.1, 0]}
        />
        <OrbitControls makeDefault enableDamping={false} minDistance={size * 0.5} maxDistance={size * 5} />
      </Canvas>
    </div>
  );
}
