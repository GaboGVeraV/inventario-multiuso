/* ============================================================
   Inventario Multiuso — Modalidad B: gestión de pequeños negocios
   Asistente de configuración, catálogo semiasistido,
   movimientos trazables y registro de ventas.
   ============================================================ */

MU.negocioUI = {
  vista: 'inicio',
  tab: 'venta',
  editandoIdx: null,
  carrito: [],
  filtroCat: null,
  mostrarInactivos: false,
  enviando: false,          // guarda anti doble envío de ventas/entradas
  vistaPreviaCatalogo: null
};

/* ---------- Acceso a datos (con normalización) ---------- */

MU.productos = function () { return MU.leer(MU.CLAVES.productos, []) || []; };
MU.guardarProductos = function (a) { return MU.guardar(MU.CLAVES.productos, a); };
MU.movimientos = function () { return MU.leer(MU.CLAVES.movimientos, []) || []; };
MU.guardarMovimientos = function (a) { return MU.guardar(MU.CLAVES.movimientos, a); };
MU.ventas = function () { return MU.leer(MU.CLAVES.ventas, []) || []; };
MU.guardarVentas = function (a) { return MU.guardar(MU.CLAVES.ventas, a); };

MU.normProductoNegocio = function (p) {
  return {
    id: p.id || MU.uid(),
    nombre: String(p.nombre || 'Producto').trim(),
    categoria: String(p.categoria || 'General').trim(),
    marca: String(p.marca || '').trim(),
    sku: String(p.sku || '').trim(),
    barras: String(p.barras || '').trim(),
    unidad: String(p.unidad || 'unidades').trim(),
    unidadBase: ['kg', 'l', 'un'].indexOf(p.unidadBase) >= 0 ? p.unidadBase : 'un',
    cantidad: Math.max(0, MU.num(p.cantidad, 0)),
    minimo: Math.max(0, MU.num(p.minimo, 1)),
    costo: Math.max(0, Math.round(MU.num(p.costo, 0) * 100) / 100),
    precioVenta: Math.max(0, Math.round(MU.num(p.precioVenta, 0) * 100) / 100),
    proveedor: String(p.proveedor || '').trim(),
    vencimiento: p.vencimiento || null,
    ubicacion: String(p.ubicacion || '').trim(),
    descripcion: String(p.descripcion || '').trim(),
    activo: p.activo !== false,
    creado: p.creado || MU.ahoraISO(),
    actualizado: p.actualizado || p.creado || MU.ahoraISO()
  };
};

MU.productoPorId = function (id) { return MU.productos().find(p => p.id === id) || null; };

/* Aplica un movimiento ya validado al stock del producto. */
function aplicarDelta(prod, delta) {
  prod.cantidad = Math.max(0, Math.round((prod.cantidad + delta) * 1000) / 1000);
  prod.actualizado = MU.ahoraISO();
}

/* ---------- Navegación del modo negocio ---------- */

MU.negocioUI.irAVista = function (vista) {
  MU.negocioUI.vista = vista;
  const mapa = {
    inicio: 'vista-neg-inicio', productos: 'vista-neg-productos',
    movimientos: 'vista-movimientos', estadisticas: 'vista-estadisticas',
    precios: 'vista-neg-precios'
  };
  Object.keys(mapa).forEach(v => {
    document.getElementById(mapa[v]).classList.toggle('oculto', v !== vista);
  });
  document.querySelectorAll('#barra-negocio button').forEach(b => b.classList.remove('activo'));
  const nav = document.getElementById('nav-neg-' + vista);
  if (nav) nav.classList.add('activo');
  window.scrollTo(0, 0);
  if (vista === 'inicio') MU.negocioUI.renderInicio();
  if (vista === 'productos') MU.negocioUI.renderProductos();
  if (vista === 'movimientos') { MU.negocioUI.refreshSelects(); MU.negocioUI.abrirTab(MU.negocioUI.tab); }
  if (vista === 'estadisticas') MU.stats.render();
  if (vista === 'precios') MU.mercado.render(document.getElementById('mercado-neg'));
};

MU.negocioUI.abrirTab = function (tab) {
  MU.negocioUI.tab = tab;
  document.querySelectorAll('#tabs-mov .chip-tab').forEach(b =>
    b.classList.toggle('activo', b.getAttribute('data-tab') === tab));
  ['venta', 'entrada', 'ajuste', 'historial'].forEach(t =>
    document.getElementById('mov-' + t).classList.toggle('oculto', t !== tab));
  MU.negocioUI.refreshSelects();
  if (tab === 'historial') MU.negocioUI.renderHistorial();
};

/* ---------- Asistente de configuración ---------- */

MU.negocioUI.abrirAsistente = function () {
  const n = MU.negocio();
  const selSector = document.getElementById('c-sector');
  selSector.innerHTML = MU_SECTORES.map(s =>
    `<option value="${s.id}">${s.emoji} ${MU.esc(s.nombre)}</option>`).join('');
  if (n && n.sector) selSector.value = n.sector;
  MU.negocioUI.cambioSector();
  if (n && n.subcategoria) document.getElementById('c-subcategoria').value = n.subcategoria;
  document.getElementById('c-nombre').value = n ? (n.nombre || '') : '';
  document.getElementById('c-descripcion').value = n ? (n.descripcion || '') : '';
  document.getElementById('c-moneda').value = n ? (n.moneda || 'Bs') : 'Bs';
  document.getElementById('c-metodo').value = n ? (n.metodo || 'entero') : 'entero';
  document.getElementById('c-unidades').value = n ? (n.unidadesPref || 'auto') : 'auto';
  document.getElementById('modal-asistente').classList.add('abierto');
};

MU.negocioUI.cambioSector = function () {
  const id = document.getElementById('c-sector').value;
  const s = MU_SECTORES.find(x => x.id === id) || MU_SECTORES[0];
  document.getElementById('c-subcategoria').innerHTML =
    s.subcategorias.map(sub => `<option value="${sub.id}">${MU.esc(sub.nombre)}</option>`).join('');
};

MU.negocioUI.cerrarAsistente = function () {
  document.getElementById('modal-asistente').classList.remove('abierto');
};

MU.negocioUI.cerrarAsistenteSiFondo = function (e) {
  if (e.target.id === 'modal-asistente') MU.negocioUI.cerrarAsistente();
};

MU.negocioUI.guardarAsistente = function () {
  const nombre = document.getElementById('c-nombre').value.trim();
  if (!nombre) { alert('Escribí el nombre del negocio'); return; }
  const sectorId = document.getElementById('c-sector').value;
  const subId = document.getElementById('c-subcategoria').value;
  const sector = MU_SECTORES.find(s => s.id === sectorId);
  const sub = MU.subcategoria(subId);
  const viejo = MU.negocio();
  const n = {
    nombre: nombre,
    sector: sectorId,
    sectorNombre: sector ? sector.nombre : sectorId,
    subcategoria: subId,
    subcategoriaNombre: sub ? sub.nombre : subId,
    descripcion: document.getElementById('c-descripcion').value.trim(),
    moneda: document.getElementById('c-moneda').value,
    metodo: document.getElementById('c-metodo').value,
    unidadesPref: document.getElementById('c-unidades').value,
    creado: (viejo && viejo.creado) || MU.ahoraISO(),
    actualizado: MU.ahoraISO()
  };
  MU.guardarNegocio(n);
  MU.negocioUI.cerrarAsistente();
  MU.cambiarModo('negocio');
  MU.toast('Negocio "' + nombre + '" configurado', 'ok');
};

/* ---------- Inicio del negocio ---------- */

MU.alertasNegocio = function () {
  const u = MU.umbrales();
  const prods = MU.productos().filter(p => p.activo);
  const movs = MU.movimientos();
  const ventas = MU.ventas();
  const ahora = Date.now();
  const out = [];
  prods.forEach(p => {
    const ultVenta = movs.filter(m => m.productoId === p.id && m.tipo === 'venta').pop();
    const diasSinVenta = ultVenta ? MU.diasEntre(ultVenta.fecha) : null;
    if (p.cantidad === 0) {
      out.push({ tipo: 'agotado', icono: '🚫', clase: 'estado-critico', orden: 0,
        texto: `${p.nombre}: agotado (mínimo ${p.minimo} ${p.unidad})` });
    } else if (p.cantidad < p.minimo) {
      out.push({ tipo: 'bajo', icono: '⚠️', clase: 'estado-atencion', orden: 1,
        texto: `${p.nombre}: quedan ${p.cantidad} ${p.unidad} (mínimo ${p.minimo})` });
    }
    if (p.vencimiento) {
      const dias = Math.ceil((new Date(p.vencimiento + 'T23:59:59') - ahora) / 86400000);
      if (dias < 0) out.push({ tipo: 'vencido', icono: '🗓️', clase: 'estado-critico', orden: 0,
        texto: `${p.nombre}: VENCIDO el ${MU.fmtFecha(p.vencimiento)}` });
      else if (dias <= u.vencimientoDias) out.push({ tipo: 'por-vencer', icono: '🗓️', clase: 'estado-atencion', orden: 2,
        texto: `${p.nombre}: vence en ${dias} día(s) (${MU.fmtFecha(p.vencimiento)})` });
    }
    if (p.cantidad > 0 && diasSinVenta !== null && diasSinVenta > u.sinMovimientoDias) {
      out.push({ tipo: 'sin-movimiento', icono: '🐌', clase: 'estado-info', orden: 3,
        texto: `${p.nombre}: sin ventas desde hace ${diasSinVenta} días (stock ${p.cantidad} ${p.unidad})` });
    }
    if (p.cantidad > 0 && p.cantidad >= p.minimo * 3 && p.minimo > 0
        && (diasSinVenta === null || diasSinVenta > u.sinMovimientoDias)) {
      out.push({ tipo: 'estancado', icono: '📦', clase: 'estado-info', orden: 3,
        texto: `${p.nombre}: inventario alto y pocas ventas (${p.cantidad} ${p.unidad} en existencias)` });
    }
    // ventas crecientes con stock reducido (regla fija, no predicción)
    const desde7 = new Date(ahora - 7 * 86400000).toISOString();
    const desde14 = new Date(ahora - 14 * 86400000).toISOString();
    const uds7 = ventas.reduce((s, v) => s + v.items.filter(i => i.productoId === p.id
      && v.fecha >= desde7).reduce((a, i) => a + i.cantidad, 0), 0);
    const uds14 = ventas.reduce((s, v) => s + v.items.filter(i => i.productoId === p.id
      && v.fecha >= desde14 && v.fecha < desde7).reduce((a, i) => a + i.cantidad, 0), 0);
    if (uds7 > 0 && uds7 >= 2 * uds14 && p.cantidad < p.minimo * 1.5) {
      out.push({ tipo: 'vendiendo-rapido', icono: '🔥', clase: 'estado-atencion', orden: 1,
        texto: `${p.nombre}: ventas subiendo (×${uds7} en 7 días) con stock reducido (${p.cantidad} ${p.unidad})` });
    }
  });
  out.sort((a, b) => a.orden - b.orden);
  return out;
};

MU.negocioUI.renderInicio = function () {
  const prods = MU.productos();
  const activos = prods.filter(p => p.activo);
  const alertas = MU.alertasNegocio();
  const desde30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const ingresos30 = MU.ventas().filter(v => v.fecha >= desde30)
    .reduce((s, v) => s + v.total, 0);
  const conCosto = activos.filter(p => p.costo > 0);
  const valorCosto = conCosto.reduce((s, p) => s + p.costo * p.cantidad, 0);
  const unidades = activos.reduce((s, p) => s + p.cantidad, 0);

  document.getElementById('neg-productos').textContent = activos.length;
  document.getElementById('neg-unidades').textContent = Math.round(unidades * 100) / 100;
  document.getElementById('neg-alertas').textContent = alertas.length;
  document.getElementById('neg-ingresos').textContent = 'Bs ' + MU.fmtBs(ingresos30);
  document.getElementById('neg-valor').textContent = 'Bs ' + MU.fmtBs(valorCosto);

  const n = MU.negocio();
  const criticas = alertas.filter(a => a.clase === 'estado-critico').length;
  const nivel = criticas > 0 ? ['estado-critico', '🔴', 'CRÍTICO']
    : alertas.length > 0 ? ['estado-atencion', '🟡', 'EN ATENCIÓN']
    : ['estado-ok', '🟢', 'TODO EN ORDEN'];
  const banner = document.getElementById('banner-neg');
  banner.className = 'banner ' + nivel[0];
  banner.innerHTML = `<h3>${nivel[1]} ${MU.esc(n.nombre)}: ${nivel[2]}</h3>
    <ul><li>${MU.esc(n.subcategoriaNombre || '')} · ${activos.length} productos activos · ${alertas.length} alerta(s).</li>
    <li>${conCosto.length} de ${activos.length} productos con costo cargado (habilita margen y rotación por costo).</li></ul>`;

  const cont = document.getElementById('neg-alertas-lista');
  cont.innerHTML = `<h3>🔔 Alertas (reglas fijas configuradas)</h3>` +
    (alertas.length
      ? alertas.slice(0, 12).map(a =>
          `<div class="alerta-fila ${a.clase}"><span class="alerta-ico">${a.icono}</span><span>${MU.esc(a.texto)}</span></div>`).join('')
        + (alertas.length > 12 ? `<p class="nota-pequena">…y ${alertas.length - 12} alertas más.</p>` : '')
      : `<p class="vacio">✅ Sin alertas: ningún producto está por debajo del mínimo, vencido ni estancado.</p>`) +
    `<p class="nota-pequena">Las alertas son reglas simples sobre tus datos (stock, ventas y fechas), no predicciones automáticas.</p>`;
};

/* ---------- Productos ---------- */

MU.negocioUI.renderProductos = function () {
  const negocio = MU.negocio();
  const q = MU.normTexto(document.getElementById('neg-buscador').value);
  let prods = MU.productos().slice();
  const cats = [...new Set(prods.map(p => p.categoria))].sort();
  document.getElementById('neg-chips').innerHTML =
    `<button class="chip ${MU.negocioUI.filtroCat === null ? 'activo' : ''}" onclick="MU.negocioUI.filtrarCat(null)">Todos</button>` +
    cats.map(c => `<button class="chip ${MU.negocioUI.filtroCat === c ? 'activo' : ''}" onclick="MU.negocioUI.filtrarCat('${MU.esc(c).replace(/'/g, "\\'")}')">${MU.esc(c)}</button>`).join('') +
    `<button class="chip ${MU.negocioUI.mostrarInactivos ? 'activo' : ''}" onclick="MU.negocioUI.toggleInactivos()">🗑️ Inactivos</button>`;

  if (!MU.negocioUI.mostrarInactivos) prods = prods.filter(p => p.activo);
  if (MU.negocioUI.filtroCat) prods = prods.filter(p => p.categoria === MU.negocioUI.filtroCat);
  if (q) prods = prods.filter(p =>
    MU.normTexto(p.nombre).indexOf(q) >= 0 || MU.normTexto(p.marca).indexOf(q) >= 0
    || MU.normTexto(p.sku).indexOf(q) >= 0 || MU.normTexto(p.barras).indexOf(q) >= 0);

  const movs = MU.movimientos();
  const cont = document.getElementById('neg-lista');
  if (!prods.length) {
    cont.innerHTML = `<div class="vacio">📭<br>No hay productos ${MU.negocioUI.mostrarInactivos ? 'inactivos ' : ''}que coincidan.<br>Usá «＋ Agregar producto» para cargar el primero.</div>`;
    return;
  }
  cont.innerHTML = prods.map(p => {
    const ultVenta = movs.filter(m => m.productoId === p.id && m.tipo === 'venta').pop();
    const dias = ultVenta ? MU.diasEntre(ultVenta.fecha) : null;
    const estado = !p.activo ? ['inactivo', '🚫 Inactivo']
      : p.cantidad === 0 ? ['estado-critico', '🚫 Agotado']
      : p.cantidad < p.minimo ? ['estado-atencion', '⚠️ Stock bajo']
      : ['estado-ok', '✅ En stock'];
    const margen = (p.costo > 0 && p.precioVenta > 0)
      ? Math.round((1 - p.costo / p.precioVenta) * 1000) / 10 : null;
    const idx = MU.productos().indexOf(p);
    return `
      <div class="producto ${p.activo ? '' : 'inactivo'}">
        <div class="emoji">📦</div>
        <div class="datos">
          <h4>${MU.esc(p.nombre)}${p.marca ? ` <small class="marca-neg">${MU.esc(p.marca)}</small>` : ''}</h4>
          <div class="meta">${MU.esc(p.categoria)} · ${MU.esc(p.unidad)} · mín ${p.minimo}${p.proveedor ? ' · proveedor: ' + MU.esc(p.proveedor) : ''}${p.vencimiento ? ' · vence ' + MU.fmtFecha(p.vencimiento) : ''}</div>
          <div class="valor">
            Stock: <b>${p.cantidad}</b> ${MU.esc(p.unidad)}
            · costo Bs ${MU.fmtBs(p.costo)} · venta Bs ${MU.fmtBs(p.precioVenta)}
            ${margen !== null ? ` · margen ${margen}%` : ''}
            ${dias !== null ? ` · última venta hace ${dias} d` : ''}
          </div>
          <div class="meta"><span class="chip-estado ${estado[0]}">${estado[1]}</span></div>
        </div>
        <div class="controles-neg">
          <button class="icono-btn" title="Editar" onclick="MU.negocioUI.abrirProductoModal(${idx})">✏️</button>
          <button class="icono-btn" title="Registrar entrada" onclick="MU.negocioUI.irrapidaEntrada(${idx})">📥</button>
          <button class="icono-btn" title="Ajustar" onclick="MU.negocioUI.irrapidaAjuste(${idx})">⚖️</button>
          <button class="icono-btn" title="${p.activo ? 'Desactivar' : 'Reactivar'}" onclick="MU.negocioUI.toggleActivo(${idx})">${p.activo ? '🗑️' : '♻️'}</button>
        </div>
      </div>`;
  }).join('');
};

MU.negocioUI.filtrarCat = function (c) { MU.negocioUI.filtroCat = c; MU.negocioUI.renderProductos(); };
MU.negocioUI.toggleInactivos = function () { MU.negocioUI.mostrarInactivos = !MU.negocioUI.mostrarInactivos; MU.negocioUI.renderProductos(); };

MU.negocioUI.toggleActivo = function (idx) {
  const lista = MU.productos();
  const p = lista[idx];
  if (!p) return;
  if (p.activo && !confirm(`¿Desactivar "${p.nombre}"? Deja de aparecer en ventas, pero se conserva en el historial.`)) return;
  p.activo = !p.activo;
  p.actualizado = MU.ahoraISO();
  MU.guardarProductos(lista);
  MU.negocioUI.renderProductos();
  MU.toast(p.activo ? 'Producto reactivado' : 'Producto desactivado', 'ok');
};

MU.negocioUI.irrapidaEntrada = function (idx) {
  MU.negocioUI.irAVista('movimientos');
  MU.negocioUI.abrirTab('entrada');
  const p = MU.productos()[idx];
  if (p) document.getElementById('e-producto').value = p.id;
};

MU.negocioUI.irrapidaAjuste = function (idx) {
  MU.negocioUI.irAVista('movimientos');
  MU.negocioUI.abrirTab('ajuste');
  const p = MU.productos()[idx];
  if (p) document.getElementById('a-producto').value = p.id;
};

/* ---------- Modal de producto (semiasistido) ---------- */

MU.negocioUI.abrirProductoModal = function (idx) {
  MU.negocioUI.editandoIdx = (idx === null || idx === undefined) ? null : idx;
  const esEdicion = MU.negocioUI.editandoIdx !== null;
  document.getElementById('pn-titulo').textContent = esEdicion ? 'Editar producto' : 'Agregar producto';
  document.getElementById('pn-buscar').value = '';
  document.getElementById('pn-catalogo').innerHTML = '';
  document.getElementById('pn-duplicado').classList.add('oculto');
  document.getElementById('pn-sugerencia').classList.add('oculto');
  document.getElementById('pn-paso1').classList.toggle('oculto', esEdicion);
  document.getElementById('pn-paso2').classList.toggle('oculto', !esEdicion);
  document.getElementById('modal-producto-neg').classList.add('abierto');
  if (esEdicion) {
    MU.negocioUI.llenarFormulario(MU.productos()[MU.negocioUI.editandoIdx], false);
  } else {
    MU.negocioUI.buscarCatalogo();
  }
};

MU.negocioUI.buscarCatalogo = function () {
  const n = MU.negocio();
  const texto = document.getElementById('pn-buscar').value;
  const res = MU.buscarEnCatalogo(texto, n ? n.subcategoria : 'otro');
  const cont = document.getElementById('pn-catalogo');
  cont.innerHTML = res.length
    ? res.map((p, i) => `
      <button class="item-catalogo" onclick="MU.negocioUI.aplicarCatalogo(${MU_CATALOGO.indexOf(p)})">
        <span class="cat-emoji">${p.e}</span>
        <span class="cat-datos"><b>${MU.esc(p.n.trim())}</b><small>${MU.esc(p.c)} · ${MU.esc(p.u)}</small></span>
        <span class="cat-usar">Usar ›</span>
      </button>`).join('')
    : `<p class="vacio">Sin coincidencias en el catálogo. Cargalo manualmente: cualquier producto puede crearse a mano.</p>`;
};

MU.negocioUI.aplicarCatalogo = function (i) {
  const g = MU_CATALOGO[i];
  if (!g) return;
  MU.negocioUI.vistaPreviaCatalogo = g;
  MU.negocioUI.abrirFormulario(g);
};

MU.negocioUI.abrirFormulario = function (prefill) {
  document.getElementById('pn-paso1').classList.add('oculto');
  document.getElementById('pn-paso2').classList.remove('oculto');
  MU.negocioUI.llenarFormulario(prefill, true);
};

MU.negocioUI.llenarFormulario = function (p, esSugerencia) {
  const n = MU.negocio();
  const cats = MU.categoriasSugeridas(n ? n.subcategoria : 'otro');
  document.getElementById('pn-cats').innerHTML =
    cats.map(c => `<option value="${MU.esc(c)}">`).join('');
  const set = (id, v) => { document.getElementById(id).value = (v === undefined || v === null) ? '' : v; };
  set('pn-nombre', p ? (p.n !== undefined ? p.n.trim() : p.nombre) : '');
  set('pn-categoria', p ? (p.c !== undefined ? p.c : p.categoria) : (cats[0] || 'General'));
  set('pn-marca', p ? (p.marca || '') : '');
  set('pn-sku', p ? (p.sku || '') : '');
  set('pn-barras', p ? (p.barras || '') : '');
  set('pn-unidad', p ? (p.u !== undefined ? p.u : p.unidad) : (n && n.unidadesPref === 'un' ? 'unidades' : 'unidades'));
  set('pn-unidadbase', p ? (p.ub !== undefined ? p.ub : p.unidadBase) : 'un');
  set('pn-stock', p && p.cantidad !== undefined ? p.cantidad : 0);
  set('pn-minimo', p && p.minimo !== undefined ? p.minimo : 1);
  set('pn-costo', p && p.costo !== undefined ? p.costo : '');
  set('pn-precioventa', p && p.precioVenta !== undefined ? p.precioVenta : '');
  set('pn-vencimiento', p && p.vencimiento !== undefined ? p.vencimiento : '');
  set('pn-proveedor', p && p.proveedor !== undefined ? p.proveedor : '');
  set('pn-ubicacion', p && p.ubicacion !== undefined ? p.ubicacion : '');
  set('pn-descripcion', p && p.descripcion !== undefined ? p.descripcion : '');
  document.getElementById('pn-activo').checked = p && p.activo !== undefined ? p.activo !== false : true;

  const esEdicion = MU.negocioUI.editandoIdx !== null;
  document.getElementById('pn-stock-inicial-campo').classList.toggle('oculto', esEdicion);
  document.getElementById('pn-stock-nota').classList.toggle('oculto', !esEdicion);

  const nota = document.getElementById('pn-sugerencia');
  if (esSugerencia) {
    nota.textContent = 'Sugerencia del catálogo aplicada: revisá y editá lo que haga falta antes de guardar (nada se guarda hasta que confirmes).';
    nota.classList.remove('oculto');
  } else {
    nota.classList.add('oculto');
  }
  // avisos de posibles duplicados (sugerencia, no bloqueo)
  const sim = MU.duplicadosSimilares(document.getElementById('pn-nombre').value,
    document.getElementById('pn-unidad').value, MU.productos()
      .filter((x, i) => i !== MU.negocioUI.editandoIdx));
  const dup = document.getElementById('pn-duplicado');
  if (sim.length) {
    dup.innerHTML = `⚠️ Ya tenés ${sim.length} producto(s) parecido(s): <b>${sim.map(x => MU.esc(x.nombre) + (x.marca ? ' (' + MU.esc(x.marca) + ')' : '')).join(', ')}</b>. Dos productos con nombre similar pueden ser legítimamente distintos (marca, presentación o unidad): si es el mismo, cancelá y editá el existente.`;
    dup.classList.remove('oculto');
  } else {
    dup.classList.add('oculto');
  }
};

MU.negocioUI.volverPaso1 = function () {
  document.getElementById('pn-paso2').classList.add('oculto');
  document.getElementById('pn-paso1').classList.remove('oculto');
  MU.negocioUI.buscarCatalogo();
};

MU.negocioUI.cerrarProducto = function () {
  document.getElementById('modal-producto-neg').classList.remove('abierto');
  MU.negocioUI.editandoIdx = null;
};

MU.negocioUI.cerrarProductoSiFondo = function (e) {
  if (e.target.id === 'modal-producto-neg') MU.negocioUI.cerrarProducto();
};

MU.negocioUI.guardarProductoModal = function () {
  const g = (id) => document.getElementById(id).value;
  const nombre = g('pn-nombre').trim();
  const unidad = g('pn-unidad').trim();
  if (!nombre) { alert('Escribí el nombre del producto'); return; }
  if (!unidad) { alert('Escribí la unidad de medida (kg, litros, unidades...)'); return; }
  const n = MU.negocio();
  const decimales = n && n.metodo === 'decimal';
  let stockInicial = parseFloat(g('pn-stock'));
  if (isNaN(stockInicial) || stockInicial < 0) stockInicial = 0;
  if (!decimales) stockInicial = Math.round(stockInicial);

  const datos = {
    nombre: nombre,
    categoria: g('pn-categoria').trim() || 'General',
    marca: g('pn-marca').trim(),
    sku: g('pn-sku').trim(),
    barras: g('pn-barras').trim(),
    unidad: unidad,
    unidadBase: g('pn-unidadbase'),
    minimo: Math.max(0, parseFloat(g('pn-minimo')) || 0),
    costo: Math.max(0, parseFloat(g('pn-costo')) || 0),
    precioVenta: Math.max(0, parseFloat(g('pn-precioventa')) || 0),
    proveedor: g('pn-proveedor').trim(),
    vencimiento: g('pn-vencimiento') || null,
    ubicacion: g('pn-ubicacion').trim(),
    descripcion: g('pn-descripcion').trim(),
    activo: document.getElementById('pn-activo').checked
  };

  const lista = MU.productos();
  const movs = MU.movimientos();
  if (MU.negocioUI.editandoIdx === null) {
    // alta: stock inicial queda registrado como movimiento trazable
    const exacto = lista.find(x => MU.normTexto(x.nombre) === MU.normTexto(nombre)
      && MU.normTexto(x.marca) === MU.normTexto(datos.marca)
      && MU.normTexto(x.unidad) === MU.normTexto(unidad));
    if (exacto && !confirm(`Ya existe un producto idéntico ("${exacto.nombre}") con la misma marca y unidad. ¿Guardar este como producto separado?`)) return;
    const nuevo = MU.normProductoNegocio(Object.assign({ cantidad: stockInicial, creado: MU.ahoraISO() }, datos));
    lista.push(nuevo);
    movs.push({
      id: MU.uid(), tipo: 'ajuste', productoId: nuevo.id, producto: nuevo.nombre,
      cantidad: stockInicial, sentido: 1, delta: stockInicial,
      fecha: MU.ahoraISO(), motivo: 'Alta de producto (stock inicial)', stockDespues: nuevo.cantidad
    });
  } else {
    const p = lista[MU.negocioUI.editandoIdx];
    // el stock NO se edita aquí: solo vía movimientos (trazabilidad)
    Object.assign(p, datos, { id: p.id, creado: p.creado, cantidad: p.cantidad, actualizado: MU.ahoraISO() });
  }
  MU.guardarProductos(lista);
  MU.guardarMovimientos(movs);
  MU.negocioUI.cerrarProducto();
  MU.negocioUI.renderProductos();
  MU.toast('Producto guardado', 'ok');
};

/* ---------- Selects de movimientos ---------- */

MU.negocioUI.refreshSelects = function () {
  const activos = MU.productos().filter(p => p.activo);
  const opts = activos.map(p =>
    `<option value="${p.id}">${MU.esc(p.nombre)}${p.marca ? ' · ' + MU.esc(p.marca) : ''} (stock ${p.cantidad} ${MU.esc(p.unidad)})</option>`).join('');
  ['v-producto', 'e-producto', 'a-producto'].forEach(id => {
    const sel = document.getElementById(id);
    const actual = sel.value;
    sel.innerHTML = activos.length ? opts : '<option value="">— sin productos activos —</option>';
    if (actual && activos.some(p => p.id === actual)) sel.value = actual;
  });
};

/* ---------- Venta ---------- */

MU.negocioUI.agregarAlCarrito = function () {
  const id = document.getElementById('v-producto').value;
  const p = MU.productoPorId(id);
  if (!p) { alert('Seleccioná un producto'); return; }
  const cant = parseFloat(document.getElementById('v-cantidad').value);
  if (isNaN(cant) || cant <= 0) { alert('Ingresá una cantidad mayor a cero'); return; }
  const n = MU.negocio();
  const cantidad = (n && n.metodo === 'decimal') ? cant : Math.round(cant);
  const precio = Math.max(0, Math.round((parseFloat(document.getElementById('v-precio').value) || p.precioVenta || 0) * 100) / 100);
  const enCarrito = MU.negocioUI.carrito.filter(i => i.productoId === p.id)
    .reduce((s, i) => s + i.cantidad, 0);
  if (enCarrito + cantidad > p.cantidad) {
    alert(`Stock insuficiente: hay ${p.cantidad} ${p.unidad} disponibles${enCarrito ? ' (incluyendo los que ya están en el carrito)' : ''}.`); return;
  }
  MU.negocioUI.carrito.push({
    productoId: p.id, producto: p.nombre, cantidad: cantidad,
    precioUnitario: precio, costoUnitario: p.costo, unidad: p.unidad
  });
  document.getElementById('v-cantidad').value = 1;
  MU.negocioUI.renderCarrito();
};

MU.negocioUI.quitarDelCarrito = function (i) {
  MU.negocioUI.carrito.splice(i, 1);
  MU.negocioUI.renderCarrito();
};

MU.negocioUI.renderCarrito = function () {
  const cont = document.getElementById('v-carrito');
  const car = MU.negocioUI.carrito;
  const total = car.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  cont.innerHTML = car.length
    ? `<h4>Carrito (${car.length} ítem/s) · Total Bs ${MU.fmtBs(total)}</h4>` +
      car.map((i, idx) => `
        <div class="carrito-fila">
          <span>${MU.esc(i.producto)} × ${i.cantidad} ${MU.esc(i.unidad)}</span>
          <span>Bs ${MU.fmtBs(i.cantidad * i.precioUnitario)}
            <button class="icono-btn" title="Quitar" onclick="MU.negocioUI.quitarDelCarrito(${idx})">✖️</button></span>
        </div>`).join('')
    : '<p class="vacio">Carrito vacío: agregá productos de la venta.</p>';
};

MU.negocioUI.confirmarVenta = function () {
  if (MU.negocioUI.enviando) return;               // anti doble clic
  const car = MU.negocioUI.carrito;
  if (!car.length) { alert('El carrito está vacío'); return; }
  MU.negocioUI.enviando = true;
  const btn = document.getElementById('btn-confirmar-venta');
  btn.disabled = true;
  try {
    const lista = MU.productos();
    const movs = MU.movimientos();
    const ventas = MU.ventas();
    // valida todo antes de tocar el stock (sin efectos parciales)
    for (const it of car) {
      const p = lista.find(x => x.id === it.productoId);
      if (!p || !p.activo) { alert('Un producto del carrito ya no está disponible'); return; }
      if (it.cantidad > p.cantidad) {
        alert(`Stock insuficiente para "${p.nombre}": quedan ${p.cantidad} ${p.unidad}.`); return;
      }
    }
    const venta = {
      id: MU.uid(), fecha: MU.ahoraISO(),
      items: car.map(i => Object.assign({}, i)),
      total: Math.round(car.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0) * 100) / 100,
      nota: document.getElementById('v-nota').value.trim()
    };
    car.forEach(it => {
      const p = lista.find(x => x.id === it.productoId);
      aplicarDelta(p, -it.cantidad);
      movs.push({
        id: MU.uid(), tipo: 'venta', ventaId: venta.id, productoId: p.id, producto: p.nombre,
        cantidad: it.cantidad, delta: -it.cantidad, precioUnitario: it.precioUnitario,
        fecha: venta.fecha, motivo: venta.nota || 'Venta', stockDespues: p.cantidad
      });
    });
    ventas.push(venta);
    MU.guardarProductos(lista);
    MU.guardarMovimientos(movs);
    MU.guardarVentas(ventas);
    MU.negocioUI.carrito = [];
    document.getElementById('v-nota').value = '';
    MU.negocioUI.renderCarrito();
    MU.negocioUI.refreshSelects();
    MU.toast('✅ Venta registrada: Bs ' + MU.fmtBs(venta.total), 'ok');
  } finally {
    MU.negocioUI.enviando = false;
    btn.disabled = false;
  }
};

/* ---------- Entrada ---------- */

MU.negocioUI.confirmarEntrada = function () {
  if (MU.negocioUI.enviando) return;
  const p = MU.productoPorId(document.getElementById('e-producto').value);
  if (!p) { alert('Seleccioná un producto'); return; }
  let cant = parseFloat(document.getElementById('e-cantidad').value);
  if (isNaN(cant) || cant <= 0) { alert('Ingresá una cantidad mayor a cero'); return; }
  const n = MU.negocio();
  if (!(n && n.metodo === 'decimal')) cant = Math.round(cant);
  const costo = parseFloat(document.getElementById('e-costo').value);
  const proveedor = document.getElementById('e-proveedor').value.trim();
  const motivo = document.getElementById('e-motivo').value.trim() || 'Compra / reposición';
  MU.negocioUI.enviando = true;
  document.getElementById('btn-confirmar-entrada').disabled = true;
  try {
    const lista = MU.productos();
    const movs = MU.movimientos();
    const prod = lista.find(x => x.id === p.id);
    if (!isNaN(costo) && costo >= 0) prod.costo = Math.round(costo * 100) / 100;
    if (proveedor) prod.proveedor = proveedor;
    aplicarDelta(prod, cant);
    movs.push({
      id: MU.uid(), tipo: 'entrada', productoId: prod.id, producto: prod.nombre,
      cantidad: cant, delta: cant, costoUnitario: isNaN(costo) ? null : Math.round(costo * 100) / 100,
      fecha: MU.ahoraISO(), motivo: motivo, stockDespues: prod.cantidad
    });
    MU.guardarProductos(lista);
    MU.guardarMovimientos(movs);
    ['e-cantidad', 'e-costo', 'e-proveedor', 'e-motivo'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('e-cantidad').value = 1;
    MU.negocioUI.refreshSelects();
    MU.toast('📥 Entrada registrada: +' + cant + ' ' + prod.unidad, 'ok');
  } finally {
    MU.negocioUI.enviando = false;
    document.getElementById('btn-confirmar-entrada').disabled = false;
  }
};

/* ---------- Ajuste / merma / devolución ---------- */

MU.negocioUI.cambioTipoAjuste = function () {
  const tipo = document.getElementById('a-tipo').value;
  document.getElementById('a-sentido-campo').classList.toggle('oculto', tipo !== 'ajuste');
};

MU.negocioUI.confirmarAjuste = function () {
  if (MU.negocioUI.enviando) return;
  const tipo = document.getElementById('a-tipo').value;
  const p = MU.productoPorId(document.getElementById('a-producto').value);
  if (!p) { alert('Seleccioná un producto'); return; }
  let cant = parseFloat(document.getElementById('a-cantidad').value);
  if (isNaN(cant) || cant <= 0) { alert('Ingresá una cantidad mayor a cero'); return; }
  const n = MU.negocio();
  if (!(n && n.metodo === 'decimal')) cant = Math.round(cant);
  const motivo = document.getElementById('a-motivo').value.trim();
  if (!motivo) { alert('Explicá el motivo del ajuste: es obligatorio para la trazabilidad.'); return; }
  const sentido = tipo === 'ajuste'
    ? parseInt(document.getElementById('a-sentido').value, 10) : 1;
  const delta = tipo === 'merma' ? -cant : tipo === 'ajuste' ? cant * sentido : cant;
  if (delta < 0 && cant > p.cantidad) {
    alert(`No se puede restar ${cant}: solo hay ${p.cantidad} ${p.unidad} en stock.`); return;
  }
  MU.negocioUI.enviando = true;
  document.getElementById('btn-confirmar-ajuste').disabled = true;
  try {
    const lista = MU.productos();
    const movs = MU.movimientos();
    const prod = lista.find(x => x.id === p.id);
    aplicarDelta(prod, delta);
    movs.push({
      id: MU.uid(), tipo: tipo, productoId: prod.id, producto: prod.nombre,
      cantidad: cant, delta: delta, sentido: sentido,
      fecha: MU.ahoraISO(), motivo: motivo, stockDespues: prod.cantidad
    });
    MU.guardarProductos(lista);
    MU.guardarMovimientos(movs);
    document.getElementById('a-motivo').value = '';
    document.getElementById('a-cantidad').value = 1;
    MU.negocioUI.refreshSelects();
    MU.toast('⚖️ Movimiento registrado (' + tipo + ' ' + (delta > 0 ? '+' : '') + delta + ')', 'ok');
  } finally {
    MU.negocioUI.enviando = false;
    document.getElementById('btn-confirmar-ajuste').disabled = false;
  }
};

/* ---------- Historial ---------- */

MU.negocioUI.renderHistorial = function () {
  const tipo = document.getElementById('h-tipo').value;
  const dias = parseInt(document.getElementById('h-dias').value, 10);
  let movs = MU.movimientos().slice().reverse();
  if (tipo) movs = movs.filter(m => m.tipo === tipo);
  if (dias > 0) {
    const corte = new Date(Date.now() - dias * 86400000).toISOString();
    movs = movs.filter(m => m.fecha >= corte);
  }
  const etiquetas = { venta: 'Venta', entrada: 'Entrada', ajuste: 'Ajuste', merma: 'Merma', devolucion: 'Devolución' };
  const cont = document.getElementById('h-tabla');
  if (!movs.length) {
    cont.innerHTML = `<p class="vacio">Sin movimientos para este filtro. Registrá una venta o entrada para ver el historial.</p>`;
    return;
  }
  cont.innerHTML = `<div class="tabla-scroll"><table class="tabla-datos">
    <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cant.</th><th>Stock después</th><th>Motivo</th></tr></thead>
    <tbody>${movs.slice(0, 200).map(m => `
      <tr><td>${MU.fmtFechaHora(m.fecha)}</td>
      <td>${MU.esc(m.producto)}</td>
      <td><span class="chip-estado ${m.tipo === 'venta' || m.tipo === 'merma' ? 'estado-atencion' : 'estado-ok'}">${etiquetas[m.tipo] || MU.esc(m.tipo)}</span></td>
      <td class="${m.delta < 0 ? 'baja' : 'sube'}">${m.delta > 0 ? '+' : ''}${m.delta}</td>
      <td>${m.stockDespues}</td>
      <td>${MU.esc(m.motivo || '—')}</td></tr>`).join('')}
    </tbody></table></div>
    ${movs.length > 200 ? `<p class="nota-pequena">Mostrando los 200 más recientes de ${movs.length}.</p>` : ''}`;
};

/* ---------- Enlaces de eventos ---------- */

MU.negocioUI.enlazar = function () {
  document.getElementById('neg-buscador').addEventListener('input', MU.negocioUI.renderProductos);
  document.getElementById('h-tipo').addEventListener('change', MU.negocioUI.renderHistorial);
  document.getElementById('h-dias').addEventListener('change', MU.negocioUI.renderHistorial);
  document.getElementById('a-tipo').addEventListener('change', MU.negocioUI.cambioTipoAjuste);
  document.getElementById('v-producto').addEventListener('change', function () {
    const p = MU.productoPorId(this.value);
    document.getElementById('v-precio').value = p && p.precioVenta > 0 ? p.precioVenta : '';
  });
};
