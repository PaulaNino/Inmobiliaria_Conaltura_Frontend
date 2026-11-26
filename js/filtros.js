/**
 * filtros.js
 * Implementa el estado de los filtros, la búsqueda normalizada y el
 * ordenamiento, y expone un pequeño módulo (ModuloFiltros) que inmuebles.js
 * utiliza para inicializar los controles y obtener la colección filtrada.
 *
 * Todos los filtros se combinan con lógica AND y se aplican sobre la
 * colección completa de inmuebles ya cargada en memoria.
 */

const ModuloFiltros = (() => {
  const estadoFiltros = {
    operacion: null, // 'venta' | 'arriendo' | null
    tipo: '',
    ciudad: '',
    precioMin: null,
    precioMax: null,
    habitacionesMin: 0,
    busqueda: '',
    orden: 'recientes',
  };

  let alCambiar = null; // callback que inmuebles.js registra

  function notificarCambio() {
    if (typeof alCambiar === 'function') alCambiar();
  }

  // ---------------------------------------------------------------- Lógica

  function cumpleOperacion(inmueble) {
    if (!estadoFiltros.operacion) return true;
    return inmueble.operacion === estadoFiltros.operacion;
  }

  function cumpleTipo(inmueble) {
    if (!estadoFiltros.tipo) return true;
    return String(inmueble.tipo).toLowerCase() === estadoFiltros.tipo;
  }

  function cumpleCiudad(inmueble) {
    if (!estadoFiltros.ciudad) return true;
    return normalizarTexto(inmueble.ciudad) === normalizarTexto(estadoFiltros.ciudad);
  }

  function cumplePrecio(inmueble) {
    const precio = Number(inmueble.precio);
    if (estadoFiltros.precioMin !== null && precio < estadoFiltros.precioMin) return false;
    if (estadoFiltros.precioMax !== null && precio > estadoFiltros.precioMax) return false;
    return true;
  }

  function cumpleHabitaciones(inmueble) {
    if (!estadoFiltros.habitacionesMin) return true;
    return Number(inmueble.habitaciones || 0) >= estadoFiltros.habitacionesMin;
  }

  function cumpleBusqueda(inmueble) {
    if (!estadoFiltros.busqueda) return true;
    const termino = normalizarTexto(estadoFiltros.busqueda);
    const campos = [
      inmueble.titulo,
      inmueble.ciudad,
      inmueble.barrio,
      inmueble.tipo,
      inmueble.descripcion,
    ];
    return campos.some((campo) => normalizarTexto(campo).includes(termino));
  }

  function ordenar(lista) {
    const copia = [...lista];
    switch (estadoFiltros.orden) {
      case 'precio-asc':
        return copia.sort((a, b) => Number(a.precio || 0) - Number(b.precio || 0));
      case 'precio-desc':
        return copia.sort((a, b) => Number(b.precio || 0) - Number(a.precio || 0));
      case 'recientes':
      default:
        return copia.sort((a, b) => {
          const fechaA = new Date(a.publicado || 0).getTime();
          const fechaB = new Date(b.publicado || 0).getTime();
          return fechaB - fechaA;
        });
    }
  }

  /**
   * Aplica todos los filtros activos y el ordenamiento sobre la colección completa.
   * @param {Object[]} listaCompleta
   * @returns {Object[]}
   */
  function obtenerFiltrados(listaCompleta) {
    const resultado = listaCompleta.filter(
      (inmueble) =>
        cumpleOperacion(inmueble) &&
        cumpleTipo(inmueble) &&
        cumpleCiudad(inmueble) &&
        cumplePrecio(inmueble) &&
        cumpleHabitaciones(inmueble) &&
        cumpleBusqueda(inmueble)
    );
    return ordenar(resultado);
  }

  function hayFiltrosActivos() {
    return Boolean(
      estadoFiltros.operacion ||
        estadoFiltros.tipo ||
        estadoFiltros.ciudad ||
        estadoFiltros.precioMin !== null ||
        estadoFiltros.precioMax !== null ||
        estadoFiltros.habitacionesMin ||
        estadoFiltros.busqueda
    );
  }

  // ------------------------------------------------------------------- UI

  function pintarChips() {
    const contenedor = document.getElementById('chips-filtros');
    if (!contenedor) return;
    contenedor.textContent = '';

    const chips = [];
    if (estadoFiltros.operacion) {
      chips.push({ clave: 'operacion', texto: capitalizar(estadoFiltros.operacion) });
    }
    if (estadoFiltros.tipo) {
      chips.push({ clave: 'tipo', texto: etiquetaTipo(estadoFiltros.tipo) });
    }
    if (estadoFiltros.ciudad) {
      chips.push({ clave: 'ciudad', texto: estadoFiltros.ciudad });
    }
    if (estadoFiltros.precioMin !== null || estadoFiltros.precioMax !== null) {
      const min = estadoFiltros.precioMin !== null ? formatearPrecio(estadoFiltros.precioMin) : '0';
      const max = estadoFiltros.precioMax !== null ? formatearPrecio(estadoFiltros.precioMax) : '∞';
      chips.push({ clave: 'precio', texto: `${min} – ${max}` });
    }
    if (estadoFiltros.habitacionesMin) {
      chips.push({ clave: 'habitaciones', texto: `${estadoFiltros.habitacionesMin}+ habitaciones` });
    }
    if (estadoFiltros.busqueda) {
      chips.push({ clave: 'busqueda', texto: `"${estadoFiltros.busqueda}"` });
    }

    chips.forEach((chip) => {
      const elChip = crearElemento('span', { clase: 'chip-filtro' });
      const texto = crearElemento('span', { texto: chip.texto });
      const botonQuitar = crearElemento('button', {
        clase: 'chip-filtro__quitar',
        texto: '×',
        atributos: { type: 'button', 'aria-label': `Quitar filtro ${chip.texto}` },
      });
      botonQuitar.addEventListener('click', () => quitarFiltro(chip.clave));
      elChip.appendChild(texto);
      elChip.appendChild(botonQuitar);
      contenedor.appendChild(elChip);
    });
  }

  function quitarFiltro(clave) {
    switch (clave) {
      case 'operacion':
        estadoFiltros.operacion = null;
        actualizarBotonesOperacion();
        break;
      case 'tipo':
        estadoFiltros.tipo = '';
        document.getElementById('select-tipo').value = '';
        break;
      case 'ciudad':
        estadoFiltros.ciudad = '';
        document.getElementById('select-ciudad').value = '';
        break;
      case 'precio':
        estadoFiltros.precioMin = null;
        estadoFiltros.precioMax = null;
        document.getElementById('input-precio-min').value = '';
        document.getElementById('input-precio-max').value = '';
        break;
      case 'habitaciones':
        estadoFiltros.habitacionesMin = 0;
        document.getElementById('valor-habitaciones').textContent = '0';
        break;
      case 'busqueda':
        estadoFiltros.busqueda = '';
        document.getElementById('input-busqueda').value = '';
        break;
      default:
        break;
    }
    pintarChips();
    notificarCambio();
  }

  function actualizarBotonesOperacion() {
    document.querySelectorAll('.boton-operacion').forEach((boton) => {
      boton.classList.toggle('activo', boton.dataset.operacion === estadoFiltros.operacion);
    });
  }

  function limpiarTodosLosFiltros() {
    estadoFiltros.operacion = null;
    estadoFiltros.tipo = '';
    estadoFiltros.ciudad = '';
    estadoFiltros.precioMin = null;
    estadoFiltros.precioMax = null;
    estadoFiltros.habitacionesMin = 0;
    estadoFiltros.busqueda = '';
    estadoFiltros.orden = 'recientes';

    document.getElementById('select-tipo').value = '';
    document.getElementById('select-ciudad').value = '';
    document.getElementById('input-precio-min').value = '';
    document.getElementById('input-precio-max').value = '';
    document.getElementById('valor-habitaciones').textContent = '0';
    document.getElementById('input-busqueda').value = '';
    document.getElementById('select-orden').value = 'recientes';
    actualizarBotonesOperacion();
    pintarChips();
    notificarCambio();
  }

  async function cargarSelectorCiudades() {
    const select = document.getElementById('select-ciudad');
    try {
      const ciudades = await obtenerCiudades();
      select.textContent = '';
      select.appendChild(crearElemento('option', { texto: 'Todas las ciudades', atributos: { value: '' } }));
      ciudades
        .slice()
        .sort((a, b) => a.localeCompare(b, 'es'))
        .forEach((ciudad) => {
          select.appendChild(crearElemento('option', { texto: ciudad, atributos: { value: ciudad } }));
        });
      select.disabled = false;
    } catch (error) {
      select.textContent = '';
      select.appendChild(
        crearElemento('option', { texto: 'No se pudieron cargar las ciudades', atributos: { value: '' } })
      );
      select.disabled = true;
    }
  }

  function configurarControles() {
    // Operación
    document.querySelectorAll('.boton-operacion').forEach((boton) => {
      boton.addEventListener('click', () => {
        const valor = boton.dataset.operacion;
        estadoFiltros.operacion = estadoFiltros.operacion === valor ? null : valor;
        actualizarBotonesOperacion();
        pintarChips();
        notificarCambio();
      });
    });

    // Tipo
    document.getElementById('select-tipo').addEventListener('change', (evento) => {
      estadoFiltros.tipo = evento.target.value;
      pintarChips();
      notificarCambio();
    });

    // Ciudad
    document.getElementById('select-ciudad').addEventListener('change', (evento) => {
      estadoFiltros.ciudad = evento.target.value;
      pintarChips();
      notificarCambio();
    });

    // Precio
    const alCambiarPrecio = debounce(() => {
      const min = document.getElementById('input-precio-min').value;
      const max = document.getElementById('input-precio-max').value;
      estadoFiltros.precioMin = min === '' ? null : Number(min);
      estadoFiltros.precioMax = max === '' ? null : Number(max);
      pintarChips();
      notificarCambio();
    }, 350);
    document.getElementById('input-precio-min').addEventListener('input', alCambiarPrecio);
    document.getElementById('input-precio-max').addEventListener('input', alCambiarPrecio);

    // Habitaciones
    const valorHabitaciones = document.getElementById('valor-habitaciones');
    document.getElementById('boton-habitaciones-menos').addEventListener('click', () => {
      estadoFiltros.habitacionesMin = Math.max(0, estadoFiltros.habitacionesMin - 1);
      valorHabitaciones.textContent = String(estadoFiltros.habitacionesMin);
      pintarChips();
      notificarCambio();
    });
    document.getElementById('boton-habitaciones-mas').addEventListener('click', () => {
      estadoFiltros.habitacionesMin = Math.min(20, estadoFiltros.habitacionesMin + 1);
      valorHabitaciones.textContent = String(estadoFiltros.habitacionesMin);
      pintarChips();
      notificarCambio();
    });

    // Búsqueda
    const alBuscar = debounce((valor) => {
      estadoFiltros.busqueda = valor.trim();
      pintarChips();
      notificarCambio();
    }, 300);
    document.getElementById('input-busqueda').addEventListener('input', (evento) => {
      alBuscar(evento.target.value);
    });

    // Orden
    document.getElementById('select-orden').addEventListener('change', (evento) => {
      estadoFiltros.orden = evento.target.value;
      notificarCambio();
    });

    // Limpiar filtros
    document.getElementById('boton-limpiar-filtros').addEventListener('click', limpiarTodosLosFiltros);
    document.getElementById('boton-limpiar-desde-vacio').addEventListener('click', limpiarTodosLosFiltros);
  }

  /**
   * Punto de entrada: configura controles, carga ciudades y registra el callback
   * que debe dispararse cada vez que cambie algún filtro.
   * @param {Function} callback
   */
  function inicializar(callback) {
    alCambiar = callback;
    configurarControles();
    cargarSelectorCiudades();
  }

  return {
    inicializar,
    obtenerFiltrados,
    hayFiltrosActivos,
  };
})();
