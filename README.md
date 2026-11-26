# Conaltura Inmobiliaria — Pagina Web Catálogo de inmuebles

Aplicación web (HTML + CSS + JavaScript ) para consultar, filtrar y visualizar los inmuebles en venta y arriendo de la API de Conaltura.

## Cómo correr el proyecto

1. Clona el proyecto.
2. Configura la llave de la API, mas adelante esta detallado.
3. Abre `index.html` directamente en el navegador.

No hay dependencias que instalar.

### Configurar la llave de la API

La URL base y la `X-API-Key` viven en `js/config.js`.

1. Copia `js/config.ejemplo.js` y renómbralo a `js/config.js`.
2. Reemplaza los valores de ejemplo por los reales:

```js
const CONFIG_API = {
  BASE_URL: 'https://www.api/inmuebles',
  API_KEY: 'X_API_KEY',
};
```

3. `js/api.js` lee estas constantes; si `config.js` no existe, la aplicación lanza un error explícito en consola en vez de fallar en silencio.

## Paginación y filtros:

La API solo pagina (`pagina`, `por_pagina`) y no permite filtrar en el servidor, así que toda la lógica de filtrado vive en el frontend sobre el catálogo completo, no solo sobre la primera página.

**Metodo**
1. Se consulta la página 1 para obtener `total_paginas`.
2. Las páginas restantes se piden en lotes concurrentes controlados, 5 peticiones simultáneas en lugar de lanzar todas a la vez, para no saturar el servidor ni el navegador.
3. Cada página fallida se reintenta dos veces antes de darse por perdida; si alguna termina fallando igual, se avisa al usuario en vez de mostrar un catálogo incompleto como si fuera el total.
4. Los inmuebles se consolidan en un `Map` indexado por `id` para evitar duplicados entre páginas.
5. Todo el catálogo queda en memoria (`estado.todos`), y los filtros (`filtros.js`) se aplican ahí mismo con lógica AND: operación, tipo, ciudad, rango de precio, habitaciones mínimas y búsqueda de texto normalizada con `normalize('NFD')` para ignorar tildes/mayúsculas, más el ordenamiento. Cada cambio de filtro recalcula sobre la colección completa, sin volver a consultar la API.
6. Para el renderizado se usa paginación visual ("Mostrar más"): aunque el filtrado corre sobre todo el catálogo, el DOM solo pinta de a 12 tarjetas a la vez, para no sobrecargar la página cuando el catalogo es grande.

## Qué quedó pendiente o qué mejoraría con más tiempo

- **Contacto con un asesor**: agregaría información de la inmobiliaria (dirección, teléfono, horario) y un botón directo de contacto WhatsApp o formulario en la página, para que quien tenga dudas o interés en un inmueble pueda escribir a un asesor sin salir de la app.
- **Mapa real**: hoy la ubicación no es muy precisa, con más tiempo integraría un mapa señalando la dirección exacta directamente en la página de detalle del inmueble.
- **Favoritos**: guardar inmuebles de interés en `localStorage` para que el usuario pueda volver a verlos sin tener que repetir la búsqueda.
- **Compartir filtros por URL**: hoy los filtros se pierden al refrescar; podrían reflejarse en la query string para poder compartir un enlace con un filtro ya aplicado.

## Tiempo invertido

Aproximadamente 5 horas, repartidas entre el diseño de la arquitectura: separación de responsabilidades entre `api.js`, `inmuebles.js`, `filtros.js`, `detalle.js`, `utils.js`, la estrategia de carga/paginación, el sistema de filtros, el diseño visual responsive, y los detalles como vista de la imagenes, icones, colores etc.
