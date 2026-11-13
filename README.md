# Repertorio

Aplicación web para organizar el repertorio musical de la iglesia: canciones con letra y acordes, repertorios para cada culto, modo ensayo y un buscador con filtros avanzados.

Funciona en el navegador (computadora y celular), sin instalar nada y sin conexión a internet. Los datos se guardan en el navegador de cada dispositivo.

## Cómo abrirla

**Opción rápida:** abre `index.html` con doble clic (Chrome, Edge o Firefox).

**Recomendado (para instalar en el celular y usar sin internet):** haz doble clic en `iniciar.bat`. Se abrirá `http://localhost:8080` en el navegador.

> `iniciar.bat` necesita Python instalado (ya está disponible en este equipo).
> Desde el celular, conectado al mismo Wi-Fi, abre `http://IP-DE-TU-PC:8080`.

Para instalarla como app en el celular: menú del navegador → **Añadir a pantalla de inicio**.

## Qué incluye

- **Repertorios:** crea un repertorio por culto o ensayo, añade canciones, ordénalas, ajusta tonalidad o capo por canción, añade notas y marca cuáles ya están listas.
- **Ensayo:** vista guiada canción por canción, con progreso, notas del ensayo, transposición y capo al instante.
- **Canciones:** biblioteca con título, autor, tonalidad, capo, tempo, duración, categoría, dificultad, etiquetas y notas para el equipo.
- **Buscador:** filtra por texto (incluida la letra), tonalidad, categoría, autor, dificultad, rango de BPM, etiquetas y favoritas.
- **Lectura:** transposición de acordes, control de capo, tamaño de letra, desplazamiento automático, impresión/PDF y favoritos.
- **Perfiles de iglesia:** cada iglesia tiene su propia biblioteca en el dispositivo. Puedes exportar tu perfil para compartirlo y otra iglesia puede importarlo en modo solo lectura.
- **Ajustes:** tema claro/oscuro, tamaño de letra, nombre de la iglesia, exportar/importar respaldo y datos de ejemplo.

## Perfiles de iglesia y cómo compartir

Cada iglesia trabaja con su propio **perfil** dentro del mismo dispositivo. Los perfiles están aislados: al cambiar de perfil solo se ven las canciones y repertorios de esa iglesia.

En **Ajustes → Perfil de iglesia** puedes:

- **Nueva iglesia:** crea un perfil vacío con su propia biblioteca.
- **Usar:** cambia al perfil de otra iglesia guardada en el dispositivo.
- **Renombrar / Eliminar:** cambia el nombre del perfil activo o elimínalo (siempre debe quedar al menos uno).
- **Exportar este perfil:** descarga un archivo `perfil-....json` con las canciones y repertorios del perfil activo.

Para compartirlo con otra iglesia, envíale ese archivo (WhatsApp, correo, USB…). La otra iglesia entra en **Ajustes → Importar perfil compartido**, elige el archivo y lo verá en **solo lectura**: puede consultar canciones y repertorios, transportar y usar el modo ensayo, pero no editarlos.

> Si vuelves a importar un perfil que ya habías importado, se actualiza con la versión nueva. Los perfiles compartidos solo se pueden ver: para trabajar con ese contenido, la otra iglesia debe crear su propio perfil y copiar las canciones manualmente.

La privacidad depende de no compartir el archivo: la app no tiene servidor ni cuentas, así que no existe control de acceso remoto.

## Cómo escribir las canciones

Los acordes van en la línea de arriba y la letra debajo, alineados con espacios:

```
G           C
Santo, santo, santo
```

Las secciones se escriben entre corchetes en su propia línea: `[Intro]`, `[Verso 1]`, `[Coro]`, `[Puente]`, `[Final]`.

### Formato ChordPro

El editor incluye el botón **Convertir ChordPro**. Puedes pegar algo como:

```
[Coro]
[G]Santo, santo, [C]santo, [G]Señor
```

y se convierte automáticamente al formato de acordes sobre la letra.

## Respaldo

En **Ajustes → Respaldo de datos** puedes descargar un archivo JSON con todas tus canciones y repertorios, e importarlo en otro dispositivo o restaurarlo más adelante.

## Estructura del proyecto

```
index.html              Pantalla principal
assets/styles.css       Estilos
assets/icon.svg         Icono de la app
js/util.js              Utilidades
js/chords.js            Motor de acordes, transposición y ChordPro
js/store.js             Datos, almacenamiento local y datos de ejemplo
js/ui.js                Componentes de interfaz
js/view-song.js         Vista de canción / lectura
js/view-songs.js        Biblioteca y editor
js/view-setlists.js     Repertorios y modo ensayo
js/view-search.js       Buscador con filtros
js/view-settings.js     Ajustes, perfiles de iglesia y respaldo
js/app.js               Enrutador principal
manifest.webmanifest    Configuración de app instalable
sw.js                   Uso sin conexión
iniciar.bat             Servidor local para Windows
```

## Notas

- Los datos viven en el almacenamiento local del navegador. Si borras los datos del navegador o usas otro dispositivo, necesitas exportar/importar el respaldo.
- Cada perfil de iglesia se guarda también en el almacenamiento local. Al exportar un perfil se incluye solo el contenido de ese perfil.
- La app no envía información a ningún servidor. El aislamiento entre iglesias depende de que no se comparta el archivo del perfil.
- Los datos de ejemplo son himnos tradicionales y canciones de demostración; puedes editarlos o borrarlos.
