# Compilar el juego como APK Android

El editor prepara un ZIP con tu juego y el código de compilación. GitHub Actions genera un APK de prueba/debug; no es la APK del editor. Para que Android lo compile se necesita GitHub Actions, así que esta primera versión requiere una preparación inicial desde GitHub en el teléfono.

## Preparación inicial del repositorio (una vez)

1. Crea un repositorio nuevo en GitHub para este juego. El ZIP contiene código y modelos del proyecto: elige **privado** si no quieres publicarlos.
2. Descomprime el ZIP en el teléfono. En GitHub abre el repositorio y elige **Add file → Create new file**. En el nombre del archivo escribe `.github/workflows/build-android-apk.yml`.
3. Abre el archivo `build-android-apk.yml` que venía en el ZIP, copia todo su contenido y pégalo en el archivo nuevo de GitHub. Guarda con **Commit changes**.
4. Vuelve a la raíz del repositorio y elige **Add file → Upload files**. Sube el ZIP exportado renombrado exactamente `mobiforge-project.zip` y guarda con **Commit changes**.
5. Abre **Actions** y habilita los workflows si GitHub lo solicita. Ejecuta **Exportar juego a APK Android → Run workflow**.
6. Cuando termine en verde, abre la ejecución y descarga el artefacto **Juego-Android-APK**. Extrae el APK e instálalo; Android puede pedir permiso para instalar desde esa fuente.

## Exportaciones siguientes

Sustituye `mobiforge-project.zip` por el ZIP más reciente en el mismo repositorio (Add file → Upload files, confirmar el reemplazo y hacer commit) y vuelve a ejecutar el workflow. Conserva el archivo `.github/workflows/build-android-apk.yml`.

## Incluido y límites de esta primera versión

- Escenas Main y Player, primitivas, transformaciones, materiales básicos, modelos guardados localmente, imágenes y HUD.
- «Insertar escena» incorpora una copia editable de sus objetos a la escena activa; la copia queda independiente de la escena original.
- Runtime Android offline con cámara/movimiento táctil y modelos GLB/GLTF, FBX y OBJ. Para conservar texturas, usa GLB autocontenido.
- La exportación todavía no ejecuta scripts Lua ni implementa física/colliders configurables, botones HUD interactivos, ni cambios de escena en tiempo de juego. GLTF/FBX/OBJ que dependan de archivos externos pueden perder recursos.
- APK de debug para probar, no una compilación firmada para publicar en Google Play. La instalación/experiencia final requiere probarse en Android.
