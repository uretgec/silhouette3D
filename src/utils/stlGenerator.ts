import { SilhouetteData } from './silhouette';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: Vec3;
  v2: Vec3;
  v3: Vec3;
  normal: Vec3;
}

export type MeshMode = 'none' | 'smooth' | 'simplify';

/**
 * Generate STL from silhouette
 */
export function generateSTL(
  silhouette: SilhouetteData,
  thickness: number = 3,
  scale: number = 1,
  meshMode: MeshMode = 'none'
): ArrayBuffer {
  const { width, height, pixels } = silhouette;
  const triangles: Triangle[] = [];

  const pixelSize = scale;
  const halfW = (width * pixelSize) / 2;
  const halfH = (height * pixelSize) / 2;
  const zBottom = 0;
  const zTop = thickness;

  // Generate all triangles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (pixels[idx] === 1) {
        const x0 = x * pixelSize - halfW;
        const y0 = y * pixelSize - halfH;
        const x1 = x0 + pixelSize;
        const y1 = y0 + pixelSize;

        // Top face
        triangles.push({
          v1: { x: x0, y: y0, z: zTop },
          v2: { x: x1, y: y0, z: zTop },
          v3: { x: x1, y: y1, z: zTop },
          normal: { x: 0, y: 0, z: 1 }
        });
        triangles.push({
          v1: { x: x0, y: y0, z: zTop },
          v2: { x: x1, y: y1, z: zTop },
          v3: { x: x0, y: y1, z: zTop },
          normal: { x: 0, y: 0, z: 1 }
        });

        // Bottom face
        triangles.push({
          v1: { x: x0, y: y0, z: zBottom },
          v2: { x: x1, y: y1, z: zBottom },
          v3: { x: x1, y: y0, z: zBottom },
          normal: { x: 0, y: 0, z: -1 }
        });
        triangles.push({
          v1: { x: x0, y: y0, z: zBottom },
          v2: { x: x0, y: y1, z: zBottom },
          v3: { x: x1, y: y1, z: zBottom },
          normal: { x: 0, y: 0, z: -1 }
        });

        // Side faces - only if neighbor is empty
        if (x === width - 1 || pixels[idx + 1] === 0) {
          triangles.push({
            v1: { x: x1, y: y0, z: zBottom }, v2: { x: x1, y: y1, z: zBottom }, v3: { x: x1, y: y1, z: zTop },
            normal: { x: 1, y: 0, z: 0 }
          });
          triangles.push({
            v1: { x: x1, y: y0, z: zBottom }, v2: { x: x1, y: y1, z: zTop }, v3: { x: x1, y: y0, z: zTop },
            normal: { x: 1, y: 0, z: 0 }
          });
        }

        if (x === 0 || pixels[idx - 1] === 0) {
          triangles.push({
            v1: { x: x0, y: y0, z: zBottom }, v2: { x: x0, y: y1, z: zBottom }, v3: { x: x0, y: y1, z: zTop },
            normal: { x: -1, y: 0, z: 0 }
          });
          triangles.push({
            v1: { x: x0, y: y0, z: zBottom }, v2: { x: x0, y: y1, z: zTop }, v3: { x: x0, y: y0, z: zTop },
            normal: { x: -1, y: 0, z: 0 }
          });
        }

        if (y === 0 || pixels[(y - 1) * width + x] === 0) {
          triangles.push({
            v1: { x: x0, y: y0, z: zBottom }, v2: { x: x1, y: y0, z: zBottom }, v3: { x: x1, y: y0, z: zTop },
            normal: { x: 0, y: -1, z: 0 }
          });
          triangles.push({
            v1: { x: x0, y: y0, z: zBottom }, v2: { x: x1, y: y0, z: zTop }, v3: { x: x0, y: y0, z: zTop },
            normal: { x: 0, y: -1, z: 0 }
          });
        }

        if (y === height - 1 || pixels[(y + 1) * width + x] === 0) {
          triangles.push({
            v1: { x: x0, y: y1, z: zBottom }, v2: { x: x1, y: y1, z: zBottom }, v3: { x: x1, y: y1, z: zTop },
            normal: { x: 0, y: 1, z: 0 }
          });
          triangles.push({
            v1: { x: x0, y: y1, z: zBottom }, v2: { x: x1, y: y1, z: zTop }, v3: { x: x0, y: y1, z: zTop },
            normal: { x: 0, y: 1, z: 0 }
          });
        }
      }
    }
  }

  // Apply simplification if requested
  let processedTriangles = triangles;
  if (meshMode === 'simplify') {
    processedTriangles = simplifyMesh(triangles);
  }

  console.log(`[STL] Mode: ${meshMode}, Triangles: ${triangles.length} -> ${processedTriangles.length}`);

  return createBinarySTL(processedTriangles);
}

/**
 * Simplify mesh by merging adjacent coplanar quads
 * Grid-based approach - O(n) complexity
 */
function simplifyMesh(triangles: Triangle[]): Triangle[] {
  const result: Triangle[] = [];
  
  // Separate faces by type
  const topFaces: Triangle[] = [];
  const bottomFaces: Triangle[] = [];
  const sideFaces: Triangle[] = [];
  
  for (const tri of triangles) {
    if (Math.abs(tri.normal.z - 1) < 0.01) {
      topFaces.push(tri);
    } else if (Math.abs(tri.normal.z + 1) < 0.01) {
      bottomFaces.push(tri);
    } else {
      sideFaces.push(tri);
    }
  }
  
  // Merge top faces using grid
  const mergedTop = mergeQuadsGrid(topFaces);
  
  // Merge bottom faces using grid
  const mergedBottom = mergeQuadsGrid(bottomFaces);
  
  // Keep side faces as-is
  result.push(...mergedTop, ...mergedBottom, ...sideFaces);
  
  const reduction = Math.round((1 - result.length / triangles.length) * 100);
  console.log(`[Simplify] ${triangles.length} -> ${result.length} triangles (${reduction}% reduction)`);
  
  return result;
}

/**
 * Grid-based quad merging - O(n) complexity
 */
function mergeQuadsGrid(triangles: Triangle[]): Triangle[] {
  if (triangles.length === 0) return [];
  
  // Convert triangles to quads
  const quads: { minX: number, minY: number, maxX: number, maxY: number, z: number, normal: Vec3 }[] = [];
  const used = new Set<number>();
  
  // First pass: pair triangles into quads
  for (let i = 0; i < triangles.length; i++) {
    if (used.has(i)) continue;
    
    const tri = triangles[i];
    const xs = [tri.v1.x, tri.v2.x, tri.v3.x];
    const ys = [tri.v1.y, tri.v2.y, tri.v3.y];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // Find matching triangle (same bounds)
    for (let j = i + 1; j < triangles.length; j++) {
      if (used.has(j)) continue;
      const tri2 = triangles[j];
      const xs2 = [tri2.v1.x, tri2.v2.x, tri2.v3.x];
      const ys2 = [tri2.v1.y, tri2.v2.y, tri2.v3.y];
      const minX2 = Math.min(...xs2);
      const maxX2 = Math.max(...xs2);
      const minY2 = Math.min(...ys2);
      const maxY2 = Math.max(...ys2);
      
      if (Math.abs(minX - minX2) < 0.001 && Math.abs(maxX - maxX2) < 0.001 &&
          Math.abs(minY - minY2) < 0.001 && Math.abs(maxY - maxY2) < 0.001) {
        quads.push({ minX, minY, maxX, maxY, z: tri.v1.z, normal: { ...tri.normal } });
        used.add(i);
        used.add(j);
        break;
      }
    }
    
    if (!used.has(i)) {
      quads.push({ minX, minY, maxX, maxY, z: tri.v1.z, normal: { ...tri.normal } });
      used.add(i);
    }
  }
  
  // Second pass: grid-based merging
  // Calculate grid cell size (average quad size)
  let totalWidth = 0, totalHeight = 0;
  for (const quad of quads) {
    totalWidth += quad.maxX - quad.minX;
    totalHeight += quad.maxY - quad.minY;
  }
  const cellSize = Math.max(totalWidth / quads.length, totalHeight / quads.length) * 1.1;
  
  // Build grid
  const grid = new Map<string, number[]>();
  for (let i = 0; i < quads.length; i++) {
    const quad = quads[i];
    const cx = Math.floor(quad.minX / cellSize);
    const cy = Math.floor(quad.minY / cellSize);
    const key = `${cx},${cy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(i);
  }
  
  // Merge adjacent quads
  const merged = new Set<number>();
  const resultQuads: typeof quads = [];
  
  for (let i = 0; i < quads.length; i++) {
    if (merged.has(i)) continue;
    
    const a = quads[i];
    let current = { ...a };
    merged.add(i);
    
    // Try to merge with neighbors
    let found = true;
    while (found) {
      found = false;
      
      // Check right neighbor
      const cx = Math.floor(current.maxX / cellSize);
      const cy = Math.floor(current.minY / cellSize);
      const rightKey = `${cx},${cy}`;
      const rightQuads = grid.get(rightKey) || [];
      
      for (const j of rightQuads) {
        if (merged.has(j)) continue;
        const b = quads[j];
        
        // Check if can merge horizontally
        if (Math.abs(current.minY - b.minY) < 0.001 && 
            Math.abs(current.maxY - b.maxY) < 0.001 &&
            Math.abs(current.maxX - b.minX) < 0.001) {
          current.maxX = b.maxX;
          merged.add(j);
          found = true;
          break;
        }
      }
      
      if (found) continue;
      
      // Check bottom neighbor
      const bottomKey = `${Math.floor(current.minX / cellSize)},${Math.floor(current.maxY / cellSize)}`;
      const bottomQuads = grid.get(bottomKey) || [];
      
      for (const j of bottomQuads) {
        if (merged.has(j)) continue;
        const b = quads[j];
        
        // Check if can merge vertically
        if (Math.abs(current.minX - b.minX) < 0.001 && 
            Math.abs(current.maxX - b.maxX) < 0.001 &&
            Math.abs(current.maxY - b.minY) < 0.001) {
          current.maxY = b.maxY;
          merged.add(j);
          found = true;
          break;
        }
      }
    }
    
    resultQuads.push(current);
  }
  
  // Convert quads back to triangles
  const result: Triangle[] = [];
  for (const quad of resultQuads) {
    result.push({
      v1: { x: quad.minX, y: quad.minY, z: quad.z },
      v2: { x: quad.maxX, y: quad.minY, z: quad.z },
      v3: { x: quad.maxX, y: quad.maxY, z: quad.z },
      normal: quad.normal
    });
    result.push({
      v1: { x: quad.minX, y: quad.minY, z: quad.z },
      v2: { x: quad.maxX, y: quad.maxY, z: quad.z },
      v3: { x: quad.minX, y: quad.maxY, z: quad.z },
      normal: quad.normal
    });
  }
  
  return result;
}

function createBinarySTL(triangles: Triangle[]): ArrayBuffer {
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50;
  const bufferSize = headerSize + triangleCountSize + triangles.length * triangleSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  const header = 'Binary STL - Silhouette3D';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  view.setUint32(80, triangles.length, true);

  let offset = 84;
  for (const tri of triangles) {
    view.setFloat32(offset, tri.normal.x, true); offset += 4;
    view.setFloat32(offset, tri.normal.y, true); offset += 4;
    view.setFloat32(offset, tri.normal.z, true); offset += 4;

    view.setFloat32(offset, tri.v1.x, true); offset += 4;
    view.setFloat32(offset, tri.v1.y, true); offset += 4;
    view.setFloat32(offset, tri.v1.z, true); offset += 4;

    view.setFloat32(offset, tri.v2.x, true); offset += 4;
    view.setFloat32(offset, tri.v2.y, true); offset += 4;
    view.setFloat32(offset, tri.v2.z, true); offset += 4;

    view.setFloat32(offset, tri.v3.x, true); offset += 4;
    view.setFloat32(offset, tri.v3.y, true); offset += 4;
    view.setFloat32(offset, tri.v3.z, true); offset += 4;

    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}

export function downloadSTL(buffer: ArrayBuffer, filename: string = 'silhouette.stl') {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate OBJ format
 */
export function generateOBJ(
  silhouette: SilhouetteData,
  thickness: number = 3,
  scale: number = 1
): string {
  const { width, height, pixels } = silhouette;
  const vertices: string[] = [];
  const normals: string[] = [];
  const faces: string[] = [];
  
  const pixelSize = scale;
  const halfW = (width * pixelSize) / 2;
  const halfH = (height * pixelSize) / 2;
  const zBottom = 0;
  const zTop = thickness;
  
  let vertexIndex = 1;
  
  // Add material definition
  let obj = '# OBJ file generated by Silhouette3D\n';
  obj += 'mtllib silhouette.mtl\n';
  obj += 'usemtl default\n\n';
  
  // Add default material
  let mtl = '# MTL file generated by Silhouette3D\n';
  mtl += 'newmtl default\n';
  mtl += 'Ka 0.2 0.2 0.2\n';
  mtl += 'Kd 0.8 0.8 0.8\n';
  mtl += 'Ks 1.0 1.0 1.0\n';
  mtl += 'Ns 100\n';
  mtl += 'd 1.0\n';
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (pixels[idx] === 1) {
        const x0 = x * pixelSize - halfW;
        const y0 = y * pixelSize - halfH;
        const x1 = x0 + pixelSize;
        const y1 = y0 + pixelSize;
        
        // Top face vertices
        vertices.push(`v ${x0} ${y0} ${zTop}`);
        vertices.push(`v ${x1} ${y0} ${zTop}`);
        vertices.push(`v ${x1} ${y1} ${zTop}`);
        vertices.push(`v ${x0} ${y1} ${zTop}`);
        
        // Bottom face vertices
        vertices.push(`v ${x0} ${y0} ${zBottom}`);
        vertices.push(`v ${x1} ${y0} ${zBottom}`);
        vertices.push(`v ${x1} ${y1} ${zBottom}`);
        vertices.push(`v ${x0} ${y1} ${zBottom}`);
        
        // Normals
        normals.push('vn 0 0 1');   // top
        normals.push('vn 0 0 -1');  // bottom
        normals.push('vn 1 0 0');   // right
        normals.push('vn -1 0 0');  // left
        normals.push('vn 0 -1 0');  // front
        normals.push('vn 0 1 0');   // back
        
        const base = vertexIndex;
        
        // Top face
        faces.push(`f ${base}//${base} ${base+1}//${base+1} ${base+2}//${base+2}`);
        faces.push(`f ${base}//${base} ${base+2}//${base+2} ${base+3}//${base+3}`);
        
        // Bottom face
        faces.push(`f ${base+4}//${base+4} ${base+6}//${base+6} ${base+5}//${base+5}`);
        faces.push(`f ${base+4}//${base+4} ${base+7}//${base+7} ${base+6}//${base+6}`);
        
        // Side faces
        let normalIdx = 2; // Start from right normal
        
        if (x === width - 1 || pixels[idx + 1] === 0) {
          faces.push(`f ${base+1}//${base+normalIdx} ${base+5}//${base+normalIdx} ${base+6}//${base+normalIdx}`);
          faces.push(`f ${base+1}//${base+normalIdx} ${base+6}//${base+normalIdx} ${base+2}//${base+normalIdx}`);
        }
        normalIdx++;
        
        if (x === 0 || pixels[idx - 1] === 0) {
          faces.push(`f ${base}//${base+normalIdx} ${base+6}//${base+normalIdx} ${base+4}//${base+normalIdx}`);
          faces.push(`f ${base}//${base+normalIdx} ${base+7}//${base+normalIdx} ${base+6}//${base+normalIdx}`);
        }
        normalIdx++;
        
        if (y === 0 || pixels[(y - 1) * width + x] === 0) {
          faces.push(`f ${base}//${base+normalIdx} ${base+4}//${base+normalIdx} ${base+5}//${base+normalIdx}`);
          faces.push(`f ${base}//${base+normalIdx} ${base+5}//${base+normalIdx} ${base+1}//${base+normalIdx}`);
        }
        normalIdx++;
        
        if (y === height - 1 || pixels[(y + 1) * width + x] === 0) {
          faces.push(`f ${base+3}//${base+normalIdx} ${base+7}//${base+normalIdx} ${base+6}//${base+normalIdx}`);
          faces.push(`f ${base+3}//${base+normalIdx} ${base+6}//${base+normalIdx} ${base+2}//${base+normalIdx}`);
        }
        
        vertexIndex += 8;
      }
    }
  }
  
  obj += vertices.join('\n') + '\n\n';
  obj += normals.join('\n') + '\n\n';
  obj += faces.join('\n') + '\n';
  
  return obj;
}

/**
 * Generate 3MF format (simplified - just the model XML)
 */
export function generate3MF(
  silhouette: SilhouetteData,
  thickness: number = 3,
  scale: number = 1
): Blob {
  const { width, height, pixels } = silhouette;
  const vertices: number[][] = [];
  const triangles: number[][] = [];
  
  const pixelSize = scale;
  const halfW = (width * pixelSize) / 2;
  const halfH = (height * pixelSize) / 2;
  const zBottom = 0;
  const zTop = thickness;
  
  let vertexIndex = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (pixels[idx] === 1) {
        const x0 = x * pixelSize - halfW;
        const y0 = y * pixelSize - halfH;
        const x1 = x0 + pixelSize;
        const y1 = y0 + pixelSize;
        
        // Top face
        vertices.push([x0, y0, zTop]);
        vertices.push([x1, y0, zTop]);
        vertices.push([x1, y1, zTop]);
        vertices.push([x0, y1, zTop]);
        
        // Bottom face
        vertices.push([x0, y0, zBottom]);
        vertices.push([x1, y0, zBottom]);
        vertices.push([x1, y1, zBottom]);
        vertices.push([x0, y1, zBottom]);
        
        const base = vertexIndex;
        
        // Top face triangles
        triangles.push([base, base+1, base+2]);
        triangles.push([base, base+2, base+3]);
        
        // Bottom face triangles
        triangles.push([base+4, base+6, base+5]);
        triangles.push([base+4, base+7, base+6]);
        
        // Side faces
        if (x === width - 1 || pixels[idx + 1] === 0) {
          triangles.push([base+1, base+5, base+6]);
          triangles.push([base+1, base+6, base+2]);
        }
        
        if (x === 0 || pixels[idx - 1] === 0) {
          triangles.push([base, base+6, base+4]);
          triangles.push([base, base+7, base+6]);
        }
        
        if (y === 0 || pixels[(y - 1) * width + x] === 0) {
          triangles.push([base, base+4, base+5]);
          triangles.push([base, base+5, base+1]);
        }
        
        if (y === height - 1 || pixels[(y + 1) * width + x] === 0) {
          triangles.push([base+3, base+7, base+6]);
          triangles.push([base+3, base+6, base+2]);
        }
        
        vertexIndex += 8;
      }
    }
  }
  
  // Create 3MF XML
  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">Silhouette3D</metadata>
  <metadata name="CreatedBy">Silhouette3D</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vertices.map(v => `          <vertex x="${v[0]}" y="${v[1]}" z="${v[2]}" />`).join('\n')}
        </vertices>
        <triangles>
${triangles.map(t => `          <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}" />`).join('\n')}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;
  
  // Create blob (simplified - just the XML, not a full ZIP)
  return new Blob([modelXml], { type: 'application/xml' });
}

/**
 * Generic download function
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate Three.js geometry from silhouette
 */
export function generateThreeGeometry(
  silhouette: SilhouetteData,
  thickness: number = 3,
  scale: number = 1
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
  const { width, height, pixels } = silhouette;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexCount = 0;

  const pixelSize = scale;
  const halfW = (width * pixelSize) / 2;
  const halfH = (height * pixelSize) / 2;
  const zBottom = 0;
  const zTop = thickness;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (pixels[idx] === 1) {
        const x0 = x * pixelSize - halfW;
        const y0 = y * pixelSize - halfH;
        const x1 = x0 + pixelSize;
        const y1 = y0 + pixelSize;

        // Top face
        const topStart = vertexCount;
        positions.push(x0, y0, zTop, x1, y0, zTop, x1, y1, zTop, x0, y1, zTop);
        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
        indices.push(topStart, topStart + 1, topStart + 2, topStart, topStart + 2, topStart + 3);
        vertexCount += 4;

        // Bottom face
        const botStart = vertexCount;
        positions.push(x0, y0, zBottom, x1, y0, zBottom, x1, y1, zBottom, x0, y1, zBottom);
        normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
        indices.push(botStart, botStart + 2, botStart + 1, botStart, botStart + 3, botStart + 2);
        vertexCount += 4;

        // Right side
        if (x === width - 1 || pixels[idx + 1] === 0) {
          const s = vertexCount;
          positions.push(x1, y0, zBottom, x1, y1, zBottom, x1, y1, zTop, x1, y0, zTop);
          normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
          indices.push(s, s + 1, s + 2, s, s + 2, s + 3);
          vertexCount += 4;
        }

        // Left side
        if (x === 0 || pixels[idx - 1] === 0) {
          const s = vertexCount;
          positions.push(x0, y0, zBottom, x0, y1, zBottom, x0, y1, zTop, x0, y0, zTop);
          normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
          indices.push(s, s + 2, s + 1, s, s + 3, s + 2);
          vertexCount += 4;
        }

        // Front side
        if (y === 0 || pixels[(y - 1) * width + x] === 0) {
          const s = vertexCount;
          positions.push(x0, y0, zBottom, x1, y0, zBottom, x1, y0, zTop, x0, y0, zTop);
          normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
          indices.push(s, s + 2, s + 1, s, s + 3, s + 2);
          vertexCount += 4;
        }

        // Back side
        if (y === height - 1 || pixels[(y + 1) * width + x] === 0) {
          const s = vertexCount;
          positions.push(x0, y1, zBottom, x1, y1, zBottom, x1, y1, zTop, x0, y1, zTop);
          normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
          indices.push(s, s + 1, s + 2, s, s + 2, s + 3);
          vertexCount += 4;
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices)
  };
}
