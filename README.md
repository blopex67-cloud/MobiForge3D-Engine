# MobiForge 3D

Editor móvil horizontal con interfaz HTML/Three.js empaquetado con Cordova.

- Proyectos con escenas separadas y guardado local; cada escena conserva sus nodos y scripts.
- El botón `+` junto al selector de escenas abre un selector de nodos categorizado como en un editor 3D: nodos 3D y nodos 2D/HUD.
- El HUD 2D vive en coordenadas de pantalla y se superpone a la vista 3D; tiene botones, texto y sprites. En Probar los gizmos se ocultan.
- `CharacterBody3D` es un nodo corporal básico para construir un personaje, no un personaje completo prefabricado ni un motor físico.
- El Inspector deja crear materiales reutilizables por proyecto y editar nombre, color base, rugosidad y metallicidad.
- Un solo editor Lua está en la pestaña superior Script y edita el código del nodo seleccionado; cada nodo guarda su propio texto Lua con la escena.
- Los separadores entre paneles permiten arrastrar sus anchos y guardarlos localmente.
- El botón superior visible «Importar» abre el selector de archivos Android. Acepta GLB/GLTF, FBX, OBJ e imágenes PNG/JPG/WebP. Los archivos se guardan en IndexedDB local; las imágenes entran en la capa HUD. GLTF/FBX con recursos externos separados pueden requerir empaquetar antes sus texturas; OBJ se importa como geometría, sin resolver materiales MTL externos.
- La versión actual no exporta un APK independiente del juego creado. El APK de Actions empaqueta el editor MobiForge, no el juego del usuario; hace falta un pipeline de exportación del proyecto para generar ese APK y todavía no está implementado.

El editor usa implementación propia, inspirada en convenciones de organización de editores 3D; no copia el código fuente de Godot. Lua se ejecuta con Fengari/Lua 5.3 y la API del editor es acotada. Los controles de personaje son iniciales; no equivalen a una implementación completa de físicas y colisiones. Compilar no sustituye a probar visual y táctilmente en un teléfono real.

El workflow **Build MobiForge 3D HTML Android APK** genera un APK debug y lo publica como artefacto de Actions.
