# MobiForge 3D

Editor móvil horizontal con interfaz HTML/Three.js y paquete Android Cordova.

- Proyectos con escenas separadas y guardado local; cada escena conserva nodos y scripts.
- Panel de nodos junto al selector de escenas, con categorías 3D y 2D/HUD.
- La vista HUD 2D usa una cámara ortográfica y se compone encima de la escena al probar; sus botones y textos ocupan coordenadas de pantalla.
- CharacterBody3D es solo un nodo corporal básico, no un personaje armado ni un controlador físico completo.
- Inspector con biblioteca de materiales editables: nombre, color, rugosidad y metallicidad.
- Un único acceso principal a Script en la barra superior; Lua por nodo permanece en el Inspector.
- Los separadores entre paneles permiten cambiar el ancho y recordar los tamaños en este dispositivo.
- Importación de GLB autocontenido (modelo escalado para caber en la escena) e imágenes; los archivos se guardan en IndexedDB local.

Es una implementación propia del editor web, inspirada en la organización común de editores 3D; no reutiliza código fuente de Godot. Lua usa Fengari 5.3 y una API acotada del editor. Las plantillas de movimiento aún no tienen física ni colisiones completas. La importación de GLB con archivos externos/enlaces de textura no se admite: usa un GLB que lleve incluidos sus recursos. El build Android no sustituye a la validación visual y táctil en teléfono real.

El workflow **Build MobiForge 3D HTML Android APK** compila el APK debug y lo sube como artefacto de Actions.
