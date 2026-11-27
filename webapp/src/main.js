import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { lua, lauxlib, lualib, to_luastring } from 'fengari';
import * as interop from 'fengari-interop';
import JSZip from 'jszip';
import exportRuntimeHtml from '../export-template/index.html?raw';
import exportRuntimeMain from '../export-template/src/main.js?raw';
import exportRuntimeCss from '../export-template/src/style.css?raw';
import exportPackage from '../export-template/package.json?raw';
import exportWorkflow from '../export-template/build-android-apk.yml?raw';
import exportReadme from '../export-template/README-exportar-APK.md?raw';
import { createIcons, FolderKanban, PanelsTopLeft, Box, CodeXml, Save, Play, Plus, PersonStanding, Crosshair, Lightbulb, FolderOpen, ChevronRight, Trash2, ChevronLeft, Cylinder, Circle, Sun, Image, Move3D, Rotate3D, Scaling, ScanEye, Layers3, Square, X, Eye, MousePointer2, Video, Volume2, Upload, Boxes, Type } from 'lucide';
import './style.css';

const $ = (id) => document.getElementById(id);
const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
const TAP_SLOP = IS_TOUCH ? 16 : 8;
const TOUCH_SCALE = IS_TOUCH ? 1.35 : 1;
// Diálogos propios: sustituyen prompt/alert/confirm, que en móvil bloquean la UI y son difíciles de tocar.
const ui = {
  host: null,
  open(build) {
    if (!this.host) {
      this.host = document.createElement('div');
      this.host.className = 'mf-overlay hidden';
      document.body.appendChild(this.host);
    }
    return new Promise((resolve) => {
      const host = this.host;
      host.replaceChildren();
      const card = document.createElement('div');
      card.className = 'mf-dialog';
      host.appendChild(card);
      host.classList.remove('hidden');
      const onKey = (e) => { if (e.key === 'Escape') done(null); };
      const done = (value) => {
        document.removeEventListener('keydown', onKey);
        host.classList.add('hidden');
        host.replaceChildren();
        resolve(value);
      };
      document.addEventListener('keydown', onKey);
      build(card, done);
    });
  },
  btn(label, cls, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('click', fn);
    return b;
  },
  actions(...items) {
    const row = document.createElement('div');
    row.className = 'mf-actions';
    row.append(...items);
    return row;
  },
  text(title, value = '', allowEmpty = false) {
    return this.open((card, done) => {
      const h = document.createElement('h3');
      h.textContent = title;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.maxLength = 60;
      const ok = () => { const v = input.value.trim(); done((v || allowEmpty) ? v : null); };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
      card.append(h, input, this.actions(this.btn('Cancelar', '', () => done(null)), this.btn('Aceptar', 'primary', ok)));
      setTimeout(() => { input.focus(); input.select(); }, 30);
    });
  },
  confirm(message, okLabel = 'Eliminar') {
    return this.open((card, done) => {
      const p = document.createElement('p');
      p.textContent = message;
      card.append(p, this.actions(this.btn('Cancelar', '', () => done(false)), this.btn(okLabel, 'danger', () => done(true))));
    });
  },
  notify(message) {
    return this.open((card, done) => {
      const p = document.createElement('p');
      p.textContent = message;
      card.append(p, this.actions(this.btn('Entendido', 'primary', () => done(true))));
    });
  },
  choose(title, options) {
    return this.open((card, done) => {
      const h = document.createElement('h3');
      h.textContent = title;
      const list = document.createElement('div');
      list.className = 'mf-choices';
      options.forEach((label, i) => list.appendChild(this.btn(label, '', () => done(i))));
      card.append(h, list, this.actions(this.btn('Cancelar', '', () => done(null))));
    });
  }
};
const icons = { FolderKanban, PanelsTopLeft, Box, CodeXml, Save, Play, Plus, PersonStanding, Crosshair, Lightbulb, FolderOpen, ChevronRight, Trash2, ChevronLeft, Cylinder, Circle, Sun, Image, Move3D, Rotate3D, Scaling, ScanEye, Layers3, Square, X, Eye, MousePointer2, Video, Volume2, Upload, Boxes, Type };
const viewport = $('viewport');
const canvas = $('scene-canvas');
const scene = new THREE.Scene();
const hudScene = new THREE.Scene();hudScene.add(new THREE.AmbientLight(0xffffff,2));
const hudCamera = new THREE.OrthographicCamera(-500,500,300,-300,0.1,1000);hudCamera.position.z=500;
scene.background = new THREE.Color('#000000');
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
camera.position.set(7, 6, 9);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.target.set(0, 0.7, 0);
const transform = new TransformControls(camera, renderer.domElement);
transform.setSize(0.9 * TOUCH_SCALE);
transform.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value && !playMode && areaMode==='3d'; });
transform.addEventListener('objectChange', () => { refreshInspector(); markDirty(); });
scene.add(transform.getHelper());
let transformHost=scene;

scene.add(new THREE.HemisphereLight(0xc8dcff, 0x202b37, 2.0));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
keyLight.position.set(5, 9, 4); keyLight.castShadow = true; scene.add(keyLight);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: '#1b242e', roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.025; floor.receiveShadow = true; floor.name = 'Suelo'; scene.add(floor);
const grid = new THREE.GridHelper(40, 40, '#4c6579', '#283746'); grid.position.y = 0; scene.add(grid);
const axes = new THREE.AxesHelper(2.5); axes.position.y = 0.015; scene.add(axes);

const objects = [];
let selected = null;
let playMode = false;
let count = 0;
let activeProject = null;
let autoSaveTimer = 0;
let areaMode = '3d';
let playCharacter = null;
let playYaw = 0;
let playPitch = 0;
let playSnapshot = null;
let activeSceneId = null;
let activeMaterialId = null;
let materialCache = new Map();
const pressedKeys = new Set();
const joystick = { x: 0, y: 0 };
const savedProjects = JSON.parse(localStorage.getItem('mobiforge-projects') || '[]');
const assetDb = new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error('IndexedDB no disponible'));return;}const req=indexedDB.open('mobiforge-assets',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
async function putAsset(key,blob){const db=await assetDb;return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(blob,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
async function getAsset(key){const db=await assetDb;return new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly'),req=tx.objectStore('files').get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
async function deleteProjectAssets(id){try{const db=await assetDb;await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite'),req=tx.objectStore('files').openCursor();req.onsuccess=()=>{const c=req.result;if(!c)return;if(String(c.key).startsWith(`${id}:`))c.delete();c.continue();};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch{}}
const defaultColor = '#44d7a0';
const primitiveColor = { Cube: '#43d7a0', Sphere: '#649cff', Cylinder: '#ffad5a', Light: '#ffe273' };

function makeCharacter(kind) {
  const color=kind==='Player1P'?'#5686b9':'#48d6a5';
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.38,1.05,6,14),new THREE.MeshStandardMaterial({color,roughness:.65}));
  body.castShadow=true;body.receiveShadow=true;body.userData.color=color;return body;
}
function meshFor(kind, color = primitiveColor[kind] || defaultColor) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.12 });
  let geometry;
  if (kind === 'Sphere') geometry = new THREE.SphereGeometry(0.65, 32, 20);
  else if (kind === 'Cylinder') geometry = new THREE.CylinderGeometry(0.55, 0.55, 1.2, 32);
  else geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
const hudKinds=new Set(['Sprite','Button2D','Label2D','Image']);
function isHudObject(obj){return hudKinds.has(obj?.userData?.kind);}
function placeHudNode(obj){const width=Math.max(1,viewport.clientWidth),height=Math.max(1,viewport.clientHeight),n=objects.filter(isHudObject).length;const boxW=obj.userData.kind==='Button2D'?190:obj.userData.kind==='Label2D'?200:160,boxH=obj.userData.kind==='Button2D'?72:obj.userData.kind==='Label2D'?60:140;obj.position.set(-width/2+Math.min(width*.29,boxW/2+22)+(n%2)*Math.min(width*.43,boxW+28),height/2-boxH/2-20-Math.floor(n/2)*(boxH+22),0);}
function addObject(kind='Cube',name=''){
  count++;let obj;
  if(kind==='Light'){obj=new THREE.PointLight('#ffe273',16,8,2);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.14,16,12),new THREE.MeshBasicMaterial({color:'#ffe273'}));obj.add(bulb);obj.userData.color='#ffe273';}
  else if(['Player1P','Player3P','CharacterBody3D','CharacterBody'].includes(kind)){obj=makeCharacter(kind);obj.userData.color=kind==='Player1P'?'#5686b9':'#48d6a5';kind='CharacterBody3D';}
  else if(hudKinds.has(kind)){
    const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d');
    if(kind==='Button2D'){ctx.fillStyle='#39d39e';ctx.beginPath();ctx.roundRect(8,8,496,176,36);ctx.fill();ctx.fillStyle='#08251b';ctx.font='bold 56px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BOTÓN',256,96);}
    else if(kind==='Label2D'){ctx.fillStyle='#fff';ctx.font='bold 54px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Texto HUD',256,96);}
    else {ctx.fillStyle='#f7c65f';ctx.fillRect(24,24,464,144);}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    obj=new THREE.Mesh(new THREE.PlaneGeometry(kind==='Button2D'?190:kind==='Label2D'?200:160,kind==='Button2D'?72:kind==='Label2D'?60:140),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));obj.userData.hudBaseTexture=tex;obj.userData.color=kind==='Button2D'?'#39d39e':'#f7c65f';obj.userData.hudText=kind==='Button2D'?'BOTÓN':kind==='Label2D'?'Texto HUD':'';
  }
  else if(['Camera','Audio','Node3D'].includes(kind)){const g=new THREE.Group(),color=kind==='Camera'?'#65a5ff':kind==='Audio'?'#db9bff':'#aebdcc';const cube=new THREE.Mesh(new THREE.BoxGeometry(.65,.48,.42),new THREE.MeshStandardMaterial({color}));cube.castShadow=true;g.add(cube);const point=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8),new THREE.MeshBasicMaterial({color:'#fff'}));point.position.z=-.3;g.add(point);obj=g;obj.userData.color=color;}
  else {obj=meshFor(kind);obj.userData.color=primitiveColor[kind]||defaultColor;}
  const labels={Light:'Luz',Sphere:'Esfera',Cylinder:'Cilindro',Sprite:'Sprite2D',Button2D:'Botón HUD',Label2D:'Texto HUD',Image:'Imagen',Camera:'Cámara',Audio:'Audio',Node3D:'Nodo 3D',CharacterBody3D:'CharacterBody3D',Model:'Modelo 3D',Player1P:'CharacterBody3D',Player3P:'CharacterBody3D'};
  obj.name=name||`${labels[kind]||'Cubo'} ${count}`;obj.userData.kind=kind;obj.userData.script='';obj.userData.materialId=null;
  if(isHudObject(obj)){hudScene.add(obj);placeHudNode(obj);}else{const spread=Math.min(objects.length*.55,3);obj.position.set((objects.length%3-1)*1.5,kind==='Light'?2.5:.65,-spread);scene.add(obj);}
  objects.push(obj);selectObject(obj);updateHierarchy();markDirty();return obj.name;
}
function selectObject(obj) {
  selected = obj || null;
  transform.detach();
  if (selected && selected.userData.kind !== 'Light') transform.attach(selected);
  else if (selected) transform.attach(selected);
  updateHierarchy(); refreshInspector();syncSelectedScript(true);
}
function updateHierarchy() {
  const list = $('hierarchy'); list.replaceChildren();
  $('object-count').textContent = String(objects.length);
  objects.forEach((obj) => {
    const row = document.createElement('button'); row.className = `hierarchy-row${obj === selected ? ' active' : ''}${isHudObject(obj)?' hud-node':''}`;
    const iconMap={Light:'sun',Sphere:'circle',Cylinder:'cylinder',Sprite:'image',Button2D:'mouse-pointer-2',Label2D:'type',Image:'image',Camera:'video',Audio:'volume-2',Node3D:'boxes',CharacterBody3D:'person-standing',Model:'box'};const icon=iconMap[obj.userData.kind]||((obj.userData.kind||'').startsWith('Player')?'person-standing':'box');
    row.innerHTML = `<i class="object-icon" data-lucide="${icon}"></i><span class="object-name"></span><span class="visibility"><i data-lucide="eye"></i></span>`;
    row.querySelector('.object-name').textContent = obj.name;
    row.addEventListener('click',()=>{if(isHudObject(obj)!==(areaMode==='2d'))setArea(isHudObject(obj)?'2d':'3d');selectObject(obj);});list.appendChild(row);
  });
  createIcons({ icons });
}
function projectMaterials(){if(!activeProject)return[];if(!Array.isArray(activeProject.materials))activeProject.materials=[];return activeProject.materials;}
function materialDef(id){return projectMaterials().find(m=>m.id===id)||null;}
function eachMesh(obj,fn){if(!obj)return;obj.traverse(n=>{if(n.isMesh)fn(n);});}
function assignProjectMaterial(obj,id){if(!obj)return;const def=materialDef(id);obj.userData.materialId=def?.id||null;if(!def)return;eachMesh(obj,mesh=>{const prior=mesh.material;const maps=Array.isArray(prior)?prior.map(m=>m?.map||null):[prior?.map||null];const make=map=>new THREE.MeshStandardMaterial({name:def.name,color:def.color,roughness:def.roughness,metalness:def.metalness,map,transparent:!!map,side:THREE.DoubleSide});mesh.material=Array.isArray(prior)?prior.map((m,i)=>make(maps[i])):make(maps[0]);});}
function syncMaterialValues(obj,id){const def=materialDef(id);if(!def)return;eachMesh(obj,m=>{const mats=Array.isArray(m.material)?m.material:[m.material];for(const mat of mats){if(mat?.color)mat.color.set(def.color);if('roughness'in mat)mat.roughness=def.roughness;if('metalness'in mat)mat.metalness=def.metalness;mat.needsUpdate=true;}});}
function refreshMaterialInspector(){const select=$('material-select'),list=projectMaterials();select.disabled=!selected;$('new-material').disabled=!selected;select.replaceChildren();const own=document.createElement('option');own.value='';own.textContent='Material propio';select.appendChild(own);for(const m of list){const o=document.createElement('option');o.value=m.id;o.textContent=m.name;select.appendChild(o);}const id=selected?.userData.materialId||'';select.value=id;activeMaterialId=id||null;const def=id?materialDef(id):null;const color=def?.color||selected?.userData.color||defaultColor;$('material-name').disabled=!selected||!def;$('material-name').value=def?.name||'';$('material-color').disabled=!selected;$('material-color').value=color;$('color-value').textContent=color.toUpperCase();$('material-roughness').disabled=!selected||!def;$('material-metalness').disabled=!selected||!def;$('material-roughness').value=String(def?.roughness??.5);$('material-metalness').value=String(def?.metalness??.1);$('roughness-value').textContent=Number(def?.roughness??.5).toFixed(2);$('metalness-value').textContent=Number(def?.metalness??.1).toFixed(2);}
function refreshHudVisual(obj,text){if(!obj?.material?.map?.image||obj.userData.hudImageAssetKey)return;const c=obj.userData.hudBaseTexture?.image||obj.material.map.image,ctx=c.getContext?.('2d');if(!ctx)return;ctx.clearRect(0,0,c.width,c.height);if(obj.userData.kind==='Button2D'){ctx.fillStyle='#39d39e';ctx.beginPath();ctx.roundRect(8,8,496,176,36);ctx.fill();ctx.fillStyle='#08251b';ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(text||''),256,96,460);}else{ctx.fillStyle='#ffffff';ctx.font='bold 52px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(text||''),256,96,500);}obj.material.map.needsUpdate=true;}
function refreshInspector(){const disabled=!selected;$('hud-properties').classList.toggle('hidden',!selected||!['Button2D','Label2D'].includes(selected.userData.kind));$('hud-text').value=selected?.userData.hudText||'';$('hud-image-name').textContent=selected?.userData.hudImageName||'Sin imagen';$('object-name').disabled=disabled;$('object-name').value=selected?.name||'Sin selección';$('edit-node-script').disabled=disabled;const vals={px:selected?.position.x,py:selected?.position.y,pz:selected?.position.z,rx:selected?THREE.MathUtils.radToDeg(selected.rotation.x):0,ry:selected?THREE.MathUtils.radToDeg(selected.rotation.y):0,rz:selected?THREE.MathUtils.radToDeg(selected.rotation.z):0,sx:selected?.scale.x,sy:selected?.scale.y,sz:selected?.scale.z};for(const[id,val]of Object.entries(vals)){const el=$(id);el.disabled=disabled;if(document.activeElement!==el)el.value=Number(val??(id.startsWith('s')?1:0)).toFixed(2);}syncSelectedScript();refreshMaterialInspector();}
function sceneStorageKey(project,sceneId){return `mobiforge-scene:${project.id}:${sceneId}`;}
function markDirty(){if(playMode)return;$('save-state').textContent='● Guardando…';$('save-state').classList.add('dirty');$('status-text').textContent='● CAMBIOS';if(activeProject){clearTimeout(autoSaveTimer);autoSaveTimer=setTimeout(saveScene,450);}}
function saveScene(){try{if(!activeProject||!activeSceneId||playMode)return;const data=objects.map(o=>({name:o.name,kind:o.userData.kind,pos:o.position.toArray(),rot:o.rotation.toArray(),scale:o.scale.toArray(),color:o.userData.color||null,script:o.userData.script||'',hudText:o.userData.hudText||'',hudImageAssetKey:o.userData.hudImageAssetKey||null,hudImageName:o.userData.hudImageName||'',materialId:o.userData.materialId||null,assetExt:o.userData.assetExt||'',assetKey:o.userData.assetKey||null,assetName:o.userData.assetName||''}));localStorage.setItem(sceneStorageKey(activeProject,activeSceneId),JSON.stringify(data));activeProject.currentSceneId=activeSceneId;activeProject.updated=Date.now();persistProjects();$('save-state').textContent='● Guardado local';$('save-state').classList.remove('dirty');$('status-text').textContent='● GUARDADO';}catch(err){$('status-text').textContent='● ERROR AL GUARDAR';$('save-state').textContent='● No se pudo guardar';}}
async function parseModelFile(file,ext){const e=String(ext||'').toLowerCase();if(e==='obj')return new OBJLoader().parse(await file.text());if(e==='fbx')return new FBXLoader().parse(await file.arrayBuffer(),'');const buffer=await file.arrayBuffer();const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,'',resolve,reject));return gltf.scene;}
async function restoreAsset(item){const blob=await getAsset(item.assetKey);if(!blob)throw new Error(`No existe el archivo ${item.assetName||item.name}`);const url=URL.createObjectURL(blob);let obj;const ext=(item.assetExt||item.assetName?.split('.').pop()||'').toLowerCase();if(item.kind==='Image'){const tex=await new Promise((resolve,reject)=>new THREE.TextureLoader().load(url,resolve,undefined,reject));tex.colorSpace=THREE.SRGBColorSpace;obj=new THREE.Mesh(new THREE.PlaneGeometry(160,140),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));}else{obj=await parseModelFile(blob,ext);obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});}URL.revokeObjectURL(url);obj.name=item.name;obj.userData.kind=item.kind;obj.userData.script=item.script||'';obj.userData.color=item.color||null;obj.userData.materialId=item.materialId||null;obj.userData.hudText=item.hudText||'';obj.userData.hudImageAssetKey=item.hudImageAssetKey||null;obj.userData.hudImageName=item.hudImageName||'';obj.userData.assetKey=item.assetKey;obj.userData.assetExt=ext;obj.userData.assetName=item.assetName;obj.position.fromArray(item.pos||[0,0,0]);obj.rotation.set(...(item.rot||[0,0,0]));obj.scale.fromArray(item.scale||[1,1,1]);(isHudObject(obj)?hudScene:scene).add(obj);objects.push(obj);if(obj.userData.materialId)assignProjectMaterial(obj,obj.userData.materialId);if(obj.userData.hudText)refreshHudVisual(obj,obj.userData.hudText);if(obj.userData.hudImageAssetKey)await applyHudImageKey(obj,obj.userData.hudImageAssetKey,obj.userData.hudImageName);}
async function loadScene(){try{if(!activeProject||!activeSceneId)return false;let raw=localStorage.getItem(sceneStorageKey(activeProject,activeSceneId));if(!raw&&activeProject.scenes?.length===1){raw=localStorage.getItem(`mobiforge-scene:${activeProject.id}`);if(raw)localStorage.setItem(sceneStorageKey(activeProject,activeSceneId),raw);}const data=JSON.parse(raw||'null');if(!Array.isArray(data))return false;clearObjects();for(const item of data){if(item.assetKey){await restoreAsset(item);continue;}const name=addObject(item.kind||'Cube',item.name),obj=objects.find(x=>x.name===name);if(!obj)continue;obj.position.fromArray(item.pos||[0,.65,0]);obj.rotation.set(...(item.rot||[0,0,0]));obj.scale.fromArray(item.scale||[1,1,1]);obj.userData.script=item.script||'';obj.userData.materialId=item.materialId||null;obj.userData.hudText=item.hudText||obj.userData.hudText||'';obj.userData.hudImageAssetKey=item.hudImageAssetKey||null;obj.userData.hudImageName=item.hudImageName||'';obj.userData.assetExt=item.assetExt||'';if(obj.material?.color&&item.color){obj.material.color.set(item.color);obj.userData.color=item.color;}if(obj.userData.materialId)assignProjectMaterial(obj,obj.userData.materialId);if(obj.userData.hudText)refreshHudVisual(obj,obj.userData.hudText);if(obj.userData.hudImageAssetKey)await applyHudImageKey(obj,obj.userData.hudImageAssetKey,obj.userData.hudImageName);}if(objects.length)selectObject(objects[0]);else{updateHierarchy();refreshInspector();}$('save-state').textContent='● Guardado local';$('save-state').classList.remove('dirty');return true;}catch(err){console.error('No se pudo cargar la escena',err);$('status-text').textContent='● ERROR AL CARGAR';return false;}}
function removeObject(obj,silent=false){if(!obj)return;if(selected===obj){transform.detach();selected=null;}(isHudObject(obj)?hudScene:scene).remove(obj);const i=objects.indexOf(obj);if(i>=0)objects.splice(i,1);obj.traverse(n=>{n.geometry?.dispose?.();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose());else n.material?.dispose?.();});updateHierarchy();refreshInspector();if(!silent)markDirty();}
function clearObjects(){transform.detach();for(const o of [...objects])removeObject(o,true);selected=null;updateHierarchy();refreshInspector();}
function populateScenes(){const select=$('scene-select');select.replaceChildren();for(const s of activeProject?.scenes||[]){const option=document.createElement('option');option.value=s.id;option.textContent=s.name;select.appendChild(option);}select.value=activeSceneId||'';}
function ensureProjectScenes(project){if(!Array.isArray(project.scenes)||!project.scenes.length)project.scenes=[{id:'main',name:'Main'}];const main=project.scenes.find(s=>s.id==='main')||project.scenes[0];main.name='Main';if(!project.scenes.some(s=>s.id==='player'))project.scenes.push({id:'player',name:'Player'});else project.scenes.find(s=>s.id==='player').name='Player';activeSceneId=project.currentSceneId&&project.scenes.some(s=>s.id===project.currentSceneId)?project.currentSceneId:'main';project.currentSceneId=activeSceneId;populateScenes();}
async function switchScene(id){if(!id||id===activeSceneId)return;saveScene();activeSceneId=id;activeProject.currentSceneId=id;persistProjects();populateScenes();clearObjects();if(!await loadScene())$('save-state').textContent='● Escena nueva';setArea('3d');}
$('scene-select').addEventListener('change',()=>switchScene($('scene-select').value));
async function createScene(){if(!activeProject)return;const name=await ui.text('Nueva escena','Escena nueva');if(!name?.trim())return;saveScene();const item={id:`s-${Date.now()}`,name:name.trim()};activeProject.scenes.push(item);activeSceneId=item.id;activeProject.currentSceneId=item.id;persistProjects();populateScenes();clearObjects();saveScene();}
async function insertSceneIntoCurrent(){if(!activeProject||!activeSceneId)return;saveScene();const choices=(activeProject.scenes||[]).filter(s=>s.id!==activeSceneId);if(!choices.length){ui.notify('Crea otra escena y añade contenido para poder insertarla aquí.');return;}const index=await ui.choose('Insertar como copia editable',choices.map(s=>s.name));if(index===null)return;const source=choices[index];if(!source){ui.notify('Número de escena no válido.');return;}const raw=localStorage.getItem(sceneStorageKey(activeProject,source.id));let records;try{records=JSON.parse(raw||'[]');}catch{records=[];}if(!Array.isArray(records)||!records.length){ui.notify(`La escena «${source.name}» no tiene contenido guardado.`);return;}const sourceLabel=source.name;let inserted=0;for(const rec of records){try{let obj;if(rec.assetKey){await restoreAsset(rec);obj=objects[objects.length-1];}else{const baseName=rec.name||'Objeto';let uniqueName=baseName,suffix=2;while(objects.some(o=>o.name===uniqueName))uniqueName=`${baseName} ${suffix++}`;addObject(rec.kind||'Cube',uniqueName);obj=selected;if(!obj)continue;obj.position.fromArray(rec.pos||[0,.65,0]);obj.rotation.set(...(rec.rot||[0,0,0]));obj.scale.fromArray(rec.scale||[1,1,1]);obj.userData.script=rec.script||'';obj.userData.materialId=rec.materialId||null;obj.userData.hudText=rec.hudText||obj.userData.hudText||'';obj.userData.hudImageAssetKey=rec.hudImageAssetKey||null;obj.userData.hudImageName=rec.hudImageName||'';if(obj.material?.color&&rec.color){obj.material.color.set(rec.color);obj.userData.color=rec.color;}if(obj.userData.materialId)assignProjectMaterial(obj,obj.userData.materialId);if(obj.userData.hudText)refreshHudVisual(obj,obj.userData.hudText);if(obj.userData.hudImageAssetKey)await applyHudImageKey(obj,obj.userData.hudImageAssetKey,obj.userData.hudImageName);}if(!obj)continue;const base=rec.name||obj.name;let candidate=`${sourceLabel} · ${base}`,n=2;while(objects.some(o=>o!==obj&&o.name===candidate))candidate=`${sourceLabel} · ${base} ${n++}`;obj.name=candidate;obj.position.x+=isHudObject(obj)?70:3.5;obj.updateMatrixWorld(true);inserted++;}catch(err){console.error('No se pudo insertar objeto de escena',rec,err);}}updateHierarchy();if(inserted){selectObject(objects.at(-1));markDirty();$('status-text').textContent=`● ${inserted} elementos insertados`;ui.notify(`Inserté ${inserted} elemento(s) de «${sourceLabel}» como copias editables en esta escena. Los cambios posteriores en la escena original no modifican esta copia.`);}else ui.notify('No se pudo insertar contenido de esa escena.');}
$('insert-scene-button').addEventListener('click',insertSceneIntoCurrent);
$('new-scene-top').addEventListener('click',createScene);
for (const axis of ['px','py','pz','rx','ry','rz','sx','sy','sz']) $(axis).addEventListener('change', () => {
  if (!selected) return; const value = Number($(axis).value) || 0;
  if (axis[0] === 'p') selected.position[axis[1]] = value;
  if (axis[0] === 'r') selected.rotation[axis[1]] = THREE.MathUtils.degToRad(value);
  if (axis[0] === 's') selected.scale[axis[1]] = Math.max(0.01, value);
  markDirty();
});
$('object-name').addEventListener('change', () => { if (selected && $('object-name').value.trim()) { selected.name = $('object-name').value.trim(); updateHierarchy(); markDirty(); } });
$('material-color').addEventListener('input', () => { if (!selected || !selected.material?.color) return; selected.material.color.set($('material-color').value); selected.userData.color = $('material-color').value; $('color-value').textContent = $('material-color').value.toUpperCase(); markDirty(); });
function syncSelectedScript(force=false){const field=$('lua-code');if(!field)return;field.disabled=!selected;if(force||document.activeElement!==field)field.value=selected?.userData.script||'';$('lua-run').disabled=!selected;}
$('lua-code').addEventListener('input',()=>{if(selected){selected.userData.script=$('lua-code').value;markDirty();}});
$('lua-run').addEventListener('click',()=>{if(selected?.userData.script?.trim())executeLua(selected.userData.script,selected);});
$('edit-node-script').addEventListener('click',()=>{if(!selected)return;setArea('script');$('lua-code').focus();});
$('delete-button').addEventListener('click', () => removeObject(selected));
$('save-button').addEventListener('click', saveScene);
$('play-button').addEventListener('click', () => togglePlay());
$('exit-play').addEventListener('click', () => togglePlay(false));

for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => { for (const b of document.querySelectorAll('[data-mode]')) b.classList.toggle('active', b === button); transform.setMode(button.dataset.mode); });
$('focus-button').addEventListener('click', () => { if (!selected) return; orbit.target.copy(selected.position); const offset = camera.position.clone().sub(orbit.target); if (offset.length() < 0.5) offset.set(5,4,6); camera.position.copy(orbit.target).add(offset); });

// Tap an object in the viewport to select it; empty-space drag remains orbit navigation.
const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let downPoint = null;function raycasterHits(ndc,cam,items){raycaster.setFromCamera(ndc,cam);return raycaster.intersectObjects(items,true);}
canvas.addEventListener('pointerdown', (e) => { downPoint = { x:e.clientX, y:e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!downPoint || Math.hypot(e.clientX-downPoint.x, e.clientY-downPoint.y) > TAP_SLOP || transform.dragging) return;
  const rect = canvas.getBoundingClientRect(); pointer.set((e.clientX-rect.left)/rect.width*2-1, -((e.clientY-rect.top)/rect.height)*2+1);const useHud=areaMode==='2d'||playMode;const hudHits=useHud?raycasterHits(pointer,hudCamera,objects.filter(isHudObject)):[];const hits=hudHits.length?hudHits:(!useHud||playMode?raycasterHits(pointer,camera,objects.filter(o=>!isHudObject(o))):[]);if(!hits.length)return;
  let target = hits[0].object; while (target.parent && !objects.includes(target)) target=target.parent; if(!objects.includes(target))return;
  if(playMode){if(target.userData.kind==='Button2D'&&target.userData.script?.trim())executeLua(target.userData.script,target);return;}selectObject(target);
});
$('empty-hint').hidden = true;
async function importFiles(files){for(const file of [...files]){try{const ext=file.name.split('.').pop().toLowerCase(),key=`${activeProject.id}:${activeSceneId}:${Date.now()}-${Math.random().toString(36).slice(2,6)}`;if(['png','jpg','jpeg','webp'].includes(ext)){await putAsset(key,file);setArea('2d');const url=URL.createObjectURL(file),tex=await new Promise((resolve,reject)=>new THREE.TextureLoader().load(url,resolve,undefined,reject));tex.colorSpace=THREE.SRGBColorSpace;URL.revokeObjectURL(url);const obj=new THREE.Mesh(new THREE.PlaneGeometry(160,140),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));obj.name=file.name;obj.userData.kind='Image';obj.userData.assetKey=key;obj.userData.assetExt=ext;obj.userData.assetName=file.name;obj.userData.script='';hudScene.add(obj);placeHudNode(obj);objects.push(obj);selectObject(obj);markDirty();}else if(['glb','gltf','fbx','obj'].includes(ext)){await putAsset(key,file);setArea('3d');const obj=await parseModelFile(file,ext);obj.name=file.name.replace(/\.[^.]+$/,'');const bounds=new THREE.Box3().setFromObject(obj),dims=bounds.getSize(new THREE.Vector3()),largest=Math.max(dims.x,dims.y,dims.z);if(largest>0){obj.scale.multiplyScalar(2.8/largest);obj.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(obj),mid=box.getCenter(new THREE.Vector3());obj.position.set(-mid.x,-box.min.y,-mid.z);}obj.userData.kind='Model';obj.userData.materialId=null;obj.userData.assetKey=key;obj.userData.assetExt=ext;obj.userData.assetName=file.name;obj.userData.script='';obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});scene.add(obj);objects.push(obj);selectObject(obj);markDirty();}else throw new Error('Formato no admitido. Usa GLB, GLTF, FBX, OBJ o PNG/JPG/WebP.');}catch(err){console.error('Error al importar',file.name,err);$('status-text').textContent=`● ${file.name}: ${String(err.message||err).slice(0,60)}`;}}$('asset-input').value='';updateHierarchy();}
$('import-model-top').addEventListener('click',()=>{if(!activeProject){$('status-text').textContent='● Abre un proyecto antes de importar';return;}const input=$('asset-input');input.value='';input.click();});
$('asset-input').addEventListener('change',()=>{const input=$('asset-input');if(input.files?.length)importFiles(input.files);});
function safeFilePart(value){return String(value||'archivo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^\.+|\.+$/g,'').slice(0,70)||'archivo';}
async function deliverExportZip(blob,filename){const fallback=()=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};if(window.cordova?.file?.cacheDirectory&&window.resolveLocalFileSystemURL&&window.plugins?.socialsharing?.shareWithOptions){try{await new Promise((resolve,reject)=>window.resolveLocalFileSystemURL(window.cordova.file.cacheDirectory,dir=>dir.getFile(filename,{create:true},entry=>entry.createWriter(writer=>{writer.onwriteend=()=>window.plugins.socialsharing.shareWithOptions({message:'Paquete de juego MobiForge listo para compilar el APK',files:[entry.nativeURL],chooserTitle:'Guardar paquete del juego'},resolve,reject);writer.onerror=reject;writer.write(blob);},reject),reject),reject));return 'shared';}catch(err){console.warn('No se pudo abrir el menú para guardar; se probará la descarga web.',err);}}fallback();return 'download';}
async function exportProjectPackage(){
  if(!activeProject)return;
  const button=$('export-game-button');
  button.disabled=true;
  button.dataset.label=button.innerHTML;
  button.innerHTML='<span>Exportando…</span>';
  try{
    saveScene();
    const scenes=[];
    for(const sc of activeProject.scenes||[]){
      let records=[];
      try{records=JSON.parse(localStorage.getItem(sceneStorageKey(activeProject,sc.id))||'[]');}catch{}
      scenes.push({id:sc.id,name:sc.name,objects:Array.isArray(records)?records:[]});
    }
    const assetRefs=new Map();
    for(const sc of scenes)for(const rec of sc.objects){
      if(rec.assetKey)assetRefs.set(rec.assetKey,rec.assetName||rec.name||'asset.bin');
      if(rec.hudImageAssetKey)assetRefs.set(rec.hudImageAssetKey,rec.hudImageName||'hud-image.png');
    }
    const zip=new JSZip();
    zip.file('package.json',exportPackage);
    zip.file('index.html',exportRuntimeHtml);
    zip.file('src/main.js',exportRuntimeMain);
    zip.file('src/style.css',exportRuntimeCss);
    zip.file('.github/workflows/build-android-apk.yml',exportWorkflow);
    zip.file('README.md',exportReadme);
    zip.file('vite.config.js',"import { defineConfig } from 'vite';\nexport default defineConfig({base:'./',build:{target:'es2020',outDir:'dist',emptyOutDir:true}});\n");
    const assetPaths={};
    let assetIndex=0;
    for(const [key,originalName] of assetRefs){
      const blob=await getAsset(key);
      if(!blob)throw new Error(`Falta el recurso local «${originalName}». Reimpórtalo antes de exportar.`);
      const filename=`asset-${String(++assetIndex).padStart(3,'0')}-${safeFilePart(originalName)}`;
      const path=`assets/${filename}`;
      assetPaths[key]=path;
      zip.file(`public/${path}`,blob);
    }
    const game={format:'mobiforge-game-v1',name:activeProject.name||'Mi juego',template:activeProject.template||'blank',startSceneId:'main',playerSceneId:'player',materials:projectMaterials().map(m=>({...m})),scenes,assets:assetPaths};
    zip.file('game.json',JSON.stringify(game,null,2));
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
    const filename=`${safeFilePart(activeProject.name||'Mi-juego')}-proyecto-APK.zip`;
    const delivery=await deliverExportZip(blob,filename);
    $('status-text').textContent='● PROYECTO PARA APK LISTO';
    await ui.notify(`Exporté «${activeProject.name||'Mi juego'}» con ${scenes.length} escenas y ${assetRefs.size} recursos.${delivery==='shared'?' Se abrió el menú para guardar o compartir el ZIP.':''}\n\nDescomprime el ZIP y sube todos sus archivos y carpetas —incluida .github/workflows— a un repositorio privado o nuevo de GitHub. El workflow está ya puesto en la ruta correcta y compilará la APK del juego al hacer push. Después descarga Juego-Android-APK desde Actions. No subas el ZIP como un solo archivo.`);
  }catch(err){
    console.error('Exportación del juego fallida',err);
    $('status-text').textContent='● ERROR AL EXPORTAR';
    await ui.notify(`No pude exportar el proyecto: ${err.message||err}`);
  }finally{
    button.disabled=false;
    button.innerHTML=button.dataset.label||'<i data-lucide="box"></i><span>Exportar APK</span>';
    createIcons({icons});
  }
}
$('export-game-button').addEventListener('click',exportProjectPackage);
function resize(){const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const aspect=w/h;hudCamera.left=-w/2;hudCamera.right=w/2;hudCamera.top=h/2;hudCamera.bottom=-h/2;hudCamera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(viewport); window.addEventListener('orientationchange', () => setTimeout(resize,150));
function animate(){requestAnimationFrame(animate);if(playMode)updatePlay(1/60);else if(areaMode==='3d')orbit.update();renderer.autoClear=true;if(areaMode==='2d'&&!playMode){renderer.setClearColor('#000000',1);renderer.clear();renderer.render(hudScene,hudCamera);}else{renderer.render(scene,camera);renderer.autoClear=false;renderer.clearDepth();renderer.render(hudScene,hudCamera);renderer.autoClear=true;}}
resize(); animate();

// Fengari runs Lua 5.3 in a browser VM. Only the small engine API is exposed to scripts.
function executeLua(source,currentNode=null) {
  const out = $('lua-output'); out.textContent = '';
  const log = (...args) => { out.textContent += `${args.map(String).join('\t')}\n`; };
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  lauxlib.luaL_requiref(L, to_luastring('js'), interop.luaopen_js, 0); lua.lua_pop(L, 1);
  const api = {
    add_cube: (name='Cubo Lua') => addObject('Cube', String(name)),
    add_sphere: (name='Esfera Lua') => addObject('Sphere', String(name)),
    add_cylinder: (name='Cilindro Lua') => addObject('Cylinder', String(name)),
    add_sprite: (name='Sprite Lua') => addObject('Sprite', String(name)),
    select: (name) => { const obj=objects.find((o)=>o.name===String(name)); if (!obj) throw new Error(`No existe el objeto: ${name}`); selectObject(obj); return obj.name; },
    set_selected_position: (x=0,y=0,z=0) => { if (!selected) throw new Error('No hay objeto seleccionado'); selected.position.set(Number(x)||0,Number(y)||0,Number(z)||0); refreshInspector(); markDirty(); },
    set_selected_color: (hex='#44d7a0') => { if (!selected?.material?.color) throw new Error('Selecciona una malla primero'); selected.material.color.set(String(hex)); selected.userData.color=String(hex); refreshInspector(); markDirty(); },
    node_name: () => currentNode?.name || '',
    set_node_position: (x=0,y=0,z=0) => { if(!currentNode)throw new Error('Script sin nodo');currentNode.position.set(Number(x)||0,Number(y)||0,Number(z)||0);if(currentNode===selected)refreshInspector();markDirty(); },
    move_node: (x=0,y=0,z=0) => { if(!currentNode)throw new Error('Script sin nodo');currentNode.position.x+=Number(x)||0;currentNode.position.y+=Number(y)||0;currentNode.position.z+=Number(z)||0;if(currentNode===selected)refreshInspector();markDirty(); },
    log: (...args) => log(...args)
  };
  interop.push(L, api); lua.lua_setglobal(L,to_luastring('engine'));
  const wrapped = `local raw_print = print\nprint = function(...) local values = {} for i=1,select('#',...) do values[i]=tostring(select(i,...)) end engine.log(table.concat(values,'\\t')) end\n${source}`;
  const status = lauxlib.luaL_loadstring(L,to_luastring(wrapped));
  const result = status === lua.LUA_OK ? lua.lua_pcall(L,0,lua.LUA_MULTRET,0) : status;
  if (result !== lua.LUA_OK) { const message=String(lua.lua_tojsstring(L,-1)); log(`Error Lua: ${message}`); $('status-text').textContent='● ERROR LUA'; }
  else { if (!out.textContent) log('Script ejecutado sin errores.'); $('status-text').textContent='● LUA OK'; }
  lua.lua_close(L);
}
$('lua-example').addEventListener('click',()=>{if(!selected)return;$('lua-code').value=`-- Script de ${selected.name}\nprint("Nodo activo:", engine.node_name())`;selected.userData.script=$('lua-code').value;markDirty();});
$('lua-close').addEventListener('click', () => toggleLua(false));
function toggleLua(open){$('lua-panel').classList.toggle('hidden',!open);setTimeout(resize,80);}

// Project browser, beginner templates, workspace areas and touch preview controls are wired below.

function persistProjects() { localStorage.setItem('mobiforge-projects', JSON.stringify(savedProjects)); renderProjects(); }
function renderProjects() {
  const host = $('recent-projects'); host.replaceChildren();
  $('projects-count').textContent = `${savedProjects.length} ${savedProjects.length === 1 ? 'proyecto' : 'proyectos'}`;
  if (!savedProjects.length) { const empty = document.createElement('div'); empty.className='projects-empty'; empty.innerHTML='<i data-lucide="folder-open"></i><span>Sin proyectos todavía.</span>'; host.appendChild(empty); }
  for (const project of [...savedProjects].sort((a,b)=>(b.updated||0)-(a.updated||0))) {
    const card=document.createElement('article'); card.className='recent-card';
    const icon=project.template==='first'?'crosshair':project.template==='third'?'person-standing':'box';
    const open=document.createElement('button'); open.className='recent-open'; open.innerHTML=`<span class="recent-icon"><i data-lucide="${icon}"></i></span><span class="recent-copy"><b></b><small></small></span><i class="recent-arrow" data-lucide="chevron-right"></i>`;
    open.querySelector('b').textContent=project.name; open.querySelector('small').textContent=`${project.template==='first'?'Primera persona':project.template==='third'?'Tercera persona':'Proyecto 3D'} · ${project.updated?new Date(project.updated).toLocaleDateString('es-MX'):'Nuevo'}`;
    open.addEventListener('click',()=>openProject(project));
    const remove=document.createElement('button'); remove.className='recent-delete'; remove.title='Eliminar proyecto'; remove.innerHTML='<i data-lucide="trash-2"></i>'; remove.addEventListener('click',async(e)=>{e.stopPropagation();if(!await ui.confirm(`¿Eliminar “${project.name}” de este dispositivo?`))return;for(const sc of project.scenes||[])localStorage.removeItem(sceneStorageKey(project,sc.id));localStorage.removeItem(`mobiforge-scene:${project.id}`);deleteProjectAssets(project.id);const i=savedProjects.findIndex(x=>x.id===project.id);if(i>=0)savedProjects.splice(i,1);if(activeProject?.id===project.id){clearTimeout(autoSaveTimer);activeProject=null;activeSceneId=null;showProjects();}persistProjects();});
    card.append(open,remove);host.appendChild(card);
  }
  createIcons({icons});
}
function setProjectHeader() { $('project-name-top').textContent=activeProject?.name||'Elige un proyecto'; }
async function openProject(project) {
  if(activeProject&&!$('editor-layout').classList.contains('hidden'))saveScene();
  activeProject=project;materialCache.clear();ensureProjectScenes(project);const requestedScene=project.currentSceneId||'main';persistProjects();setProjectHeader();$('project-home').classList.add('hidden');$('editor-layout').classList.remove('hidden');document.querySelector('.topbar').classList.remove('projects-view');
  document.querySelectorAll('.workspace-tab').forEach(b=>b.classList.toggle('selected',b.dataset.area==='3d'));
  activeSceneId='main';project.currentSceneId='main';populateScenes();clearObjects();areaMode='3d';setArea('3d');
  if(!await loadScene()){seedTemplate(project.template);saveScene();}
  const playerKey=sceneStorageKey(project,'player');if(!localStorage.getItem(playerKey)){saveScene();activeSceneId='player';project.currentSceneId='player';populateScenes();clearObjects();const body=addObject('CharacterBody3D','CharacterBody3D');body.position.set(0,.95,0);saveScene();}
  activeSceneId=project.scenes.some(s=>s.id===requestedScene)?requestedScene:'main';project.currentSceneId=activeSceneId;populateScenes();clearObjects();await loadScene();
  setArea('3d');setProjectHeader();resize();
}
function showProjects() {
  if(playMode)togglePlay(false);else if(activeProject)saveScene();
  $('editor-layout').classList.add('hidden'); $('project-home').classList.remove('hidden');document.querySelector('.topbar').classList.add('projects-view');
  document.querySelectorAll('.workspace-tab').forEach(b=>b.classList.toggle('selected',b.dataset.area==='projects'));
  createIcons({icons}); renderProjects(); setTimeout(resize,100);
}
function createProject(template='blank', name='') {
  const labels={blank:'Mi proyecto',third:'Aventura tercera persona',first:'Exploración primera persona'};
  const project={id:`p-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:name.trim()||labels[template]||labels.blank,template,updated:Date.now(),scenes:[{id:'main',name:'Main'},{id:'player',name:'Player'}],currentSceneId:'main'};
  savedProjects.unshift(project); persistProjects(); openProject(project);
}
function seedTemplate(template) {
  if (template==='third') {
    addObject('Cube','Obstáculo'); objects.at(-1).position.set(0,0.6,-4);
    addObject('Sphere','Punto de inicio'); objects.at(-1).position.set(2,0.65,-3);
    $('status-text').textContent='● PLANTILLA 3P';
  } else if (template==='first') {
    addObject('Cube','Caja'); objects.at(-1).position.set(0,0.6,-4);
    addObject('Cube','Muro de práctica'); objects.at(-1).position.set(2,1.1,-6); objects.at(-1).scale.set(3,2,0.3);
    $('status-text').textContent='● PLANTILLA 1P';
  }
  if(objects.length)selectObject(objects[0]);
}
$('back-projects').addEventListener('click',showProjects);
$('new-project-button').addEventListener('click',async()=>{const name=await ui.text('Nombre del proyecto (opcional)','',true);if(name===null)return;createProject('blank',name||'');});
document.querySelectorAll('.project-card').forEach(card=>card.addEventListener('click',()=>{const type=card.dataset.template;const names={blank:'Mi proyecto',third:'Aventura tercera persona',first:'Exploración primera persona'};createProject(type,names[type]);}));

function setArea(mode){
  if(mode==='script'){syncSelectedScript();toggleLua(true);document.querySelectorAll('.workspace-tab').forEach(b=>b.classList.toggle('selected',b.dataset.area==='script'));return;}
  if(playMode)togglePlay(false);toggleLua(false);areaMode=mode;const is2d=mode==='2d';$('editor-layout').classList.toggle('hud-layout',is2d);
  const helper=transform.getHelper();if(transformHost!==(is2d?hudScene:scene)){transform.detach();transformHost.remove(helper);transformHost=is2d?hudScene:scene;transformHost.add(helper);}
  transform.camera=is2d?hudCamera:camera;transform.enabled=!playMode;transform.showX=true;transform.showY=true;transform.showZ=!is2d;transform.setSize((is2d?1.15:.9) * TOUCH_SCALE);
  floor.visible=!is2d;grid.visible=!is2d;axes.visible=!is2d;
  if(is2d){camera.position.set(0,0,20);camera.lookAt(0,0,0);orbit.enabled=false;}
  if(selected&&isHudObject(selected)!==is2d){const candidate=objects.find(o=>isHudObject(o)===is2d);if(candidate)selectObject(candidate);else{selected=null;transform.detach();refreshInspector();updateHierarchy();}}
  if(!is2d&&mode==='3d'){const focus=selected&&!isHudObject(selected)?selected.position:new THREE.Vector3(0,.7,0);orbit.target.copy(focus);camera.position.set(focus.x+7,focus.y+5,focus.z+8);camera.up.set(0,1,0);camera.lookAt(focus);orbit.enabled=!playMode;}
  $('viewport-label').textContent=is2d?'HUD 2D · PANTALLA':'VISTA 3D';$('viewport-hint').textContent=is2d?'Coloca elementos en pantalla · + para añadir nodos 2D':'Arrastra para orbitar · + para añadir nodos 3D';
  $('empty-hint').textContent=is2d?'Añade botones, texto o imágenes que se verán sobre la pantalla':'Añade nodos 3D o importa un modelo GLB';$('empty-hint').hidden=objects.some(o=>isHudObject(o)===is2d);
  
  document.querySelectorAll('.workspace-tab').forEach(b=>b.classList.toggle('selected',b.dataset.area===mode));
  renderNodePicker();createIcons({icons});resize();
}
document.querySelectorAll('.workspace-tab').forEach(button=>button.addEventListener('click',()=>{
  if(button.dataset.area==='projects'){showProjects();return;}
  if(!activeProject){showProjects();return;}
  setArea(button.dataset.area);
}));

const nodeDefinitions={
  '3d':[{kind:'Cube',label:'Mesh · Cubo',icon:'box'},{kind:'Sphere',label:'Mesh · Esfera',icon:'circle'},{kind:'Cylinder',label:'Mesh · Cilindro',icon:'cylinder'},{kind:'Light',label:'OmniLight',icon:'sun'},{kind:'Camera',label:'Camera3D',icon:'video'},{kind:'Audio',label:'AudioStreamPlayer3D',icon:'volume-2'},{kind:'Node3D',label:'Node3D',icon:'boxes'},{kind:'CharacterBody3D',label:'CharacterBody3D',icon:'person-standing'}],
  '2d':[{kind:'Button2D',label:'Botón HUD',icon:'mouse-pointer-2'},{kind:'Label2D',label:'Texto HUD',icon:'type'},{kind:'Sprite',label:'Sprite2D',icon:'image'}]};
function renderNodePicker(group=document.querySelector('.node-picker-tab.active')?.dataset.nodeGroup|| (areaMode==='2d'?'2d':'3d')){const host=$('node-picker-list');if(!host)return;host.replaceChildren();for(const def of nodeDefinitions[group]||[]){const btn=document.createElement('button');btn.className='node-option';btn.innerHTML=`<i data-lucide="${def.icon}"></i><span>${def.label}</span>`;btn.addEventListener('click',()=>{areaMode=group;setArea(group);$('node-picker').classList.add('hidden');addObject(def.kind);});host.appendChild(btn);}createIcons({icons});}
$('node-menu-button').addEventListener('click',()=>{const menu=$('node-picker');const opening=menu.classList.contains('hidden');menu.classList.toggle('hidden',!opening);const group=areaMode==='2d'?'2d':'3d';document.querySelectorAll('.node-picker-tab').forEach(t=>t.classList.toggle('active',t.dataset.nodeGroup===group));renderNodePicker(group);});
$('close-node-picker').addEventListener('click',()=>$('node-picker').classList.add('hidden'));
document.querySelectorAll('.node-picker-tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.node-picker-tab').forEach(t=>t.classList.toggle('active',t===tab));renderNodePicker(tab.dataset.nodeGroup);}));
function syncAllMaterialValues(id){for(const o of objects)if(o.userData.materialId===id)syncMaterialValues(o,id);}
$('material-select').addEventListener('change',()=>{if(!selected)return;const id=$('material-select').value||null;if(id)assignProjectMaterial(selected,id);else{selected.userData.materialId=null;const c=selected.userData.color||defaultColor;eachMesh(selected,m=>{const prior=m.material;const make=old=>new THREE.MeshStandardMaterial({color:c,roughness:.5,metalness:.1,map:old?.map||null,transparent:!!old?.map,side:THREE.DoubleSide});m.material=Array.isArray(prior)?prior.map(make):make(prior);});}refreshInspector();markDirty();});
$('new-material').addEventListener('click',async()=>{if(!selected)return;const name=await ui.text('Nombre del material','Material nuevo');if(!name?.trim())return;const m={id:`mat-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,name:name.trim(),color:selected.userData.color||'#44d7a0',roughness:.5,metalness:.1};projectMaterials().push(m);assignProjectMaterial(selected,m.id);persistProjects();refreshInspector();markDirty();});
async function applyHudImageKey(obj,key,name=''){const blob=await getAsset(key);if(!blob)return;const url=URL.createObjectURL(blob);try{const tex=await new Promise((resolve,reject)=>new THREE.TextureLoader().load(url,resolve,undefined,reject));tex.colorSpace=THREE.SRGBColorSpace;obj.material.map=tex;obj.material.color.set('#ffffff');obj.material.needsUpdate=true;obj.userData.hudImageAssetKey=key;obj.userData.hudImageName=name||'Imagen';if($('hud-image-name')&&obj===selected)$('hud-image-name').textContent=obj.userData.hudImageName;}finally{URL.revokeObjectURL(url);}}
$('hud-image-button').addEventListener('click',()=>selected&&$('hud-image-input').click());
$('hud-image-input').addEventListener('change',async()=>{if(!selected||!$('hud-image-input').files?.length)return;const file=$('hud-image-input').files[0],key=`${activeProject.id}:${activeSceneId}:hud-${Date.now()}`;try{await putAsset(key,file);await applyHudImageKey(selected,key,file.name);markDirty();}catch(err){$('status-text').textContent=`● ERROR IMAGEN HUD: ${String(err.message||err).slice(0,55)}`;}$('hud-image-input').value='';});
$('hud-image-clear').addEventListener('click',()=>{if(!selected)return;selected.userData.hudImageAssetKey=null;selected.userData.hudImageName='';if(selected.userData.hudBaseTexture){selected.material.map=selected.userData.hudBaseTexture;selected.material.color.set('#ffffff');selected.material.needsUpdate=true;}$('hud-image-name').textContent='Sin imagen';refreshHudVisual(selected,selected.userData.hudText||'');markDirty();});
$('hud-text').addEventListener('input',()=>{if(!selected||!['Button2D','Label2D'].includes(selected.userData.kind))return;selected.userData.hudText=$('hud-text').value;refreshHudVisual(selected,selected.userData.hudText);markDirty();});
$('material-name').addEventListener('change',()=>{const m=materialDef(activeMaterialId);if(!m||!$('material-name').value.trim())return;m.name=$('material-name').value.trim();persistProjects();refreshMaterialInspector();});
$('material-color').addEventListener('input',()=>{if(!selected)return;const m=materialDef(activeMaterialId);if(m){m.color=$('material-color').value;syncAllMaterialValues(m.id);persistProjects();}else{selected.userData.color=$('material-color').value;eachMesh(selected,n=>{const mats=Array.isArray(n.material)?n.material:[n.material];for(const mat of mats)if(mat?.color)mat.color.set($('material-color').value);});}refreshMaterialInspector();markDirty();});
for(const [id,key,output] of [['material-roughness','roughness','roughness-value'],['material-metalness','metalness','metalness-value']])$(id).addEventListener('input',()=>{const m=materialDef(activeMaterialId);if(!m)return;m[key]=Number($(id).value);$(output).textContent=m[key].toFixed(2);syncAllMaterialValues(m.id);persistProjects();markDirty();});
$('material-select').disabled=true;$('new-material').disabled=true;
function setupPanelResizers(){const layout=$('editor-layout');const saved=JSON.parse(localStorage.getItem('mobiforge-panel-sizes')||'{}');if(saved.left)layout.style.setProperty('--left-width',`${saved.left}px`);if(saved.right)layout.style.setProperty('--right-width',`${saved.right}px`);let drag=null;for(const [id,side]of [['resize-left','left'],['resize-right','right']]){const bar=$(id);bar.addEventListener('pointerdown',e=>{drag={side,startX:e.clientX,left:layout.querySelector('.left-panel').getBoundingClientRect().width,right:layout.querySelector('.inspector-panel').getBoundingClientRect().width};bar.setPointerCapture(e.pointerId);e.preventDefault();});bar.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.startX;if(drag.side==='left')layout.style.setProperty('--left-width',`${Math.max(145,Math.min(window.innerWidth*.34,drag.left+dx))}px`);else layout.style.setProperty('--right-width',`${Math.max(185,Math.min(window.innerWidth*.38,drag.right-dx))}px`);resize();});const end=()=>{if(!drag)return;const a=layout.querySelector('.left-panel').getBoundingClientRect().width,b=layout.querySelector('.inspector-panel').getBoundingClientRect().width;localStorage.setItem('mobiforge-panel-sizes',JSON.stringify({left:a,right:b}));drag=null;};bar.addEventListener('pointerup',end);bar.addEventListener('pointercancel',end);}}
setupPanelResizers();
function collectColors(obj){const a=[];obj.traverse(n=>{const ms=Array.isArray(n.material)?n.material:[n.material];for(const m of ms)if(m?.color)a.push([m,m.color.clone()]);});return a;}
function togglePlay(on=!playMode) {
  if(on&&!playMode)playSnapshot={objects:new Map(objects.map(o=>[o,{position:o.position.clone(),rotation:o.rotation.clone(),scale:o.scale.clone(),visible:o.visible,script:o.userData.script,color:o.userData.color,materials:collectColors(o)}])),camera:camera.position.clone(),cameraRotation:camera.rotation.clone(),target:orbit.target.clone(),selected,editorVisibility:{floor:floor.visible,grid:grid.visible,axes:axes.visible},background:scene.background?.clone?.()||scene.background};
  playMode=on;const kind='CharacterBody3D';$('editor-layout').classList.toggle('playing',playMode);document.querySelector('.topbar').classList.toggle('play-view',playMode);
  playCharacter=objects.find(o=>o.userData.kind===kind)||objects.find(o=>o.userData.kind==='CharacterBody3D')||null;
  $('play-controls').classList.toggle('hidden',!playMode);$('editor-layout').classList.toggle('hud-play',false);$('play-button').classList.toggle('playing',playMode);
  $('play-button').innerHTML=playMode?'<i data-lucide="square"></i><span>Detener</span>':'<i data-lucide="play"></i><span>Probar</span>';
  transform.enabled=!playMode;transform.getHelper().visible=!playMode;orbit.enabled=!playMode&&areaMode==='3d';if(playMode){floor.visible=true;grid.visible=false;axes.visible=false;scene.background=new THREE.Color('#18212b');playYaw=playCharacter?.rotation.y||0;playPitch=0;resize();}
  if(playMode){if(activeSceneId==='main'&&activeProject){const playerRec=JSON.parse(localStorage.getItem(sceneStorageKey(activeProject,'player'))||'[]').find(x=>x.kind==='CharacterBody3D');if(playerRec){const n=addObject('CharacterBody3D',playerRec.name||'Player');playCharacter=n;n.position.fromArray(playerRec.pos||[0,.95,0]);n.rotation.set(...(playerRec.rot||[0,0,0]));n.scale.fromArray(playerRec.scale||[1,1,1]);n.userData.color=playerRec.color||'#48d6a5';}}if(playCharacter){const spawn=playCharacter.position;orbit.target.set(spawn.x,spawn.y+1,spawn.z);if(activeProject?.template==='first'){camera.position.set(spawn.x,spawn.y+1.1,spawn.z);camera.rotation.order='YXZ';camera.rotation.set(0,playYaw,0);}else{camera.position.set(spawn.x-Math.sin(playYaw)*4,spawn.y+2.5,spawn.z+Math.cos(playYaw)*4);camera.lookAt(spawn.x,spawn.y+1,spawn.z);}}if(playCharacter&&activeProject?.template==='first')playCharacter.visible=false;$('status-text').textContent=areaMode==='2d'?'● EJECUTANDO HUD':'● MODO JUEGO';for(const o of [...objects])if(o.userData.script?.trim()&&o.userData.kind!=='Button2D')executeLua(o.userData.script,o);}
  else{$('status-text').textContent='● LISTO';transform.getHelper().visible=true;if(playSnapshot){for(const o of [...objects])if(!playSnapshot.objects.has(o))removeObject(o,true);for(const [o,v] of playSnapshot.objects){if(!objects.includes(o))continue;o.position.copy(v.position);o.rotation.copy(v.rotation);o.scale.copy(v.scale);o.visible=v.visible;o.userData.script=v.script;o.userData.color=v.color;for(const [m,c] of v.materials)m.color.copy(c);}camera.position.copy(playSnapshot.camera);camera.rotation.copy(playSnapshot.cameraRotation);orbit.target.copy(playSnapshot.target);floor.visible=playSnapshot.editorVisibility.floor;grid.visible=playSnapshot.editorVisibility.grid;axes.visible=playSnapshot.editorVisibility.axes;if(playSnapshot.background)scene.background=playSnapshot.background.clone?.()||playSnapshot.background;selected=playSnapshot.selected;playSnapshot=null;}playCharacter=null;joystick.x=0;joystick.y=0;pressedKeys.clear();if(selected){transform.attach(selected);refreshInspector();updateHierarchy();}orbit.enabled=areaMode==='3d';}
  createIcons({icons});
}
function updatePlay(dt) {
  if(!playCharacter)return;
  const forward=(pressedKeys.has('KeyW')||pressedKeys.has('ArrowUp')?-1:0)+(pressedKeys.has('KeyS')||pressedKeys.has('ArrowDown')?1:0)-joystick.y;
  const sideways=(pressedKeys.has('KeyD')||pressedKeys.has('ArrowRight')?1:0)-(pressedKeys.has('KeyA')||pressedKeys.has('ArrowLeft')?1:0)+joystick.x;
  const fx=Math.sin(playYaw), fz=-Math.cos(playYaw), rx=Math.cos(playYaw), rz=Math.sin(playYaw);
  const vx=fx*forward+rx*sideways, vz=fz*forward+rz*sideways, len=Math.hypot(vx,vz)||1;
  playCharacter.position.x+=vx/len*3.4*dt;playCharacter.position.z+=vz/len*3.4*dt;
  if(Math.abs(vx)+Math.abs(vz)>0.01)playCharacter.rotation.y=playYaw;
  if(activeProject?.template==='first'){
    camera.position.set(playCharacter.position.x,playCharacter.position.y+1.1,playCharacter.position.z);
    camera.rotation.order='YXZ';camera.rotation.set(playPitch,playYaw,0);
  } else {
    const target=new THREE.Vector3(playCharacter.position.x-Math.sin(playYaw)*4,playCharacter.position.y+2.5,playCharacter.position.z+Math.cos(playYaw)*4);
    camera.position.lerp(target,Math.min(1,dt*7));camera.lookAt(playCharacter.position.x,playCharacter.position.y+1,playCharacter.position.z);
  }
}
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;pressedKeys.add(e.code);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();});
window.addEventListener('keyup',e=>pressedKeys.delete(e.code));
const movePad=$('move-pad');let padPointer=null;
movePad.addEventListener('pointerdown',e=>{padPointer=e.pointerId;movePad.setPointerCapture(e.pointerId);updatePad(e);});
movePad.addEventListener('pointermove',e=>{if(e.pointerId===padPointer)updatePad(e);});
function updatePad(e){const r=movePad.getBoundingClientRect();joystick.x=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width*.35)));joystick.y=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/(r.height*.35)));}
function releasePad(e){if(e.pointerId===padPointer){padPointer=null;joystick.x=0;joystick.y=0;}}
movePad.addEventListener('pointerup',releasePad);movePad.addEventListener('pointercancel',releasePad);
canvas.addEventListener('pointermove',e=>{if(!playMode||!downPoint||!e.buttons)return;const dx=e.clientX-downPoint.x,dy=e.clientY-downPoint.y;downPoint={x:e.clientX,y:e.clientY};playYaw-=dx*0.006;playPitch=Math.max(-1.15,Math.min(1.15,playPitch-dy*0.004));});
createIcons({icons});renderProjects();setProjectHeader();
window.addEventListener('pagehide',()=>{if(activeProject&&!playMode)saveScene();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&activeProject&&!playMode)saveScene();});
