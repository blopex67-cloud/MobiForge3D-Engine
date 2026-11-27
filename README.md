# MobiForge 3D

Editor 3D para teléfonos, con interfaz HTML/CSS/JavaScript, empaquetado Android en orientación horizontal.

## Organización actual
- **Proyectos:** pantalla de inicio con plantillas vacía, primera persona y tercera persona; proyectos y escenas se guardan por separado en el almacenamiento local.
- **2D:** espacio XY con sprites y gizmos, y modo de visualización separado.
- **3D:** visor táctil, jerarquía, creación de primitivas, inspector y gizmos de mover, rotar y escalar.
- **Script:** panel Lua 5.3 con API del editor y registro de ejecución.
- **Iconos:** Lucide, empaquetados en la app para que no dependan de conexión durante el uso.

Las plantillas de primera y tercera persona incluyen un personaje inicial, escenario sencillo, teclado y control táctil en modo Probar. Es una base de aprendizaje: todavía no es un motor completo equivalente a Unity, Godot o Unreal. El movimiento de ejemplo no es un sistema de físicas/collisiones completo y el sandbox Lua no ejecuta extensiones nativas arbitrarias.

## Build Android
El workflow **Build MobiForge 3D HTML Android APK** compila la interfaz web y la empaqueta mediante Cordova en un APK debug. Compilar no sustituye a una prueba visual/táctil en un teléfono real.

El prototipo Godot previo se conserva en `Main.tscn`, `scripts/editor.gd`, `project.godot` y `export_presets.cfg`.
