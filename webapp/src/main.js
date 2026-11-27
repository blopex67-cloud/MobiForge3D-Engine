import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { lua, lauxlib, lualib, to_luastring } from 'fengari';
import * as interop from 'fengari-interop';
import './style.css';

const $ = (id) => document.getElementById(id);
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
const defaultColor = '#44d7a0';
const primitiveColor = { Cube: '#43d7a0', Sphere: '#649cff', Cylinder: '#ffad5a', Light: '#ffe273' };

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
  } else {
    obj = meshFor(kind);
    obj.userData.color = primitiveColor[kind] || defaultColor;
  }
  obj.name = name || `${kind === 'Light' ? 'Luz' : kind === 'Sphere' ? 'Esfera' : kind === 'Cylinder' ? 'Cilindro' : 'Cubo'} ${count}`;
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
    const icon = obj.userData.kind === 'Light' ? '☼' : obj.userData.kind === 'Sphere' ? '●' : obj.userData.kind === 'Cylinder' ? '⬭' : '▣';
    row.innerHTML = `<span class="object-icon">${icon}</span><span class="object-name"></span><span class="visibility">◉</span>`;
    row.querySelector('.object-name').textContent = obj.name;
    row.addEventListener('click', () => selectObject(obj)); list.appendChild(row);
  });
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
function markDirty() { $('save-state').textContent = '● Sin guardar'; $('save-state').classList.add('dirty'); $('status-text').textContent = '● CAMBIOS'; }
function saveScene() {
  try {
    const data = objects.map((o) => ({ name:o.name, kind:o.userData.kind, pos:o.position.toArray(), rot:o.rotation.toArray(), scale:o.scale.toArray(), color:o.userData.color || defaultColor }));
    localStorage.setItem('mobiforge3d-scene', JSON.stringify(data));
    $('save-state').textContent = '● Guardado local'; $('save-state').classList.remove('dirty'); $('status-text').textContent = '● GUARDADO';
  } catch (err) { $('status-text').textContent = '● ERROR AL GUARDAR'; }
}
function loadScene() {
  try {
    const data = JSON.parse(localStorage.getItem('mobiforge3d-scene') || 'null');
    if (!Array.isArray(data)) return false;
    for (const o of [...objects]) removeObject(o);
    for (const item of data) {
      const name = addObject(item.kind || 'Cube', item.name);
      const obj = objects.find((x) => x.name === name);
      if (!obj) continue;
      obj.position.fromArray(item.pos || [0,0.65,0]); obj.rotation.set(...(item.rot || [0,0,0])); obj.scale.fromArray(item.scale || [1,1,1]);
      if (obj.material?.color && item.color) { obj.material.color.set(item.color); obj.userData.color = item.color; }
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
$('play-button').addEventListener('click', () => { playMode = !playMode; $('play-button').textContent = playMode ? '■ Detener' : '▶ Probar'; $('play-button').classList.toggle('playing', playMode); $('status-text').textContent = playMode ? '● MODO PRUEBA' : '● LISTO'; transform.enabled = !playMode; orbit.enabled = !playMode; });
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
function animate() { requestAnimationFrame(animate); orbit.update(); renderer.render(scene,camera); }
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
if (!loadScene()) { addObject('Cube','Cubo'); addObject('Sphere','Esfera'); selectObject(objects[0]); saveScene(); }
