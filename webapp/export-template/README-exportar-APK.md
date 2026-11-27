# Exportar el proyecto como APK Android

MobiForge genera un **paquete de proyecto listo para compilar**. GitHub Actions convierte ese proyecto en una APK Android debug; no es la APK del editor ni una APK vacía/base que luego requiera importar el juego.

## Primera exportación (desde el teléfono)

1. En MobiForge abre tu proyecto y toca **Exportar APK**. Guarda el ZIP.
2. En GitHub crea un repositorio nuevo para el juego (puede ser privado).
3. Descomprime el ZIP en el teléfono y sube **todos los archivos y carpetas a la raíz del repositorio**, incluida la carpeta oculta `.github/workflows` y `game.json`. No subas el ZIP como un único archivo.
4. Al confirmar el commit, el workflow incluido se ejecuta automáticamente. Si GitHub pregunta, habilita Actions.
5. Abre **Actions**, entra al run «Crear APK del juego con MobiForge», y descarga el artefacto **Juego-Android-APK** cuando el run termine en verde. Extrae e instala el APK; Android puede pedir autorización para instalarlo.

## Para volver a exportar después de cambiar el proyecto

Toca **Exportar APK** otra vez, descomprime el nuevo ZIP y reemplaza los archivos del repositorio. El push vuelve a iniciar la compilación automática. También puedes volver a ejecutar el workflow desde Actions.

## Qué trae el juego inicial

- Main y Player, primitivas, posición/rotación/escala y materiales básicos.
- Modelos GLB/GLTF, FBX u OBJ importados, y recursos locales empaquetados. Usa GLB autocontenido para conservar texturas.
- HUD básico (texto, botones visuales e imágenes) y joystick/cámara táctiles en horizontal.
- «Insertar escena» del editor significa **copiar objetos de una escena ya hecha dentro de la escena actual**, como objetos editables independientes, no solo cambiar a otra escena.

## Todavía no soportado

- Ejecutar scripts Lua en el juego exportado.
- Física/colliders configurables, botones HUD con acciones, o cambio de escena durante la partida.
- Texturas externas sueltas referidas por FBX/OBJ/GLTF; algunos modelos pueden perderlas al exportar.
- Firma de producción para Google Play. El artefacto generado es debug para instalar y probar.

El runtime de la APK es propio de MobiForge y está en el ZIP. No es el binario de Godot ni de Unity. El flujo requiere una cuenta GitHub con Actions habilitado; la primera carga del proyecto inicia la compilación Android en GitHub.
