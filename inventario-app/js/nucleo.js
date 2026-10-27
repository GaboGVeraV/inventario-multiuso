/* ============================================================
   Inventario Multiuso — núcleo de la plataforma
   - Espacio de nombres MU
   - Capa de almacenamiento versionada (localStorage)
   - Configuración de modalidad: 'hogar' | 'negocio'
   - Utilidades compartidas por todos los módulos
   ============================================================ */

const MU = {
  VERSION: 2,
  CLAVES: {
    config: 'mu_config',
    negocio: 'mu_negocio',
    productos: 'mu_productos',
    movimientos: 'mu_movimientos',
    ventas: 'mu_ventas',
    observaciones: 'mu_precios_observados',
    histPrecios: 'mu_hist_precios',
    histStock: 'mu_hist_stock',
    umbrales: 'mu_umbrales'
  },
  cache: {},
  _cuotaAvisada: false
};

/* ---------- Almacenamiento ---------- */

MU.leer = function (clave, defecto) {
  if (MU.cache[clave] !== undefined) return MU.cache[clave];
  let valor = null;
  try {
    valor = JSON.parse(localStorage.getItem(clave));
  } catch (e) {
    console.warn('Datos corruptos en ' + clave + ', se usa el valor por defecto.', e);
  }
  if (valor === null || valor === undefined) valor = defecto;
  MU.cache[clave] = valor;
  return valor;
};

MU.guardar = function (clave, valor) {
  MU.cache[clave] = valor;
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (e) {
    console.error('No se pudo guardar ' + clave, e);
    if (!MU._cuotaAvisada) {
      MU._cuotaAvisada = true;
      alert('No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado.\n'
        + 'Exportá tus datos y liberá espacio (historiales extensos).');
    }
    return false;
  }
};

/* ---------- Configuración de modalidad ---------- */

MU.config = function () {
  const base = { version: MU.VERSION, modo: 'hogar' };
  const cfg = MU.leer(MU.CLAVES.config, base) || base;
  if (cfg.modo !== 'negocio') cfg.modo = 'hogar';
  return cfg;
};

MU.guardarConfig = function (cfg) {
  cfg.version = MU.VERSION;
  return MU.guardar(MU.CLAVES.config, cfg);
};

MU.cambiarModo = function (modo) {
  const cfg = MU.config();
  cfg.modo = (modo === 'negocio') ? 'negocio' : 'hogar';
  MU.guardarConfig(cfg);
  MU.aplicarModo();
};

/* ---------- Umbrales configurables de alertas ---------- */

MU.umbrales = function () {
  const base = {
    vencimientoDias: 7,       // avisar productos que venzan en menos de N días
    sinMovimientoDias: 30,    // avisar productos sin ventas hace más de N días
    rotacionAlta: 1.0,        // uds vendidas ÷ existencias actuales ≥ este valor
    rotacionMedia: 0.3,       // ... ≥ este valor = rotación media
    diasAnalisis: 30,         // ventana por defecto de las estadísticas
    minCoocurrencia: 2        // mínimo de ventas conjuntas para sugerir un par
  };
  const u = MU.leer(MU.CLAVES.umbrales, base) || base;
  return Object.assign(base, u);
};

MU.guardarUmbrales = function (u) {
  return MU.guardar(MU.CLAVES.umbrales, Object.assign(MU.umbrales(), u));
};

/* ---------- Utilidades ---------- */

MU.uid = function () {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
};

MU.ahoraISO = function () { return new Date().toISOString(); };
MU.fechaHoy = function () { return new Date().toISOString().slice(0, 10); };

MU.esc = function (texto) {
  const div = document.createElement('div');
  div.textContent = String(texto === undefined || texto === null ? '' : texto);
  return div.innerHTML;
};

MU.fmtBs = function (n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const [ent, dec] = v.toFixed(2).split('.');
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec;
};

MU.normTexto = function (s) {
  return String(s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
};

MU.num = function (v, def) {
  const n = Number(v);
  return isNaN(n) ? (def === undefined ? 0 : def) : n;
};

MU.diasEntre = function (desdeISO, hastaISO) {
  const a = new Date(desdeISO), b = new Date(hastaISO || Date.now());
  if (isNaN(a)) return null;
  return Math.floor((b - a) / 86400000);
};

MU.fmtFecha = function (iso) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d)) return String(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

MU.fmtFechaHora = function (iso) {
  const f = MU.fmtFecha(iso);
  if (!iso || f === '—') return f;
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d)) return f;
  return f + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

/* ---------- Avisos efímeros ---------- */

MU.toast = function (mensaje, tipo) {
  let t = document.getElementById('mu-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'mu-toast';
    t.className = 'mu-toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = mensaje;
  t.className = 'mu-toast visible ' + (tipo || 'info');
  clearTimeout(MU._toastTimer);
  MU._toastTimer = setTimeout(() => { t.className = 'mu-toast'; }, 2600);
};

/* ---------- Histórico doméstico (precios y existencias) ---------- */

MU.registrarPrecioHistorial = function (seccion, nombre, precio) {
  const h = MU.leer(MU.CLAVES.histPrecios, []) || [];
  const ult = h.filter(x => x.sec === seccion && x.nombre === nombre).pop();
  if (ult && Math.abs(ult.precio - precio) < 0.005) return; // sin cambio real
  h.push({ sec: seccion, nombre: nombre, precio: precio, fecha: MU.fechaHoy() });
  // recorta para no ocupar espacio indefinidamente: conserva los últimos 2000 registros
  MU.guardar(MU.CLAVES.histPrecios, h.slice(-2000));
};

MU.registrarCambioStock = function (seccion, nombre, delta, stockDespues) {
  if (!delta) return;
  const h = MU.leer(MU.CLAVES.histStock, []) || [];
  h.push({ sec: seccion, nombre: nombre, delta: delta, stock: stockDespues, fecha: MU.ahoraISO() });
  MU.guardar(MU.CLAVES.histStock, h.slice(-800));
};

/* ---------- Cambio de modalidad (DOM) ---------- */

MU.aplicarModo = function () {
  const cfg = MU.config();
  const negocio = MU.negocio();
  const esNegocio = cfg.modo === 'negocio' && negocio;

  document.getElementById('contenedor-hogar').classList.toggle('oculto', esNegocio);
  document.getElementById('barra-hogar').classList.toggle('oculto', esNegocio);
  document.getElementById('contenedor-negocio').classList.toggle('oculto', !esNegocio);
  document.getElementById('barra-negocio').classList.toggle('oculto', !esNegocio);

  const badge = document.getElementById('badge-modo');
  const btn = document.getElementById('btn-cambiar-modo');
  if (esNegocio) {
    badge.textContent = '🏪 ' + (negocio.nombre || 'Mi negocio');
    btn.innerHTML = 'Modo negocio<span class="corto-btn"> · cambiar</span>';
    btn.title = 'Volver al modo Hogar';
    MU.negocioUI.irAVista(MU.negocioUI.vista || 'inicio');
  } else {
    badge.textContent = '🏠 Hogar';
    btn.innerHTML = 'Modo hogar<span class="corto-btn"> · cambiar</span>';
    btn.title = 'Configurar mi negocio';
    irAVista('inicio');
  }
};

MU.negocio = function () { return MU.leer(MU.CLAVES.negocio, null); };
MU.guardarNegocio = function (n) { return MU.guardar(MU.CLAVES.negocio, n); };

/* ---------- Arranque ---------- */

MU.iniciarPlataforma = function () {
  document.getElementById('btn-cambiar-modo').addEventListener('click', () => {
    const cfg = MU.config();
    if (cfg.modo === 'negocio') {
      if (confirm('¿Volver al modo Hogar? Tus datos de negocio quedan guardados.')) {
        MU.cambiarModo('hogar');
      }
    } else if (MU.negocio()) {
      MU.cambiarModo('negocio');
    } else {
      MU.negocioUI.abrirAsistente();
    }
  });
  MU.negocioUI.enlazar();
  MU.aplicarModo();
};
