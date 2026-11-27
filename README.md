# MobiForge 3D

**Editor 3D para teléfonos, con interfaz HTML y orientación horizontal.**

El proyecto conserva la alpha original de Godot como referencia (`Main.tscn` y archivos GDScript) y ahora incorpora una interfaz móvil HTML/CSS/JavaScript en `webapp/`, empaquetada en Android mediante Cordova. Esta es una base de editor, no un motor completo equivalente a Unity, Godot o Unreal.

## Funciones de la interfaz HTML

- Vista 3D en tiempo real con cámara orbital táctil, iluminación y cuadrícula.
- Jerarquía y selección de objetos tocándolos en el visor.
- Crear cubos, esferas, cilindros y luces.
- Gizmos de mover, rotar y escalar; inspector numérico y edición de color.
- Guardado local de la escena en el dispositivo.
- Panel para ejecutar scripts Lua dentro del editor.
- Empaquetado Android en orientación horizontal.

## Lua

La app integra Fengari, una máquina virtual con semántica de Lua 5.3 ejecutada en JavaScript. Incluye las bibliotecas de Lua que Fengari soporta en navegador y una API del editor: `engine.add_cube(nombre)`, `engine.add_sphere(nombre)`, `engine.add_cylinder(nombre)`, `engine.select(nombre)`, `engine.set_selected_position(x, y, z)`, `engine.set_selected_color(hex)` y `print(...)`.

Esto permite correr código Lua normal compatible con ese runtime, pero no significa que acepte automáticamente cualquier extensión externa: módulos nativos/C, módulos de terceros no incluidos y operaciones de sistema de archivos del entorno de escritorio no forman parte del sandbox web.

## Compilar Android

Cada actualización de `main` ejecuta el workflow **Build MobiForge 3D HTML Android APK**. El APK debug se publica como artefacto de GitHub Actions. También se puede lanzar manualmente desde **Actions**.

## Estructura

- `webapp/`: interfaz HTML, estilos, Three.js y runtime Lua.
- `Main.tscn`, `scripts/editor.gd`, `project.godot`: alpha Godot original conservada.
- `.github/workflows/android-apk.yml`: empaqueta la interfaz web para Android/Cordova.

La app sigue en alpha: no incluye importación GLB, físicas completas, animación, gestión de assets ni exportación de juegos creados dentro del editor. La compilación del APK tampoco equivale a una prueba en un teléfono real.
