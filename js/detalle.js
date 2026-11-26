/**
 * detalle.js
 * Consulta y representa la información detallada de un inmueble a partir
 * del parámetro ?id= de la URL. Maneja galería de fotos, estados de carga
 * y error, y la visualización de la ubicación geográfica.
 */

const elementosDetalle = {};
let fotosGaleria = [];
let indiceFotoActual = 0;

function cachearElementosDetalle() {
  elementosDetalle.cargando = document.getElementById('detalle-cargando');
  elementosDetalle.error = document.getElementById('detalle-error');
  elementosDetalle.contenido = document.getElementById('detalle-contenido');
  elementosDetalle.errorTitulo = document.getElementById('detalle-error-titulo');
  elementosDetalle.errorDetalle = document.getElementById('detalle-error-detalle');
  elementosDetalle.botonReintentar = document.getElementById('detalle-boton-reintentar');

  elementosDetalle.imagenPrincipal = document.getElementById('galeria-imagen-principal');
  elementosDetalle.miniaturas = document.getElementById('galeria-miniaturas');
  elementosDetalle.botonAnterior = document.getElementById('galeria-anterior');
  elementosDetalle.botonSiguiente = document.getElementById('galeria-siguiente');
  elementosDetalle.contador = document.getElementById('galeria-contador');

  elementosDetalle.etiquetaOperacion = document.getElementById('detalle-etiqueta-operacion');
  elementosDetalle.titulo = document.getElementById('detalle-titulo');
  elementosDetalle.ubicacion = document.getElementById('detalle-ubicacion');
  elementosDetalle.precio = document.getElementById('detalle-precio');
  elementosDetalle.caracteristicas = document.getElementById('detalle-caracteristicas');
  elementosDetalle.descripcion = document.getElementById('detalle-descripcion');
  elementosDetalle.coordenadasTexto = document.getElementById('detalle-coordenadas');
}

function obtenerIdDesdeUrl() {
  const parametros = new URLSearchParams(window.location.search);
  return parametros.get('id');
}

function mostrarCargando() {
  elementosDetalle.cargando.classList.remove('estado-info--oculto');
  elementosDetalle.error.classList.add('estado-info--oculto');
  elementosDetalle.contenido.classList.add('detalle__contenido--oculto');
}

function mostrarErrorDetalle(titulo, detalle) {
  elementosDetalle.cargando.classList.add('estado-info--oculto');
  elementosDetalle.contenido.classList.add('detalle__contenido--oculto');
  elementosDetalle.error.classList.remove('estado-info--oculto');
  elementosDetalle.errorTitulo.textContent = titulo;
  elementosDetalle.errorDetalle.textContent = detalle || '';
}

function mostrarContenido() {
  elementosDetalle.cargando.classList.add('estado-info--oculto');
  elementosDetalle.error.classList.add('estado-info--oculto');
  elementosDetalle.contenido.classList.remove('detalle__contenido--oculto');
}

// ------------------------------------------------------------- Galería

function inicializarGaleria(inmueble) {
  const lista = Array.isArray(inmueble.fotos) && inmueble.fotos.length > 0 ? inmueble.fotos : [inmueble.foto_principal];
  fotosGaleria = lista.filter((url) => esUrlValida(url));
  if (fotosGaleria.length === 0) fotosGaleria = [RUTA_IMAGEN_PLACEHOLDER];
  indiceFotoActual = 0;

  elementosDetalle.miniaturas.textContent = '';
  fotosGaleria.forEach((url, indice) => {
    const boton = crearElemento('button', { clase: 'galeria__miniatura', atributos: { type: 'button' } });
    const img = crearElemento('img', { atributos: { src: url, alt: `Foto ${indice + 1} del inmueble`, loading: 'lazy' } });
    protegerImagen(img);
    boton.appendChild(img);
    boton.addEventListener('click', () => mostrarFoto(indice));
    elementosDetalle.miniaturas.appendChild(boton);
  });

  protegerImagen(elementosDetalle.imagenPrincipal);
  mostrarFoto(0);

  const haySoloUna = fotosGaleria.length <= 1;
  elementosDetalle.botonAnterior.classList.toggle('estado-info--oculto', haySoloUna);
  elementosDetalle.botonSiguiente.classList.toggle('estado-info--oculto', haySoloUna);
}

function mostrarFoto(indice) {
  indiceFotoActual = (indice + fotosGaleria.length) % fotosGaleria.length;
  elementosDetalle.imagenPrincipal.dataset.fallbackAplicado = 'false';
  elementosDetalle.imagenPrincipal.src = fotosGaleria[indiceFotoActual];
  elementosDetalle.contador.textContent = `${indiceFotoActual + 1} / ${fotosGaleria.length}`;

  document.querySelectorAll('.galeria__miniatura').forEach((miniatura, i) => {
    miniatura.classList.toggle('activa', i === indiceFotoActual);
  });
}

function configurarControlesGaleria() {
  elementosDetalle.botonAnterior.addEventListener('click', () => mostrarFoto(indiceFotoActual - 1));
  elementosDetalle.botonSiguiente.addEventListener('click', () => mostrarFoto(indiceFotoActual + 1));
}

// ---------------------------------------------------------------- Pintar

//Acepta un tercer parametro opcional para el icono
function crearCaracteristica(etiqueta, valor, claveIcono) {
  const contenedor = document.createElement('div');
  const dt = crearElemento('dt', {});
  if (claveIcono && ICONOS_SVG[claveIcono]) {
    const spanIcono = document.createElement('span');
    spanIcono.className = 'icono-caracteristica';
    spanIcono.innerHTML = ICONOS_SVG[claveIcono]; 
    dt.appendChild(spanIcono);
  }
  dt.appendChild(document.createTextNode(etiqueta));
  contenedor.appendChild(dt);
  contenedor.appendChild(crearElemento('dd', { texto: valor }));
  return contenedor;
}

function pintarDetalle(inmueble) {
  const esArriendo = inmueble.operacion === 'arriendo';
  elementosDetalle.etiquetaOperacion.textContent = capitalizar(inmueble.operacion || '');
  elementosDetalle.etiquetaOperacion.className = `etiqueta-operacion ${esArriendo ? 'arriendo' : 'venta'}`;

  elementosDetalle.titulo.textContent = inmueble.titulo || 'Inmueble sin título';
  // elementosDetalle.ubicacion.textContent = [inmueble.barrio, inmueble.ciudad].filter(Boolean).join(', ');
  //Agregar icono ubicación
  elementosDetalle.ubicacion.textContent = '';
  const spanIconoUbicacion = document.createElement('span');
  spanIconoUbicacion.className = 'icono-caracteristica';
  spanIconoUbicacion.innerHTML = ICONOS_SVG.ubicacion;
  elementosDetalle.ubicacion.appendChild(spanIconoUbicacion);
  elementosDetalle.ubicacion.appendChild(
    document.createTextNode([inmueble.barrio, inmueble.ciudad].filter(Boolean).join(', '))
  );
  elementosDetalle.precio.textContent = formatearPrecio(Number(inmueble.precio), inmueble.operacion);

  document.title = `${inmueble.titulo || 'Inmueble'} · Conaltura Inmobiliaria`;

  elementosDetalle.caracteristicas.textContent = '';
  const filas = [
    ['Tipo de inmueble', etiquetaTipo(inmueble.tipo)],
    ['Área', inmueble.area_m2 ? `${inmueble.area_m2} m²` : 'No disponible'],
    ['Habitaciones', inmueble.habitaciones ?? 'No disponible', 'habitaciones'],
    ['Baños', inmueble.banos ?? 'No disponible', 'banos'],
    ['Parqueaderos', inmueble.parqueaderos ?? 'No disponible', 'parqueadero'],
    ['Estrato', inmueble.estrato ?? 'No disponible'],
    ['Administración', inmueble.administracion ? formatearPrecio(Number(inmueble.administracion)) : 'Incluida / no aplica'],
    ['Publicado', formatearFecha(inmueble.publicado)],
  ];
  // elementosDetalle.caracteristicas.appendChild(crearCaracteristica('Habitaciones', String(inmueble.habitaciones ?? 'No disponible'), 'habitaciones'));
  // elementosDetalle.caracteristicas.appendChild(crearCaracteristica('Baños', String(inmueble.banos ?? 'No disponible'), 'banos'));
  // elementosDetalle.caracteristicas.appendChild(crearCaracteristica('Parqueaderos', String(inmueble.parqueaderos ?? 'No disponible'), 'parqueadero'));
  filas.forEach(([etiqueta, valor, claveIcono]) => {
    elementosDetalle.caracteristicas.appendChild(crearCaracteristica(etiqueta, String(valor), claveIcono));
  });

  elementosDetalle.descripcion.textContent = inmueble.descripcion || 'Este inmueble no cuenta con una descripción adicional.';

  inicializarGaleria(inmueble);
}

// ----------------------------------------------------------------- Carga

async function cargarDetalle() {
  const id = obtenerIdDesdeUrl();
  if (!id) {
    mostrarErrorDetalle('No se indicó un inmueble para consultar.', 'Vuelve al catálogo y selecciona una tarjeta.');
    return;
  }

  mostrarCargando();
  try {
    const inmueble = await obtenerDetalleInmueble(id);
    if (!inmueble || inmueble.id === undefined) {
      mostrarErrorDetalle('No encontramos este inmueble.', 'Puede que ya no esté disponible.');
      return;
    }
    pintarDetalle(inmueble);
    mostrarContenido();
  } catch (error) {
    if (error?.esNoAutorizado) {
      mostrarErrorDetalle(
        'No fue posible autorizar la consulta ante el servidor.',
        'Inténtalo nuevamente en unos segundos.'
      );
    } else {
      mostrarErrorDetalle(
        'No fue posible cargar este inmueble.',
        error?.message || 'Ocurrió un error de conexión. Inténtalo nuevamente.'
      );
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cachearElementosDetalle();
  configurarControlesGaleria();
  elementosDetalle.botonReintentar.addEventListener('click', cargarDetalle);
  cargarDetalle();
});
