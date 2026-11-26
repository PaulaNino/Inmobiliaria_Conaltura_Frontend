/**
 * api.js
 * Centraliza todas las peticiones HTTP a la API inmobiliaria:
 * - Construcción de la petición base (headers, manejo de errores HTTP).
 * - Endpoint de listado paginado.
 * - Endpoint de detalle por id.
 * - Endpoint de ciudades.
 * - Estrategia de carga de todas las páginas con concurrencia controlada,
 *   deduplicación por id y reporte de progreso.
 */

if (typeof CONFIG_API === 'undefined') {
  throw new Error(
    'Falta js/config.js. Copia js/config.ejemplo.js como js/config.js y coloca tus credenciales.'
  );
}
const API_BASE_URL = CONFIG_API.BASE_URL;
const API_KEY = CONFIG_API.API_KEY;


// Cuántas peticiones de página se permiten en vuelo al mismo tiempo.
const TAMANO_LOTE_CONCURRENCIA = 5;
// Reintentos automáticos por página antes de reportarla como fallida.
const REINTENTOS_POR_PAGINA = 2;

/**
 * Error personalizado que conserva el código HTTP y si fue un 401.
 */
class ErrorApi extends Error {
  constructor(mensaje, { status = null, esAbortado = false } = {}) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
    this.esAbortado = esAbortado;
    this.esNoAutorizado = status === 401;
  }
}

/**
 * Realiza una petición GET a la API con el header de autenticación requerido.
 * @param {string} ruta - ruta relativa, ej: '/inmuebles?pagina=1&por_pagina=12'
 * @param {Object} [opciones]
 * @param {AbortSignal} [opciones.signal]
 * @returns {Promise<any>} JSON parseado
 */
async function peticionApi(ruta, { signal } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      headers: { 'X-API-Key': API_KEY },
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ErrorApi('Solicitud cancelada', { esAbortado: true });
    }
    throw new ErrorApi('No fue posible conectar con el servidor. Verifica tu conexión a internet.', {
      status: null,
    });
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401) {
      throw new ErrorApi('No fue posible autorizar la consulta ante el servidor.', { status: 401 });
    }
    throw new ErrorApi(`El servidor respondió con un error (código ${respuesta.status}).`, {
      status: respuesta.status,
    });
  }

  try {
    return await respuesta.json();
  } catch {
    throw new ErrorApi('La respuesta del servidor no tiene un formato válido.', { status: respuesta.status });
  }
}

/**
 * Consulta una página del listado de inmuebles.
 * @param {number} pagina
 * @param {number} porPagina
 * @param {AbortSignal} [signal]
 */
async function obtenerPaginaInmuebles(pagina, porPagina = 24, signal) {
  return peticionApi(`/inmuebles?pagina=${pagina}&por_pagina=${porPagina}`, { signal });
}

/**
 * Consulta el detalle completo de un inmueble.
 * @param {number|string} id
 * @param {AbortSignal} [signal]
 */
async function obtenerDetalleInmueble(id, signal) {
  return peticionApi(`/inmuebles/${encodeURIComponent(id)}`, { signal });
}

/**
 * Consulta el listado de ciudades disponibles para filtrar.
 * @param {AbortSignal} [signal]
 */
async function obtenerCiudades(signal) {
  const datos = await peticionApi('/ciudades', { signal });
  return Array.isArray(datos?.datos) ? datos.datos : [];
}

/**
 * Descarga la totalidad del catálogo de inmuebles, consultando primero la
 * página 1 para conocer el total de páginas, y luego el resto en lotes
 * concurrentes controlados. Deduplica por id y reintenta páginas fallidas.
 *
 * @param {Object} opciones
 * @param {number} [opciones.porPagina=24]
 * @param {(progreso: {cargadas: number, total: number}) => void} [opciones.onProgreso]
 * @param {AbortSignal} [opciones.signal]
 * @returns {Promise<{inmuebles: Object[], paginasFallidas: number[]}>}
 */
async function cargarCatalogoCompleto({ porPagina = 24, onProgreso, signal } = {}) {
  const primeraPagina = await obtenerPaginaInmuebles(1, porPagina, signal);
  const totalPaginas = Number(primeraPagina?.total_paginas) || 1;

  const mapaInmuebles = new Map();
  (primeraPagina?.datos || []).forEach((inmueble) => {
    if (inmueble && inmueble.id !== undefined) mapaInmuebles.set(inmueble.id, inmueble);
  });

  let cargadas = 1;
  const paginasFallidas = [];
  const notificarProgreso = () => {
    if (typeof onProgreso === 'function') {
      onProgreso({ cargadas, total: totalPaginas });
    }
  };
  notificarProgreso();

  const paginasRestantes = [];
  for (let p = 2; p <= totalPaginas; p += 1) paginasRestantes.push(p);

  const lotes = dividirEnLotes(paginasRestantes, TAMANO_LOTE_CONCURRENCIA);

  for (const lote of lotes) {
    const resultados = await Promise.allSettled(
      lote.map((numeroPagina) =>
        obtenerPaginaConReintentos(numeroPagina, porPagina, signal)
      )
    );

    resultados.forEach((resultado, indice) => {
      const numeroPagina = lote[indice];
      if (resultado.status === 'fulfilled') {
        (resultado.value?.datos || []).forEach((inmueble) => {
          if (inmueble && inmueble.id !== undefined) mapaInmuebles.set(inmueble.id, inmueble);
        });
      } else if (resultado.reason?.esAbortado) {
        throw resultado.reason;
      } else {
        paginasFallidas.push(numeroPagina);
      }
      cargadas += 1;
    });

    notificarProgreso();
  }

  return {
    inmuebles: Array.from(mapaInmuebles.values()),
    paginasFallidas,
    totalEsperado: Number(primeraPagina?.total) || mapaInmuebles.size,
  };
}

/**
 * Intenta obtener una página varias veces antes de darla por fallida.
 */
async function obtenerPaginaConReintentos(numeroPagina, porPagina, signal) {
  let ultimoError;
  for (let intento = 0; intento <= REINTENTOS_POR_PAGINA; intento += 1) {
    try {
      return await obtenerPaginaInmuebles(numeroPagina, porPagina, signal);
    } catch (error) {
      ultimoError = error;
      if (error.esAbortado || error.esNoAutorizado) throw error;
    }
  }
  throw ultimoError;
}
