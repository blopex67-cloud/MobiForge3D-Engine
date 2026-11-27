# MobiForge 3D

**Un editor 3D móvil en horizontal para empezar a crear videojuegos desde el teléfono.**

MobiForge 3D es el primer prototipo de un proyecto propio de editor/engine móvil. Esta versión se apoya en **Godot 4.4.1** como motor de renderizado y exportación: todavía no es un motor gráfico independiente escrito desde cero ni un reemplazo de Unity/Unreal.

## Lo que incluye esta primera versión

- Interfaz de editor en español diseñada para pantalla horizontal.
- Visor 3D en tiempo real con cámara orbital táctil, iluminación y cuadrícula.
- Jerarquía de escena y selección de objetos.
- Añadir cubos, esferas y luces de prueba.
- Inspector con posición, rotación y escala editables.
- Vista de prueba con animación simple.
- Guardado local de la escena en JSON (`user://mi_primer_juego.json`).
- Exportación automatizada de APK Android por GitHub Actions.

## Primer APK / instalar

Cada cambio en `main` ejecuta `Build Android APK`. El archivo se publica como artefacto de la ejecución de GitHub Actions. También se puede iniciar manualmente desde la pestaña **Actions**.

La APK de esta etapa es una **alpha de editor**. No incluye todavía importación de GLB, scripts visuales, animación avanzada, física, sistema de assets ni exportación de juegos creados dentro del editor. Esos son hitos posteriores, no funciones ya terminadas.

## Desarrollo

- Motor base: Godot 4.4.1.
- Lenguaje: GDScript.
- Renderizador: Compatibility (pensado para compatibilidad móvil).
- Orientación: horizontal.
- Paquete Android: `com.blopex.mobiforge3d`.

Abre este directorio con Godot 4.4.1 o posterior y ejecuta `Main.tscn`.
