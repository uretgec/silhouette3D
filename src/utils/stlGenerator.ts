import { SilhouetteData } from './silhouette';

interface Vec3 { x: number; y: number; z: number; }
interface Triangle { v1: Vec3; v2: Vec3; v3: Vec3; normal: Vec3; }

export type MeshMode = 'none' | 'smooth' | 'simplify';

export function generateSTL(
  silhouette: SilhouetteData,
  thickness: number = 3,
  scale: number = 1,
  meshMode: MeshMode = 'none',
  baseThickness: number = 0,
  baseMode: 'bounding' | 'cover' = 'bounding'
): ArrayBuffer {
  const { width, height, pixels } = silhouette;
  const triangles: Triangle[] = [];
  const ps = scale;
  const hw = (width * ps) / 2;
  const hh = (height * ps) / 2;

  // Base layer
  if (baseThickness > 0) {
    if (baseMode === 'bounding') {
      // Bounding box mode - single rectangle covering all pixels
      let minX = width, maxX = 0, minY = height, maxY = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (pixels[y * width + x] === 1) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }
      if (maxX >= minX && maxY >= minY) {
        const bx0 = minX * ps - hw, by0 = minY * ps - hh;
        const bx1 = (maxX + 1) * ps - hw, by1 = (maxY + 1) * ps - hh;
        const bz0 = -baseThickness, bz1 = 0;
        addBox(triangles, bx0, by0, bz0, bx1, by1, bz1);
      }
    } else {
      // Cover mode - follow silhouette outline per row
      const bz0 = -baseThickness, bz1 = 0;
      for (let y = 0; y < height; y++) {
        let minX = -1, maxX = -1;
        for (let x = 0; x < width; x++) {
          if (pixels[y * width + x] === 1) {
            if (minX === -1) minX = x;
            maxX = x;
          }
        }
        if (minX !== -1 && maxX !== -1) {
          const bx0 = minX * ps - hw, by0 = y * ps - hh;
          const bx1 = (maxX + 1) * ps - hw, by1 = (y + 1) * ps - hh;
          addBox(triangles, bx0, by0, bz0, bx1, by1, bz1);
        }
      }
    }
  }

  // Main silhouette
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[y * width + x] === 1) {
        const x0 = x * ps - hw, y0 = y * ps - hh;
        const x1 = x0 + ps, y1 = y0 + ps;
        const zB = 0, zT = thickness;

        // Top
        triangles.push({ v1: {x:x0,y:y0,z:zT}, v2: {x:x1,y:y0,z:zT}, v3: {x:x1,y:y1,z:zT}, normal: {x:0,y:0,z:1} });
        triangles.push({ v1: {x:x0,y:y0,z:zT}, v2: {x:x1,y:y1,z:zT}, v3: {x:x0,y:y1,z:zT}, normal: {x:0,y:0,z:1} });
        // Bottom
        triangles.push({ v1: {x:x0,y:y0,z:zB}, v2: {x:x1,y:y1,z:zB}, v3: {x:x1,y:y0,z:zB}, normal: {x:0,y:0,z:-1} });
        triangles.push({ v1: {x:x0,y:y0,z:zB}, v2: {x:x0,y:y1,z:zB}, v3: {x:x1,y:y1,z:zB}, normal: {x:0,y:0,z:-1} });
        // Right
        if (x === width - 1 || pixels[y * width + x + 1] === 0) {
          triangles.push({ v1: {x:x1,y:y0,z:zB}, v2: {x:x1,y:y1,z:zB}, v3: {x:x1,y:y1,z:zT}, normal: {x:1,y:0,z:0} });
          triangles.push({ v1: {x:x1,y:y0,z:zB}, v2: {x:x1,y:y1,z:zT}, v3: {x:x1,y:y0,z:zT}, normal: {x:1,y:0,z:0} });
        }
        // Left
        if (x === 0 || pixels[y * width + x - 1] === 0) {
          triangles.push({ v1: {x:x0,y:y0,z:zB}, v2: {x:x0,y:y1,z:zB}, v3: {x:x0,y:y1,z:zT}, normal: {x:-1,y:0,z:0} });
          triangles.push({ v1: {x:x0,y:y0,z:zB}, v2: {x:x0,y:y1,z:zT}, v3: {x:x0,y:y0,z:zT}, normal: {x:-1,y:0,z:0} });
        }
        // Front
        if (y === 0 || pixels[(y - 1) * width + x] === 0) {
          triangles.push({ v1: {x:x0,y:y0,z:zB}, v2: {x:x1,y:y0,z:zB}, v3: {x:x1,y:y0,z:zT}, normal: {x:0,y:-1,z:0} });
          triangles.push({ v1: {x:x0,y:y0,z:zB}, v2: {x:x1,y:y0,z:zT}, v3: {x:x0,y:y0,z:zT}, normal: {x:0,y:-1,z:0} });
        }
        // Back
        if (y === height - 1 || pixels[(y + 1) * width + x] === 0) {
          triangles.push({ v1: {x:x0,y:y1,z:zB}, v2: {x:x1,y:y1,z:zB}, v3: {x:x1,y:y1,z:zT}, normal: {x:0,y:1,z:0} });
          triangles.push({ v1: {x:x0,y:y1,z:zB}, v2: {x:x1,y:y1,z:zT}, v3: {x:x0,y:y1,z:zT}, normal: {x:0,y:1,z:0} });
        }
      }
    }
  }

  let processed = triangles;
  if (meshMode === 'simplify') processed = simplifyMesh(triangles);

  return createBinarySTL(processed);
}

function addBox(triangles: Triangle[], x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  triangles.push({ v1:{x:x0,y:y0,z:z1}, v2:{x:x1,y:y0,z:z1}, v3:{x:x1,y:y1,z:z1}, normal:{x:0,y:0,z:1} });
  triangles.push({ v1:{x:x0,y:y0,z:z1}, v2:{x:x1,y:y1,z:z1}, v3:{x:x0,y:y1,z:z1}, normal:{x:0,y:0,z:1} });
  triangles.push({ v1:{x:x0,y:y0,z:z0}, v2:{x:x1,y:y1,z:z0}, v3:{x:x1,y:y0,z:z0}, normal:{x:0,y:0,z:-1} });
  triangles.push({ v1:{x:x0,y:y0,z:z0}, v2:{x:x0,y:y1,z:z0}, v3:{x:x1,y:y1,z:z0}, normal:{x:0,y:0,z:-1} });
  triangles.push({ v1:{x:x1,y:y0,z:z0}, v2:{x:x1,y:y1,z:z0}, v3:{x:x1,y:y1,z:z1}, normal:{x:1,y:0,z:0} });
  triangles.push({ v1:{x:x1,y:y0,z:z0}, v2:{x:x1,y:y1,z:z1}, v3:{x:x1,y:y0,z:z1}, normal:{x:1,y:0,z:0} });
  triangles.push({ v1:{x:x0,y:y0,z:z0}, v2:{x:x0,y:y1,z:z0}, v3:{x:x0,y:y1,z:z1}, normal:{x:-1,y:0,z:0} });
  triangles.push({ v1:{x:x0,y:y0,z:z0}, v2:{x:x0,y:y1,z:z1}, v3:{x:x0,y:y0,z:z1}, normal:{x:-1,y:0,z:0} });
  triangles.push({ v1:{x:x0,y:y0,z:z0}, v2:{x:x1,y:y0,z:z0}, v3:{x:x1,y:y0,z:z1}, normal:{x:0,y:-1,z:0} });
  triangles.push({ v1:{x:x0,y:y0,z:z0}, v2:{x:x1,y:y0,z:z1}, v3:{x:x0,y:y0,z:z1}, normal:{x:0,y:-1,z:0} });
  triangles.push({ v1:{x:x0,y:y1,z:z0}, v2:{x:x1,y:y1,z:z0}, v3:{x:x1,y:y1,z:z1}, normal:{x:0,y:1,z:0} });
  triangles.push({ v1:{x:x0,y:y1,z:z0}, v2:{x:x1,y:y1,z:z1}, v3:{x:x0,y:y1,z:z1}, normal:{x:0,y:1,z:0} });
}

function simplifyMesh(triangles: Triangle[]): Triangle[] {
  const top: Triangle[] = [], bottom: Triangle[] = [], sides: Triangle[] = [];
  for (const t of triangles) {
    if (Math.abs(t.normal.z - 1) < 0.01) top.push(t);
    else if (Math.abs(t.normal.z + 1) < 0.01) bottom.push(t);
    else sides.push(t);
  }
  return [...mergeQuads(top), ...mergeQuads(bottom), ...sides];
}

function mergeQuads(triangles: Triangle[]): Triangle[] {
  if (triangles.length === 0) return [];
  const quads: { minX:number, minY:number, maxX:number, maxY:number, z:number, normal:Vec3 }[] = [];
  const used = new Set<number>();
  for (let i = 0; i < triangles.length; i++) {
    if (used.has(i)) continue;
    const t = triangles[i];
    const xs = [t.v1.x,t.v2.x,t.v3.x], ys = [t.v1.y,t.v2.y,t.v3.y];
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    for (let j = i + 1; j < triangles.length; j++) {
      if (used.has(j)) continue;
      const t2 = triangles[j];
      const xs2 = [t2.v1.x,t2.v2.x,t2.v3.x], ys2 = [t2.v1.y,t2.v2.y,t2.v3.y];
      if (Math.abs(minX-Math.min(...xs2))<0.001 && Math.abs(maxX-Math.max(...xs2))<0.001 &&
          Math.abs(minY-Math.min(...ys2))<0.001 && Math.abs(maxY-Math.max(...ys2))<0.001) {
        quads.push({minX,minY,maxX,maxY,z:t.v1.z,normal:{...t.normal}});
        used.add(i); used.add(j); break;
      }
    }
    if (!used.has(i)) { quads.push({minX,minY,maxX,maxY,z:t.v1.z,normal:{...t.normal}}); used.add(i); }
  }
  // Grid merge
  let tw=0,th=0;
  for (const q of quads) { tw+=q.maxX-q.minX; th+=q.maxY-q.minY; }
  const cs = Math.max(tw/quads.length, th/quads.length) * 1.1;
  const grid = new Map<string,number[]>();
  for (let i=0;i<quads.length;i++) {
    const k=`${Math.floor(quads[i].minX/cs)},${Math.floor(quads[i].minY/cs)}`;
    if(!grid.has(k)) grid.set(k,[]);
    grid.get(k)!.push(i);
  }
  const merged = new Set<number>();
  const rq: typeof quads = [];
  for (let i=0;i<quads.length;i++) {
    if(merged.has(i)) continue;
    let c={...quads[i]}; merged.add(i);
    let found=true;
    while(found){found=false;
      for(const j of grid.get(`${Math.floor(c.maxX/cs)},${Math.floor(c.minY/cs)}`)||[]){
        if(merged.has(j))continue;const b=quads[j];
        if(Math.abs(c.minY-b.minY)<0.001&&Math.abs(c.maxY-b.maxY)<0.001&&Math.abs(c.maxX-b.minX)<0.001){
          c.maxX=b.maxX;merged.add(j);found=true;break;
        }
      }
      if(!found)for(const j of grid.get(`${Math.floor(c.minX/cs)},${Math.floor(c.maxY/cs)}`)||[]){
        if(merged.has(j))continue;const b=quads[j];
        if(Math.abs(c.minX-b.minX)<0.001&&Math.abs(c.maxX-b.maxX)<0.001&&Math.abs(c.maxY-b.minY)<0.001){
          c.maxY=b.maxY;merged.add(j);found=true;break;
        }
      }
    }
    rq.push(c);
  }
  const result: Triangle[] = [];
  for (const q of rq) {
    result.push({v1:{x:q.minX,y:q.minY,z:q.z},v2:{x:q.maxX,y:q.minY,z:q.z},v3:{x:q.maxX,y:q.maxY,z:q.z},normal:q.normal});
    result.push({v1:{x:q.minX,y:q.minY,z:q.z},v2:{x:q.maxX,y:q.maxY,z:q.z},v3:{x:q.minX,y:q.maxY,z:q.z},normal:q.normal});
  }
  return result;
}

function createBinarySTL(triangles: Triangle[]): ArrayBuffer {
  const buf = new ArrayBuffer(84 + triangles.length * 50);
  const v = new DataView(buf);
  const h = 'Binary STL - Silhouette3D';
  for (let i=0;i<80;i++) v.setUint8(i, i<h.length ? h.charCodeAt(i) : 0);
  v.setUint32(80, triangles.length, true);
  let o = 84;
  for (const t of triangles) {
    v.setFloat32(o,t.normal.x,true);o+=4;v.setFloat32(o,t.normal.y,true);o+=4;v.setFloat32(o,t.normal.z,true);o+=4;
    v.setFloat32(o,t.v1.x,true);o+=4;v.setFloat32(o,t.v1.y,true);o+=4;v.setFloat32(o,t.v1.z,true);o+=4;
    v.setFloat32(o,t.v2.x,true);o+=4;v.setFloat32(o,t.v2.y,true);o+=4;v.setFloat32(o,t.v2.z,true);o+=4;
    v.setFloat32(o,t.v3.x,true);o+=4;v.setFloat32(o,t.v3.y,true);o+=4;v.setFloat32(o,t.v3.z,true);o+=4;
    v.setUint16(o,0,true);o+=2;
  }
  return buf;
}

export function generateOBJ(s: SilhouetteData, thickness=3, scale=1): string {
  const {width,height,pixels}=s; const ps=scale,hw=(width*ps)/2,hh=(height*ps)/2;
  let obj='# OBJ - Silhouette3D\nmtllib silhouette.mtl\nusemtl default\n\n';
  const vs:string[]=[],ns:string[]=[],fs:string[]=[];
  let vi=1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(pixels[y*width+x]===1){
      const x0=x*ps-hw,y0=y*ps-hh,x1=x0+ps,y1=y0+ps;
      vs.push(`v ${x0} ${y0} ${thickness}`,`v ${x1} ${y0} ${thickness}`,`v ${x1} ${y1} ${thickness}`,`v ${x0} ${y1} ${thickness}`);
      vs.push(`v ${x0} ${y0} 0`,`v ${x1} ${y0} 0`,`v ${x1} ${y1} 0`,`v ${x0} ${y1} 0`);
      ns.push('vn 0 0 1','vn 0 0 -1','vn 1 0 0','vn -1 0 0','vn 0 -1 0','vn 0 1 0');
      const b=vi;
      fs.push(`f ${b}//${b} ${b+1}//${b+1} ${b+2}//${b+2}`,`f ${b}//${b} ${b+2}//${b+2} ${b+3}//${b+3}`);
      fs.push(`f ${b+4}//${b+4} ${b+6}//${b+6} ${b+5}//${b+5}`,`f ${b+4}//${b+4} ${b+7}//${b+7} ${b+6}//${b+6}`);
      vi+=8;
    }
  }
  return obj+vs.join('\n')+'\n\n'+ns.join('\n')+'\n\n'+fs.join('\n')+'\n';
}

export function generate3MF(s: SilhouetteData, thickness=3, scale=1): Blob {
  const {width,height,pixels}=s; const ps=scale,hw=(width*ps)/2,hh=(height*ps)/2;
  const vs:number[][]=[],ts:number[][]=[];let vi=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(pixels[y*width+x]===1){
      const x0=x*ps-hw,y0=y*ps-hh,x1=x0+ps,y1=y0+ps;
      vs.push([x0,y0,thickness],[x1,y0,thickness],[x1,y1,thickness],[x0,y1,thickness]);
      vs.push([x0,y0,0],[x1,y0,0],[x1,y1,0],[x0,y1,0]);
      const b=vi;
      ts.push([b,b+1,b+2],[b,b+2,b+3],[b+4,b+6,b+5],[b+4,b+7,b+6]);
      if(x===width-1||pixels[y*width+x+1]===0)ts.push([b+1,b+5,b+6],[b+1,b+6,b+2]);
      if(x===0||pixels[y*width+x-1]===0)ts.push([b,b+6,b+4],[b,b+7,b+6]);
      if(y===0||pixels[(y-1)*width+x]===0)ts.push([b,b+4,b+5],[b,b+5,b+1]);
      if(y===height-1||pixels[(y+1)*width+x]===0)ts.push([b+3,b+7,b+6],[b+3,b+6,b+2]);
      vi+=8;
    }
  }
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n<metadata name="Application">Silhouette3D</metadata>\n<resources><object id="1" type="model"><mesh>\n<vertices>${vs.map(v=>`<vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('')}</vertices>\n<triangles>${ts.map(t=>`<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`).join('')}</triangles>\n</mesh></object></resources>\n<build><item objectid="1"/></build>\n</model>`;
  return new Blob([xml],{type:'application/xml'});
}

export function generateSTEP(s: SilhouetteData, thickness=3, scale=1, baseThickness=0): string {
  const {width,height,pixels}=s; const ps=scale,hw=(width*ps)/2,hh=(height*ps)/2;
  const rects:{x:number,y:number,w:number,h:number}[]=[];
  for(let y=0;y<height;y++){let sx=-1;
    for(let x=0;x<=width;x++){
      const f=x<width&&pixels[y*width+x]===1;
      if(f&&sx===-1)sx=x;
      else if(!f&&sx!==-1){rects.push({x:sx*ps-hw,y:y*ps-hh,w:(x-sx)*ps,h:ps});sx=-1;}
    }
  }
  // Merge vertically
  const merged:typeof rects=[];const used=new Set<number>();
  for(let i=0;i<rects.length;i++){
    if(used.has(i))continue;let c={...rects[i]};used.add(i);
    let found=true;
    while(found){found=false;
      for(let j=i+1;j<rects.length;j++){
        if(used.has(j))continue;const r=rects[j];
        if(Math.abs(r.x-c.x)<0.001&&Math.abs(r.w-c.w)<0.001&&Math.abs(r.y-(c.y+c.h))<0.001){
          c.h+=r.h;used.add(j);found=true;break;
        }
      }
    }
    merged.push(c);
  }
  if(baseThickness>0){
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const r of merged){minX=Math.min(minX,r.x);maxX=Math.max(maxX,r.x+r.w);minY=Math.min(minY,r.y);maxY=Math.max(maxY,r.y+r.h);}
    merged.push({x:minX,y:minY,w:maxX-minX,h:maxY-minY});
  }
  let step=`ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Silhouette3D'),'2;1');\nFILE_NAME('silhouette.step','${new Date().toISOString()}',('Silhouette3D'),(''),'','','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN'));\nENDSEC;\nDATA;\n`;
  let eid=1;const z0=baseThickness>0?-baseThickness:0,z1=thickness;
  for(const r of merged){
    const x0=r.x,y0=r.y,x1=r.x+r.w,y1=r.y+r.h;
    const p=[];for(let i=0;i<8;i++)p.push(eid++);
    step+=`#${p[0]}=CARTESIAN_POINT('',(${x0},${y0},${z0}));\n#${p[1]}=CARTESIAN_POINT('',(${x1},${y0},${z0}));\n`;
    step+=`#${p[2]}=CARTESIAN_POINT('',(${x1},${y1},${z0}));\n#${p[3]}=CARTESIAN_POINT('',(${x0},${y1},${z0}));\n`;
    step+=`#${p[4]}=CARTESIAN_POINT('',(${x0},${y0},${z1}));\n#${p[5]}=CARTESIAN_POINT('',(${x1},${y0},${z1}));\n`;
    step+=`#${p[6]}=CARTESIAN_POINT('',(${x1},${y1},${z1}));\n#${p[7]}=CARTESIAN_POINT('',(${x0},${y1},${z1}));\n`;
    const d1=eid++,d2=eid++,d3=eid++;
    step+=`#${d1}=DIRECTION('',(1,0,0));\n#${d2}=DIRECTION('',(0,1,0));\n#${d3}=DIRECTION('',(0,0,1));\n`;
    const ori=eid++,blk=eid++;
    step+=`#${ori}=AXIS2_PLACEMENT_3D('',#${p[0]},#${d3},#${d1});\n#${blk}=BLOCK('',#${ori},${r.w},${r.h},${z1-z0});\n`;
  }
  step+=`ENDSEC;\nEND-ISO-10303-21;\n`;
  return step;
}

export function downloadFile(content: string | Blob, filename: string, mime='application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content],{type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

export function generateThreeGeometry(
  silhouette: SilhouetteData,
  thickness=3, scale=1, baseThickness=0, baseMode: 'bounding' | 'cover' = 'bounding'
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
  const {width,height,pixels}=silhouette;
  let vc=0;
  const ps=scale,hw=(width*ps)/2,hh=(height*ps)/2;
  const pos:number[]=[],nor:number[]=[],idx:number[]=[];

  // Base
  if(baseThickness>0){
    if(baseMode === 'bounding'){
      let minX=width,maxX=0,minY=height,maxY=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        if(pixels[y*width+x]===1){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
      }
      if(maxX>=minX&&maxY>=minY){
        const bx0=minX*ps-hw,by0=minY*ps-hh,bx1=(maxX+1)*ps-hw,by1=(maxY+1)*ps-hh;
        const bz0=-baseThickness,bz1=0;
        addBoxGeo(pos,nor,idx,vc,bx0,by0,bz0,bx1,by1,bz1);vc+=24;
      }
    } else {
      // Cover mode
      const bz0=-baseThickness,bz1=0;
      for(let y=0;y<height;y++){
        let minX=-1,maxX=-1;
        for(let x=0;x<width;x++){
          if(pixels[y*width+x]===1){
            if(minX===-1)minX=x;
            maxX=x;
          }
        }
        if(minX!==-1&&maxX!==-1){
          const bx0=minX*ps-hw,by0=y*ps-hh,bx1=(maxX+1)*ps-hw,by1=(y+1)*ps-hh;
          addBoxGeo(pos,nor,idx,vc,bx0,by0,bz0,bx1,by1,bz1);vc+=24;
        }
      }
    }
  }

  // Main
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(pixels[y*width+x]===1){
      const x0=x*ps-hw,y0=y*ps-hh,x1=x0+ps,y1=y0+ps;
      const zB=0,zT=thickness;
      // Top
      let s=vc;pos.push(x0,y0,zT,x1,y0,zT,x1,y1,zT,x0,y1,zT);nor.push(0,0,1,0,0,1,0,0,1,0,0,1);idx.push(s,s+1,s+2,s,s+2,s+3);vc+=4;
      // Bottom
      s=vc;pos.push(x0,y0,zB,x1,y0,zB,x1,y1,zB,x0,y1,zB);nor.push(0,0,-1,0,0,-1,0,0,-1,0,0,-1);idx.push(s,s+2,s+1,s,s+3,s+2);vc+=4;
      // Right
      if(x===width-1||pixels[y*width+x+1]===0){s=vc;pos.push(x1,y0,zB,x1,y1,zB,x1,y1,zT,x1,y0,zT);nor.push(1,0,0,1,0,0,1,0,0,1,0,0);idx.push(s,s+1,s+2,s,s+2,s+3);vc+=4;}
      // Left
      if(x===0||pixels[y*width+x-1]===0){s=vc;pos.push(x0,y0,zB,x0,y1,zB,x0,y1,zT,x0,y0,zT);nor.push(-1,0,0,-1,0,0,-1,0,0,-1,0,0);idx.push(s,s+2,s+1,s,s+3,s+2);vc+=4;}
      // Front
      if(y===0||pixels[(y-1)*width+x]===0){s=vc;pos.push(x0,y0,zB,x1,y0,zB,x1,y0,zT,x0,y0,zT);nor.push(0,-1,0,0,-1,0,0,-1,0,0,-1,0);idx.push(s,s+2,s+1,s,s+3,s+2);vc+=4;}
      // Back
      if(y===height-1||pixels[(y+1)*width+x]===0){s=vc;pos.push(x0,y1,zB,x1,y1,zB,x1,y1,zT,x0,y1,zT);nor.push(0,1,0,0,1,0,0,1,0,0,1,0);idx.push(s,s+1,s+2,s,s+2,s+3);vc+=4;}
    }
  }
  return {positions:new Float32Array(pos),normals:new Float32Array(nor),indices:new Uint32Array(idx)};
}

function addBoxGeo(pos:number[],nor:number[],idx:number[],vc:number,x0:number,y0:number,z0:number,x1:number,y1:number,z1:number){
  let s=vc;pos.push(x0,y0,z1,x1,y0,z1,x1,y1,z1,x0,y1,z1);nor.push(0,0,1,0,0,1,0,0,1,0,0,1);idx.push(s,s+1,s+2,s,s+2,s+3);
  s=vc+4;pos.push(x0,y0,z0,x1,y0,z0,x1,y1,z0,x0,y1,z0);nor.push(0,0,-1,0,0,-1,0,0,-1,0,0,-1);idx.push(s,s+2,s+1,s,s+3,s+2);
  s=vc+8;pos.push(x1,y0,z0,x1,y1,z0,x1,y1,z1,x1,y0,z1);nor.push(1,0,0,1,0,0,1,0,0,1,0,0);idx.push(s,s+1,s+2,s,s+2,s+3);
  s=vc+12;pos.push(x0,y0,z0,x0,y1,z0,x0,y1,z1,x0,y0,z1);nor.push(-1,0,0,-1,0,0,-1,0,0,-1,0,0);idx.push(s,s+2,s+1,s,s+3,s+2);
  s=vc+16;pos.push(x0,y0,z0,x1,y0,z0,x1,y0,z1,x0,y0,z1);nor.push(0,-1,0,0,-1,0,0,-1,0,0,-1,0);idx.push(s,s+1,s+2,s,s+2,s+3);
  s=vc+20;pos.push(x0,y1,z0,x1,y1,z0,x1,y1,z1,x0,y1,z1);nor.push(0,1,0,0,1,0,0,1,0,0,1,0);idx.push(s,s+2,s+1,s,s+3,s+2);
}
