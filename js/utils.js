/**
 * utils.js
 * Funciones auxiliares reutilizables: formato de moneda, normalización de texto,
 * validación de URLs/datos y pequeñas utilidades de DOM seguras.
 */

const RUTA_IMAGEN_PLACEHOLDER = 'assets/imagen-placeholder.png';

/**
 * Formatea un número como pesos colombianos, sin decimales y con separador de miles.
 * Para arriendos agrega el sufijo "/mes".
 * @param {number} valor
 * @param {('venta'|'arriendo')} operacion
 * @returns {string}
 */
function formatearPrecio(valor, operacion) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) {
    return 'Precio no disponible';
  }
  const formateado = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(valor));

  const base = `$ ${formateado}`;
  return operacion === 'arriendo' ? `${base}/mes` : base;
}

/**
 * Normaliza una cadena: minúsculas, sin tildes/diacríticos, espacios recortados.
 * Permite comparar "medellin" con "Medellín".
 * @param {string} texto
 * @returns {string}
 */
function normalizarTexto(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Verifica si una cadena parece una URL http(s) válida.
 * @param {string} url
 * @returns {boolean}
 */
function esUrlValida(url) {
  if (typeof url !== 'string' || url.trim() === '') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Devuelve una URL de imagen segura: la original si es válida, o el placeholder.
 * @param {string} url
 * @returns {string}
 */
function urlImagenSegura(url) {
  return esUrlValida(url) ? url : RUTA_IMAGEN_PLACEHOLDER;
}

/**
 * Asigna a un elemento <img> un manejador de error que lo reemplaza
 * por la imagen de placeholder si falla la carga (una sola vez, evitando bucles).
 * @param {HTMLImageElement} imgEl
 */
function protegerImagen(imgEl) {
  if (!imgEl) return;
  imgEl.addEventListener('error', function manejarError() {
    if (imgEl.dataset.fallbackAplicado === 'true') return;
    imgEl.dataset.fallbackAplicado = 'true';
    imgEl.src = RUTA_IMAGEN_PLACEHOLDER;
  });
}

/**
 * Crea un elemento DOM con atributos y texto, sin usar innerHTML.
 * @param {string} tag
 * @param {Object} [opciones]
 * @param {string} [opciones.clase]
 * @param {string} [opciones.texto]
 * @param {Object} [opciones.atributos]
 * @returns {HTMLElement}
 */
function crearElemento(tag, opciones = {}) {
  const el = document.createElement(tag);
  if (opciones.clase) el.className = opciones.clase;
  if (opciones.texto !== undefined) el.textContent = opciones.texto;
  if (opciones.atributos) {
    Object.entries(opciones.atributos).forEach(([clave, valor]) => {
      el.setAttribute(clave, valor);
    });
  }
  return el;
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) a un formato legible en español.
 * @param {string} fechaIso
 * @returns {string}
 */
function formatearFecha(fechaIso) {
  if (!fechaIso) return 'Fecha no disponible';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';
  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Capitaliza la primera letra de una palabra (para mostrar tipos/operaciones).
 * @param {string} texto
 * @returns {string}
 */
function capitalizar(texto) {
  if (typeof texto !== 'string' || texto.length === 0) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Pequeña utilidad de "debounce" para no disparar el filtrado en cada tecla.
 * @param {Function} fn
 * @param {number} espera
 * @returns {Function}
 */
function debounce(fn, espera = 250) {
  let temporizador = null;
  return function (...args) {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn.apply(this, args), espera);
  };
}

/**
 * Divide un arreglo en lotes (chunks) de tamaño fijo.
 * @param {Array} arreglo
 * @param {number} tamano
 * @returns {Array[]}
 */
function dividirEnLotes(arreglo, tamano) {
  const lotes = [];
  for (let i = 0; i < arreglo.length; i += tamano) {
    lotes.push(arreglo.slice(i, i + tamano));
  }
  return lotes;
}

const ETIQUETAS_TIPO = {
  apartamento: 'Apartamento',
  apartaestudio: 'Apartaestudio',
  casa: 'Casa',
  local: 'Local',
  oficina: 'Oficina',
  lote: 'Lote',
};

function etiquetaTipo(tipo) {
  if (!tipo) return 'Inmueble';
  const clave = String(tipo).toLowerCase();
  return ETIQUETAS_TIPO[clave] || capitalizar(clave);
}

const ICONOS_SVG = {
  habitaciones: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
  banos: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5v-4a2 2 0 0 0-2-2H5"/><line x1="10" x2="8" y1="5" y2="7"/><line x1="2" x2="22" y1="22" y2="22"/><line x1="7" x2="7" y1="19" y2="21"/><line x1="17" x2="17" y1="19" y2="21"/></svg>`,
  ubicacion: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
  parqueadero: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car-front preview-icon"><path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"/><path d="M7 14h.01"/><path d="M17 14h.01"/><rect width="18" height="8" x="3" y="10" rx="2"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>`,
  flechaIzquierda: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
};
