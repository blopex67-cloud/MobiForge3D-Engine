# MobiForge 3D — 1.4.0

Editor móvil horizontal con interfaz HTML/Three.js empaquetado con Cordova.

- Proyectos con escenas separadas y guardado local; cada escena conserva sus nodos y scripts.
- El árbol de escena permite crear nodos 3D y 2D/HUD, importar modelos e insertar una escena como copia editable independiente.
- El HUD 2D se superpone a la vista 3D; tiene botones, texto e imágenes. En Play se ocultan gizmos/cuadrícula/ejes y se conserva el suelo; la cámara parte del nodo Player cuando existe.
- `CharacterBody3D` es un nodo corporal básico, no un personaje prefabricado ni un motor físico completo.
- El Inspector permite materiales de proyecto, color, rugosidad y metalicidad; los paneles se pueden redimensionar.
- Importa GLB/GLTF, FBX, OBJ e imágenes PNG/JPG/WebP. Mantén modelos autocontenidos como GLB para que sus texturas viajen con ellos; MTL/archivos externos no se resuelven completamente.
- «Exportar APK» empaqueta el proyecto, recursos, runtime y workflow en `.github/workflows`. Sube el contenido descomprimido a un repo GitHub; Actions compila y publica `Juego-Android-APK`, la APK debug del juego. No es el APK del editor.

## Lua: qué hace actualmente

El editor ejecuta Lua 5.3 mediante Fengari, pero **no interpreta instrucciones en español**: debes escribir sintaxis Lua y llamar a la API `engine` que el editor expone. El botón «Ejecutar» corre el script una vez en el editor. En Play, cada script guardado se ejecuta una vez al entrar; no existe todavía una función `update`/`_process`, callbacks, eventos o temporizador para repetir acciones cada fotograma. Al detener Play se restauran los cambios temporales de prueba. La APK exportada aún no ejecuta Lua.

API expuesta actualmente:

- `engine.node_name()` — nombre del nodo al que pertenece el script.
- `engine.add_cube(nombre)`, `engine.add_sphere(nombre)`, `engine.add_cylinder(nombre)`, `engine.add_sprite(nombre)` — crear un objeto.
- `engine.select(nombre)` — seleccionar otro nodo existente.
- `engine.set_node_position(x, y, z)` — fijar posición del nodo con script.
- `engine.move_node(dx, dy, dz)` — mover ese nodo una vez, respecto a su posición actual.
- `engine.set_selected_position(x, y, z)` y `engine.set_selected_color('#rrggbb')` — actuar sobre la selección del editor.
- `engine.log(...)` o `print(...)` — escribir en la salida del panel Lua.

Ejemplo para mover el nodo seleccionado medio metro en X cada vez que pulses «Ejecutar»:

```lua
engine.move_node(0.5, 0, 0)
print("Nodo movido:", engine.node_name())
```

No están implementadas las API de Godot como `self.position`, `get_node()`, `_process(delta)`, señales, físicas o colisiones; usar esas llamadas no mueve el objeto y puede dar un error Lua. Los controles disponibles son solo los enumerados arriba.

La compilación de CI comprueba el empaquetado; no sustituye una prueba visual/táctil en un teléfono ni una exportación real de un juego.
