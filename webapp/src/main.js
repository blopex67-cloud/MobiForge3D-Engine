import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { lua, lauxlib, lualib, to_luastring } from 'fengari';
import * as interop from 'fengari-interop';
import { createIcons, FolderKanban, PanelsTopLeft, Box, CodeXml, Save, Play, Plus, PersonStanding, Crosshair, Lightbulb, FolderOpen, ChevronRight, Trash2, ChevronLeft, Cylinder, Circle, Sun, Image, Move3D, Rotate3D, Scaling, ScanEye, Layers3, Square, X, Eye } from 'lucide';
import './style.css';

const $ = (id) => document.getElementById(id);
const icons = { FolderKanban, PanelsTopLeft, Box, CodeXml, Save, Play, Plus, PersonStanding, Crosshair, Lightbulb, FolderOpen, ChevronRight, Trash2, ChevronLeft, Cylinder, Circle, Sun, Image, Move3D, Rotate3D, Scaling, ScanEye, Layers3, Square, X, Eye };
const viewport = $('viewport');
const canvas = $('scene-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#111923');
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
transform.setSize(0.9);
transform.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; });
transform.addEventListener('objectChange', refreshInspector);
scene.add(transform.getHelper());

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
const pressedKeys = new Set();
const joystick = { x: 0, y: 0 };
const savedProjects = JSON.parse(localStorage.getItem('mobiforge-projects') || '[]');
const defaultColor = '#44d7a0';
const primitiveColor = { Cube: '#43d7a0', Sphere: '#649cff', Cylinder: '#ffad5a', Light: '#ffe273' };

function makeCharacter(kind) {
  const group = new THREE.Group();
  const isFirst = kind === 'Player1P';
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.85, 5, 12), new THREE.MeshStandardMaterial({ color: isFirst ? '#5686b9' : '#48d6a5', roughness: 0.65 }));
  body.position.y = 0.78; body.castShadow = true; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 12), new THREE.MeshStandardMaterial({ color: '#f2c8a7' }));
  head.position.y = 1.52; head.castShadow = true; group.add(head);
  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.16), new THREE.MeshBasicMaterial({ color: '#fff0a6' })); marker.position.set(0, 1.55, -0.235); group.add(marker);
  return group;
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
function addObject(kind = 'Cube', name = '') {
  count += 1;
  let obj;
  if (kind === 'Light') {
    obj = new THREE.PointLight('#ffe273', 16, 8, 2);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe273' }));
    bulb.name = 'Light marker'; obj.add(bulb);
    obj.userData.color = '#ffe273';
  } else if (kind === 'Player3P' || kind === 'Player1P') {
    obj = makeCharacter(kind); obj.userData.color = kind === 'Player1P' ? '#5686b9' : '#48d6a5';
  } else if (kind === 'Sprite') {
    obj = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ color: '#f7c65f', side: THREE.DoubleSide }));
    obj.userData.color = '#f7c65f'; obj.position.z = 0;
  } else {
    obj = meshFor(kind);
    obj.userData.color = primitiveColor[kind] || defaultColor;
  }
  const kindNames = { Light:'Luz', Sphere:'Esfera', Cylinder:'Cilindro', Sprite:'Sprite', Player3P:'Jugador 3P', Player1P:'Jugador 1P' };
  obj.name = name || `${kindNames[kind] || 'Cubo'} ${count}`;
  obj.userData.kind = kind;
  const spread = Math.min(objects.length * 0.55, 3);
  obj.position.set((objects.length % 3 - 1) * 1.5, kind === 'Light' ? 2.5 : 0.65, -spread);
  scene.add(obj); objects.push(obj); selectObject(obj); updateHierarchy(); markDirty();
  return obj.name;
}
function selectObject(obj) {
  selected = obj || null;
  transform.detach();
  if (selected && selected.userData.kind !== 'Light') transform.attach(selected);
  else if (selected) transform.attach(selected);
  updateHierarchy(); refreshInspector();
}
function updateHierarchy() {
  const list = $('hierarchy'); list.replaceChildren();
  $('object-count').textContent = String(objects.length);
  objects.forEach((obj) => {
    const row = document.createElement('button'); row.className = `hierarchy-row${obj === selected ? ' active' : ''}`;
    const icon = obj.userData.kind === 'Light' ? 'sun' : obj.userData.kind === 'Sphere' ? 'circle' : obj.userData.kind === 'Cylinder' ? 'cylinder' : obj.userData.kind === 'Sprite' ? 'image' : (obj.userData.kind || '').startsWith('Player') ? 'person-standing' : 'box';
    row.innerHTML = `<i class="object-icon" data-lucide="${icon}"></i><span class="object-name"></span><span class="visibility"><i data-lucide="eye"></i></span>`;
    row.querySelector('.object-name').textContent = obj.name;
    row.addEventListener('click', () => selectObject(obj)); list.appendChild(row);
  });
  createIcons({ icons });
}
function refreshInspector() {
  const disabled = !selected;
  $('object-name').disabled = disabled;
  $('object-name').value = selected?.name || 'Sin selección';
  const vals = { px: selected?.position.x, py: selected?.position.y, pz: selected?.position.z,
    rx: selected ? THREE.MathUtils.radToDeg(selected.rotation.x) : 0, ry: selected ? THREE.MathUtils.radToDeg(selected.rotation.y) : 0, rz: selected ? THREE.MathUtils.radToDeg(selected.rotation.z) : 0,
    sx: selected?.scale.x, sy: selected?.scale.y, sz: selected?.scale.z };
  for (const [id, val] of Object.entries(vals)) { const el = $(id); el.disabled = disabled; if (document.activeElement !== el) el.value = Number(val ?? (id.startsWith('s') ? 1 : 0)).toFixed(2); }
  const color = selected?.userData.color || defaultColor;
  $('material-color').disabled = disabled || selected?.userData.kind === 'Light';
  if (!selected || selected.userData.kind !== 'Light') $('material-color').value = color;
  $('color-value').textContent = color.toUpperCase();
}
function markDirty() { $('save-state').textContent = '● Guardando…'; $('save-state').classList.add('dirty'); $('status-text').textContent = '● CAMBIOS'; if (activeProject) { clearTimeout(autoSaveTimer); autoSaveTimer=setTimeout(saveScene,700); } }
function saveScene() {
  try {
    const data = objects.map((o) => ({ name:o.name, kind:o.userData.kind, pos:o.position.toArray(), rot:o.rotation.toArray(), scale:o.scale.toArray(), color:o.userData.color || defaultColor }));
    if (!activeProject) return;
    localStorage.setItem(`mobiforge-scene:${activeProject.id}`, JSON.stringify(data));
    activeProject.updated = Date.now(); persistProjects();
    $('save-state').textContent = '● Guardado local'; $('save-state').classList.remove('dirty'); $('status-text').textContent = '● GUARDADO';
  } catch (err) { $('status-text').textContent = '● ERROR AL GUARDAR'; }
}
function loadScene() {
  try {
    if (!activeProject) return false;
    const data = JSON.parse(localStorage.getItem(`mobiforge-scene:${activeProject.id}`) || 'null');
    if (!Array.isArray(data)) return false;
    for (const o of [...objects]) removeObject(o);
    for (const item of data) {
      const name = addObject(item.kind || 'Cube', item.name);
      const obj = objects.find((x) => x.name === name);
      if (!obj) continue;
      obj.position.fromArray(item.pos || [0,0.65,0]); obj.rotation.set(...(item.rot || [0,0,0])); obj.scale.fromArray(item.scale || [1,1,1]);
      if (obj.material?.color && item.color) { obj.material.color.set(item.color); obj.userData.color = item.color; } else if (item.color) { obj.traverse((n) => { if (n.material?.color && n !== obj.children?.[1]) n.material.color.set(item.color); }); obj.userData.color = item.color; }
    }
    if (objects.length) selectObject(objects[0]);
    $('save-state').textContent = '● Guardado local'; $('save-state').classList.remove('dirty');
    return true;
  } catch { return false; }
}
function removeObject(obj) { if (!obj) return; if (selected === obj) { transform.detach(); selected = null; } scene.remove(obj); objects.splice(objects.indexOf(obj), 1); obj.traverse((node) => { node.geometry?.dispose?.(); if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose()); else node.material?.dispose?.(); }); updateHierarchy(); refreshInspector(); markDirty(); }

for (const axis of ['px','py','pz','rx','ry','rz','sx','sy','sz']) $(axis).addEventListener('change', () => {
  if (!selected) return; const value = Number($(axis).value) || 0;
  if (axis[0] === 'p') selected.position[axis[1]] = value;
  if (axis[0] === 'r') selected.rotation[axis[1]] = THREE.MathUtils.degToRad(value);
  if (axis[0] === 's') selected.scale[axis[1]] = Math.max(0.01, value);
  markDirty();
});
$('object-name').addEventListener('change', () => { if (selected && $('object-name').value.trim()) { selected.name = $('object-name').value.trim(); updateHierarchy(); markDirty(); } });
$('material-color').addEventListener('input', () => { if (!selected || !selected.material?.color) return; selected.material.color.set($('material-color').value); selected.userData.color = $('material-color').value; $('color-value').textContent = $('material-color').value.toUpperCase(); markDirty(); });
$('delete-button').addEventListener('click', () => removeObject(selected));
$('save-button').addEventListener('click', saveScene);
$('play-button').addEventListener('click', () => togglePlay());
$('exit-play').addEventListener('click', () => togglePlay(false));
for (const button of document.querySelectorAll('[data-add]')) button.addEventListener('click', () => addObject(button.dataset.add));
$('add-menu').addEventListener('click', () => addObject('Cube'));
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => { for (const b of document.querySelectorAll('[data-mode]')) b.classList.toggle('active', b === button); transform.setMode(button.dataset.mode); });
$('focus-button').addEventListener('click', () => { if (!selected) return; orbit.target.copy(selected.position); const offset = camera.position.clone().sub(orbit.target); if (offset.length() < 0.5) offset.set(5,4,6); camera.position.copy(orbit.target).add(offset); });

// Tap an object in the viewport to select it; empty-space drag remains orbit navigation.
const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let downPoint = null;
canvas.addEventListener('pointerdown', (e) => { downPoint = { x:e.clientX, y:e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!downPoint || Math.hypot(e.clientX-downPoint.x, e.clientY-downPoint.y) > 8 || transform.dragging) return;
  const rect = canvas.getBoundingClientRect(); pointer.set((e.clientX-rect.left)/rect.width*2-1, -((e.clientY-rect.top)/rect.height)*2+1); raycaster.setFromCamera(pointer,camera);
  const hits = raycaster.intersectObjects(objects,true); if (!hits.length) return;
  let target = hits[0].object; while (target.parent && !objects.includes(target)) target=target.parent; if (objects.includes(target)) selectObject(target);
});
$('empty-hint').hidden = true;
function resize() { const w = Math.max(1, viewport.clientWidth), h = Math.max(1, viewport.clientHeight); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(viewport); window.addEventListener('orientationchange', () => setTimeout(resize,150));
function animate() { requestAnimationFrame(animate); if (playMode) updatePlay(1/60); else orbit.update(); renderer.render(scene,camera); }
resize(); animate();

// Fengari runs Lua 5.3 in a browser VM. Only the small engine API is exposed to scripts.
function executeLua(source) {
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
$('lua-run').addEventListener('click', () => executeLua($('lua-code').value));
$('lua-example').addEventListener('click', () => { $('lua-code').value = `-- El lenguaje Lua 5.3 está activo\nlocal nombre = "Cubo creado desde Lua"\nlocal objeto = engine.add_cube(nombre)\nengine.set_selected_position(0, 1, 0)\nengine.set_selected_color("#ff7b72")\nprint("Listo:", objeto)`; });
$('lua-close').addEventListener('click', () => toggleLua(false));
function toggleLua(open) { $('lua-panel').classList.toggle('hidden',!open); document.querySelector('[data-tab="lua"]').classList.toggle('selected',open); document.querySelector('[data-tab="scene"]').classList.toggle('selected',!open); setTimeout(resize,80); }
for (const button of document.querySelectorAll('[data-tab]')) button.addEventListener('click', () => toggleLua(button.dataset.tab==='lua'));

// Project browser, beginner templates, workspace areas and touch preview controls are wired below.

function persistProjects() { localStorage.setItem('mobiforge-projects', JSON.stringify(savedProjects)); renderProjects(); }
function renderProjects() {
  const host = $('recent-projects'); host.replaceChildren();
  $('projects-count').textContent = `${savedProjects.length} ${savedProjects.length === 1 ? 'proyecto' : 'proyectos'}`;
  if (!savedProjects.length) { const empty = document.createElement('div'); empty.className='projects-empty'; empty.innerHTML='<i data-lucide="folder-open"></i><span>Aún no hay proyectos guardados. Elige una plantilla para crear el primero.</span>'; host.appendChild(empty); }
  for (const project of [...savedProjects].sort((a,b)=>(b.updated||0)-(a.updated||0))) {
    const card=document.createElement('article'); card.className='recent-card';
    const icon=project.template==='first'?'crosshair':project.template==='third'?'person-standing':'box';
    const open=document.createElement('button'); open.className='recent-open'; open.innerHTML=`<span class="recent-icon"><i data-lucide="${icon}"></i></span><span class="recent-copy"><b></b><small></small></span><i class="recent-arrow" data-lucide="chevron-right"></i>`;
    open.querySelector('b').textContent=project.name; open.querySelector('small').textContent=`${project.template==='first'?'Primera persona':project.template==='third'?'Tercera persona':'Proyecto 3D'} · ${project.updated?new Date(project.updated).toLocaleDateString('es-MX'):'Nuevo'}`;
    open.addEventListener('click',()=>openProject(project));
    const remove=document.createElement('button'); remove.className='recent-delete'; remove.title='Eliminar proyecto'; remove.innerHTML='<i data-lucide="trash-2"></i>'; remove.addEventListener('click',(e)=>{e.stopPropagation();if(!confirm(`¿Eliminar “${project.name}” de este dispositivo?`))return;localStorage.removeItem(`mobiforge-scene:${project.id}`);const i=savedProjects.findIndex(x=>x.id===project.id);if(i>=0)savedProjects.splice(i,1);if(activeProject?.id===project.id)showProjects();persistProjects();});
    card.append(open,remove);host.appendChild(card);
  }
  createIcons({icons});
}
function setProjectHeader() { $('project-name-top').textContent=activeProject?.name||'Elige un proyecto'; }
function clearObjects() { for (const o of [...objects]) removeObject(o); transform.detach(); selected=null; }
function openProject(project) {
  activeProject=project; setProjectHeader(); $('project-home').classList.add('hidden'); $('editor-layout').classList.remove('hidden');
  document.querySelectorAll('.workspace-tab').forEach(b=>b.classList.toggle('selected',b.dataset.area==='3d'));
  clearObjects(); areaMode='3d'; setArea('3d');
  if (!loadScene()) { seedTemplate(project.template); saveScene(); }
  setArea('3d'); setProjectHeader(); resize();
}
function showProjects() {
  if (playMode) togglePlay(false);
  $('editor-layout').classList.add('hidden'); $('project-home').classList.remove('hidden');
  document.querySelectorAll('.workspace-tab').forEach(b=>b.classList.toggle('selected',b.dataset.area==='projects'));
  createIcons({icons}); renderProjects(); setTimeout(resize,100);
}
function createProject(template='blank', name='') {
  const labels={blank:'Mi proyecto',third:'Aventura tercera persona',first:'Exploración primera persona'};
  const project={id:`p-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:name.trim()||labels[template]||labels.blank,template,updated:Date.now()};
  savedProjects.unshift(project); persistProjects(); openProject(project);
}
function seedTemplate(template) {
  if (template==='third') {
    addObject('Player3P','Jugador · tercera persona'); const hero=objects.at(-1); hero.position.set(0,0,-1); hero.userData.color='#48d6a5';
    addObject('Cube','Obstáculo'); objects.at(-1).position.set(0,0.6,-4);
    addObject('Sphere','Punto de inicio'); objects.at(-1).position.set(2,0.65,-3);
    $('status-text').textContent='● PLANTILLA 3P';
  } else if (template==='first') {
    addObject('Player1P','Jugador · primera persona'); const hero=objects.at(-1); hero.position.set(0,0,0); hero.userData.color='#5686b9';
    addObject('Cube','Caja'); objects.at(-1).position.set(0,0.6,-4);
    addObject('Cube','Muro de práctica'); objects.at(-1).position.set(2,1.1,-6); objects.at(-1).scale.set(3,2,0.3);
    $('status-text').textContent='● PLANTILLA 1P';
  } else {
    addObject('Cube','Cubo'); objects.at(-1).position.set(0,0.6,0);
    addObject('Light','Luz principal'); objects.at(-1).position.set(2,3,2);
  }
  if(objects.length)selectObject(objects[0]);
}
$('home-button').addEventListener('click',showProjects);
$('back-projects').addEventListener('click',showProjects);
$('new-project-button').addEventListener('click',()=>{const name=prompt('Nombre del proyecto (opcional):','');createProject('blank',name||'');});
document.querySelectorAll('.project-card').forEach(card=>card.addEventListener('click',()=>{const type=card.dataset.template;const names={blank:'Mi proyecto',third:'Aventura tercera persona',first:'Exploración primera persona'};createProject(type,names[type]);}));

function setArea(mode) {
  if (playMode) togglePlay(false);
  areaMode=mode;
  if (mode==='2d') {
    floor.visible=false; grid.rotation.x=Math.PI/2; grid.position.set(0,0,-0.08); axes.visible=false;
    camera.fov=30; camera.updateProjectionMatrix(); camera.position.set(0,0,20); camera.up.set(0,1,0); camera.lookAt(0,0,0); orbit.target.set(0,0,0); orbit.enabled=false;
    objects.forEach(o=>{o.visible=o.userData.kind==='Sprite';});
    if(activeProject&&!objects.some(o=>o.userData.kind==='Sprite')){addObject('Sprite','Sprite 2D');objects.at(-1).position.set(0,0,0);}
    $('viewport-label').textContent='VISTA 2D'; $('viewport-hint').textContent='Toca un sprite · usa el gizmo para editar';
    transform.enabled=true;
  } else {
    floor.visible=true; grid.rotation.x=0; grid.position.set(0,0,0); axes.visible=true;
    objects.forEach(o=>{o.visible=true;});
    if(mode==='3d') { camera.fov=45;camera.updateProjectionMatrix();const focus=selected?.position||new THREE.Vector3(0,0.7,0);orbit.target.copy(focus);camera.position.set(focus.x+7,focus.y+5,focus.z+8);camera.up.set(0,1,0);camera.lookAt(focus);orbit.enabled=!playMode; }
    $('viewport-label').textContent='VISTA 3D'; $('viewport-hint').textContent='Arrastra para orbitar · toca un objeto para elegirlo';
  }
  if(mode==='script')toggleLua(true); else if(mode==='2d')toggleLua(false);
  document.querySelectorAll('.workspace-tab').forEach(b=>b.classList.toggle('selected',b.dataset.area===mode));
  createIcons({icons}); resize();
}
document.querySelectorAll('.workspace-tab').forEach(button=>button.addEventListener('click',()=>{
  if(button.dataset.area==='projects'){showProjects();return;}
  if(!activeProject){showProjects();return;}
  setArea(button.dataset.area);
}));

function togglePlay(on=!playMode) {
  if (on && areaMode!=='3d') setArea('3d');
  playMode=on; const kind=activeProject?.template==='first'?'Player1P':activeProject?.template==='third'?'Player3P':null;
  playCharacter=objects.find(o=>o.userData.kind===kind)||objects.find(o=>(o.userData.kind||'').startsWith('Player'))||null;
  $('play-controls').classList.toggle('hidden',!playMode); $('play-button').classList.toggle('playing',playMode);
  $('play-button').innerHTML=playMode?'<i data-lucide="square"></i><span>Detener</span>':'<i data-lucide="play"></i><span>Probar</span>';
  transform.enabled=!playMode; orbit.enabled=!playMode&&areaMode==='3d';
  if(playMode){if(!playCharacter){addObject('Player3P','Jugador de prueba');playCharacter=objects.at(-1);playCharacter.position.set(0,0,0);}
    const d=new THREE.Vector3();camera.getWorldDirection(d);playYaw=Math.atan2(d.x,-d.z);playPitch=0;
    if(activeProject?.template==='first')playCharacter.visible=false;
    $('status-text').textContent='● MODO JUEGO';
  } else {$('status-text').textContent='● LISTO';if(playCharacter){playCharacter.visible=true;camera.position.set(playCharacter.position.x+5,playCharacter.position.y+3,playCharacter.position.z+7);orbit.target.copy(playCharacter.position);orbit.enabled=areaMode==='3d';}playCharacter=null;joystick.x=0;joystick.y=0;}
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
    camera.position.set(playCharacter.position.x,playCharacter.position.y+1.35,playCharacter.position.z);
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
