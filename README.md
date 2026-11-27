# MobiForge 3D

Editor móvil horizontal con interfaz HTML/Three.js, empaquetado con Cordova.

- Pantalla de proyectos con guardado local automático y escenas independientes por proyecto.
- Espacios Proyectos, 2D, 3D y Script.
- Nodos básicos para objetos 3D, HUD 2D, botones, texto, cámara, audio y personaje.
- Script Lua editable por nodo, guardado con la escena; el sandbox expone una API acotada del editor.
- En Probar se ocultan gizmos; al detener se restaura la escena del editor para que cada ejecución vuelva al spawn.
- Plantillas de aprendizaje en primera y tercera persona con controles táctiles/teclado.
- Importación de modelos GLB autocontenidos e imágenes, guardados localmente en IndexedDB.

Es una implementación propia del editor web, inspirada en flujos habituales de motores 3D; no copia código fuente de Godot. Lua usa Fengari/Lua 5.3, pero no ejecuta módulos nativos arbitrarios. Los personajes son plantillas de inicio, no sistemas completos de físicas o colisiones. Compilar no sustituye a validar visual y táctilmente en un teléfono real.

El workflow **Build MobiForge 3D HTML Android APK** compila el proyecto y publica el APK debug como artefacto de Actions.
