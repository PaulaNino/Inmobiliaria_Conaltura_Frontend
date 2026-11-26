/**
 * inmuebles.js
 * Orquesta la carga completa del catálogo (usando api.js), mantiene la
 * colección en memoria, delega el filtrado/orden a ModuloFiltros y se
 * encarga de representar visualmente las tarjetas y los distintos estados
 * de la interfaz (cargando, error, sin resultados).
 */

const TAMANO_PAGINA_VISUAL = 12;

const estado = {
  todos: [],
  filtrados: [],
  cantidadVisible: TAMANO_PAGINA_VISUAL,
  paginasFallidas: [],
};

let controladorCarga = null;

// ------------------------------------------------------------- Elementos

const elementos = {};

function cachearElementos() {
  elementos.estadoCargando = document.getElementById('estado-cargando');
  elementos.estadoError = document.getElementById('estado-error');
  elementos.estadoSinResultados = document.getElementById('estado-sin-resultados');
  elementos.rejilla = document.getElementById('rejilla-inmuebles');
  elementos.textoResultados = document.getElementById('texto-resultados');
  elementos.textoProgreso = document.getElementById('texto-progreso-carga');
  elementos.textoErrorTitulo = document.getElementById('texto-error-titulo');
  elementos.textoErrorDetalle = document.getElementById('texto-error-detalle');
  elementos.botonReintentar = document.getElementById('boton-reintentar');
  elementos.botonCargarMas = document.getElementById('boton-cargar-mas');
}

// ---------------------------------------------------------------- Estados

function mostrarSoloEstado(nombre) {
  elementos.estadoCargando.classList.toggle('estado-info--oculto', nombre !== 'cargando');
  elementos.estadoError.classList.toggle('estado-info--oculto', nombre !== 'error');
  elementos.estadoSinResultados.classList.toggle('estado-info--oculto', nombre !== 'vacio');
  elementos.rejilla.setAttribute('aria-hidden', nombre === 'resultados' ? 'false' : 'true');
  if (nombre !== 'resultados') {
    elementos.rejilla.textContent = '';
    elementos.botonCargarMas.classList.add('boton-secundario--oculto');
  }
}

function mostrarError(titulo, detalle) {
  elementos.textoErrorTitulo.textContent = titulo;
  elementos.textoErrorDetalle.textContent = detalle || '';
  mostrarSoloEstado('error');
}

// ----------------------------------------------------------------- Carga

async function cargarCatalogo() {
  const avisoPrevio = document.getElementById('aviso-carga-parcial');
  if (avisoPrevio) avisoPrevio.remove();

  mostrarSoloEstado('cargando');
  elementos.textoResultados.textContent = 'Cargando inmuebles…';
  elementos.textoProgreso.textContent = 'Cargando inmuebles…';

  if (controladorCarga) controladorCarga.abort();
  controladorCarga = new AbortController();

  try {
    const { inmuebles, paginasFallidas } = await cargarCatalogoCompleto({
      porPagina: 24,
      signal: controladorCarga.signal,
      onProgreso: ({ cargadas, total }) => {
        elementos.textoProgreso.textContent = `Cargando inmuebles…`;
        // elementos.textoProgreso.textContent = `Consultando página ${Math.min(cargadas, total)} de ${total}`;
      },
    });

    estado.todos = inmuebles;
    estado.paginasFallidas = paginasFallidas;

    if (paginasFallidas.length > 0) {
      // No se presenta silenciosamente una colección incompleta: se avisa,
      // pero se permite seguir explorando lo que sí se pudo cargar.
      elementos.textoProgreso.textContent = '';
      console.warn(`No se pudieron cargar ${paginasFallidas.length} página(s) del catálogo.`);
    }

    aplicarFiltrosYRenderizar();

    if (paginasFallidas.length > 0) {
      mostrarAvisoCargaParcial(paginasFallidas.length);
    }
  } catch (error) {
    if (error?.esAbortado) return;
    if (error?.esNoAutorizado) {
      mostrarError(
        'No fue posible autorizar la consulta ante el servidor.',
        'Verifica la credencial de acceso configurada e inténtalo nuevamente.'
      );
    } else {
      mostrarError(
        'No fue posible cargar los inmuebles.',
        error?.message || 'Ocurrió un error de conexión. Verifica tu internet e inténtalo de nuevo.'
      );
    }
  }
}

function mostrarAvisoCargaParcial(cantidadFallidas) {
  const existente = document.getElementById('aviso-carga-parcial');
  if (existente) existente.remove();

  const aviso = document.createElement('p');
  aviso.id = 'aviso-carga-parcial';
  aviso.className = 'estado-info__detalle';
  aviso.style.color = '#b45309';
  aviso.textContent = `Aviso: ${cantidadFallidas} página(s) del catálogo no pudieron cargarse. Los resultados podrían estar incompletos.`;
  elementos.rejilla.insertAdjacentElement('beforebegin', aviso);
}

// ------------------------------------------------------------ Filtrado

function aplicarFiltrosYRenderizar() {
  estado.filtrados = ModuloFiltros.obtenerFiltrados(estado.todos);
  estado.cantidadVisible = TAMANO_PAGINA_VISUAL;
  renderizarResultados();
}

function renderizarResultados() {
  const total = estado.filtrados.length;

  if (total === 0) {
    elementos.textoResultados.textContent = '0 inmuebles encontrados';
    mostrarSoloEstado('vacio');
    return;
  }

  elementos.textoResultados.textContent = `${total} inmueble${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`;
  mostrarSoloEstado('resultados');

  const visibles = estado.filtrados.slice(0, estado.cantidadVisible);
  elementos.rejilla.textContent = '';
  const fragmento = document.createDocumentFragment();
  visibles.forEach((inmueble) => fragmento.appendChild(crearTarjetaInmueble(inmueble)));
  elementos.rejilla.appendChild(fragmento);

  const quedanMas = estado.cantidadVisible < total;
  elementos.botonCargarMas.classList.toggle('boton-secundario--oculto', !quedanMas);
}

// ------------------------------------------------------------- Tarjetas

function crearTarjetaInmueble(inmueble) {
  const tarjeta = crearElemento('a', {
    clase: 'tarjeta-inmueble',
    atributos: { href: `detalle.html?id=${encodeURIComponent(inmueble.id)}` },
  });

  const contenedorImagen = crearElemento('div', { clase: 'tarjeta-inmueble__imagen-contenedor' });
  const imagen = crearElemento('img', {
    clase: 'tarjeta-inmueble__imagen',
    atributos: {
      src: urlImagenSegura(inmueble.foto_principal),
      alt: inmueble.titulo || 'Fotografía del inmueble',
      loading: 'lazy',
    },
  });
  protegerImagen(imagen);
  contenedorImagen.appendChild(imagen);

  const etiquetaOperacion = crearElemento('span', {
    clase: `etiqueta-operacion ${inmueble.operacion === 'arriendo' ? 'arriendo' : 'venta'}`,
    texto: capitalizar(inmueble.operacion || ''),
  });
  contenedorImagen.appendChild(etiquetaOperacion);

  if (inmueble.tipo) {
    const etiquetaTipoEl = crearElemento('span', {
      clase: 'tarjeta-inmueble__tipo',
      texto: etiquetaTipo(inmueble.tipo),
    });
    contenedorImagen.appendChild(etiquetaTipoEl);
  }

  tarjeta.appendChild(contenedorImagen);

  const cuerpo = crearElemento('div', { clase: 'tarjeta-inmueble__cuerpo' });

  //TITULO CON UBICACIÓN
  // cuerpo.appendChild(
  //   crearElemento('h3', { clase: 'tarjeta-inmueble__titulo', texto: inmueble.titulo || 'Inmueble sin título' })
  // );

  cuerpo.appendChild(
  crearElemento('h3', {
      clase: 'tarjeta-inmueble__titulo',
      texto: `${capitalizar(inmueble.tipo)} en ${inmueble.operacion}`
    })
  );

  //UBICACION POR SEPARADO DEL TITULO
  const ubicacion = [inmueble.barrio, inmueble.ciudad].filter(Boolean).join(', ');
  cuerpo.appendChild(crearElemento('p', { clase: 'tarjeta-inmueble__ubicacion', texto: ubicacion }));

  const caracteristicas = crearElemento('div', { clase: 'tarjeta-inmueble__caracteristicas' });
  if (inmueble.area_m2) {
    caracteristicas.appendChild(crearElemento('span', { texto: `${inmueble.area_m2} m²` }));
  }
  if (inmueble.habitaciones !== undefined && inmueble.habitaciones !== null) {
    caracteristicas.appendChild(crearElemento('span', { texto: `${inmueble.habitaciones} hab.` }));
  }
  if (inmueble.banos !== undefined && inmueble.banos !== null) {
    caracteristicas.appendChild(crearElemento('span', { texto: `${inmueble.banos} baños` }));
  }
  cuerpo.appendChild(caracteristicas);

  cuerpo.appendChild(
    crearElemento('p', {
      clase: 'tarjeta-inmueble__precio',
      texto: formatearPrecio(Number(inmueble.precio), inmueble.operacion),
    })
  );

  tarjeta.appendChild(cuerpo);
  return tarjeta;
}

// --------------------------------------------------------------- Eventos

function configurarEventosGenerales() {
  elementos.botonReintentar.addEventListener('click', cargarCatalogo);
  elementos.botonCargarMas.addEventListener('click', () => {
    estado.cantidadVisible += TAMANO_PAGINA_VISUAL;
    renderizarResultados();
  });
}

// ----------------------------------------------------------------- Init

document.addEventListener('DOMContentLoaded', () => {
  cachearElementos();
  configurarEventosGenerales();
  ModuloFiltros.inicializar(aplicarFiltrosYRenderizar);
  cargarCatalogo();
});
