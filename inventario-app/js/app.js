/* ============================================================
   Inventario Boliviano — lógica de la aplicación
   ============================================================ */

let datos = {};
let vistaActual = 'inicio';
let seccionActual = 'alimentos';
let filtroCategoria = null;
let busqueda = '';
let editandoIndice = null;

/* ---------- Persistencia ---------- */

function cargar() {
  Object.keys(SECCIONES).forEach(sec => {
    const clave = SECCIONES[sec].clave;
    let guardado = null;
    try {
      guardado = JSON.parse(localStorage.getItem(clave));
    } catch (e) {
      console.warn('Datos corruptos en ' + clave + ', se usarán los valores base.', e);
    }
    // Migración desde la versión anterior (clave única 'inventarioCanasta')
    if ((!Array.isArray(guardado) || guardado.length === 0) && sec === 'alimentos') {
      try {
        const viejo = JSON.parse(localStorage.getItem('inventarioCanasta'));
        if (Array.isArray(viejo) && viejo.length > 0) guardado = viejo;
      } catch (e) { /* nada que migrar */ }
    }
    if (Array.isArray(guardado) && guardado.length > 0) {
      datos[sec] = guardado.map(p => normalizarProducto(p, sec));
    } else {
      datos[sec] = JSON.parse(JSON.stringify(SECCIONES[sec].productos))
        .map(p => normalizarProducto(p, sec));
    }
    guardar(sec);
  });
}

function normalizarProducto(p, sec) {
  const nombre = String(p.nombre || 'Producto').trim();
  const clave = nombre.toLowerCase();
  let categoria = p.categoria;
  if (!categoria || !categoriasDe(sec).some(c => c.id === categoria)) {
    categoria = MAPA_CATEGORIAS[clave] || 'otros';
  }
  let minimo = parseInt(p.minimo, 10);
  if (isNaN(minimo) || minimo < 1) minimo = MINIMO_POR_DEFECTO;
  let precio = parseFloat(p.precio);
  if (isNaN(precio) || precio < 0) precio = 0;
  return {
    nombre: nombre,
    emoji: p.emoji || '📦',
    unidad: p.unidad || 'unidades',
    stock: Math.max(0, parseInt(p.stock, 10) || 0),
    categoria: categoria,
    minimo: minimo,
    precio: Math.round(precio * 100) / 100,
    precioFecha: p.precioFecha || null,
    vencimiento: p.vencimiento || null
  };
}

function guardar(sec) {
  localStorage.setItem(SECCIONES[sec].clave, JSON.stringify(datos[sec]));
}

/* ---------- Utilidades ---------- */

function categoriasDe(sec) {
  return SECCIONES[sec].categorias;
}

function nombreCategoria(sec, id) {
  const cat = categoriasDe(sec).find(c => c.id === id);
  return cat ? cat.nombre : 'Otros';
}

function emojiCategoria(sec, id) {
  const cat = categoriasDe(sec).find(c => c.id === id);
  return cat ? cat.emoji : '📦';
}

function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/* ---------- Utilidades de precios ---------- */

function fmtBs(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const [ent, dec] = v.toFixed(2).split('.');
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec;
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function ineDatos() {
  return (typeof window !== 'undefined' && window.INE_IPC) ? window.INE_IPC : null;
}

function ineDeProducto(nombre) {
  const d = ineDatos();
  if (!d || !d.productos) return null;
  const ine = MAPA_INE[String(nombre || '').trim().toLowerCase()];
  return ine ? (d.productos[ine] || null) : null;
}

function valorSeccion(sec) {
  let total = 0, conPrecio = 0, pendientes = [];
  datos[sec].forEach(p => {
    if (p.precio > 0) { total += p.precio * p.stock; conPrecio++; }
    else pendientes.push(p);
  });
  return { total: Math.round(total * 100) / 100, conPrecio, pendientes };
}

function valorGlobal() {
  let total = 0, conPrecio = 0, pendientes = [];
  Object.keys(SECCIONES).forEach(sec => {
    const v = valorSeccion(sec);
    total += v.total; conPrecio += v.conPrecio;
    pendientes.push(...v.pendientes.map(p => ({ p: p, sec: sec })));
  });
  return { total: Math.round(total * 100) / 100, conPrecio, pendientes };
}

function analizar(sec) {
  const inv = datos[sec];
  const sinStock = inv.filter(p => p.stock === 0);
  const bajos = inv.filter(p => p.stock > 0 && p.stock < p.minimo);
  const alertas = sinStock.length + bajos.length;
  const unidades = inv.reduce((s, p) => s + p.stock, 0);
  let nivel, clase, icono;
  if (sinStock.length > 0) {
    nivel = 'CRÍTICO'; clase = 'estado-critico'; icono = '🔴';
  } else if (alertas > 0) {
    nivel = 'EN ATENCIÓN'; clase = 'estado-atencion'; icono = '🟡';
  } else {
    nivel = 'SALUDABLE'; clase = 'estado-ok'; icono = '🟢';
  }
  const sugerencias = [];
  // los nombres van escapados: las sugerencias se insertan como HTML en el
  // banner de sección y en el informe de impresión (evita XSS reflejado)
  if (sinStock.length > 0) sugerencias.push('Comprar con urgencia: ' + sinStock.map(p => escaparHTML(p.nombre)).join(', ') + '.');
  if (bajos.length > 0) sugerencias.push('Reponer pronto: ' + bajos.map(p => escaparHTML(p.nombre)).join(', ') + '.');
  const vencidos = inv.filter(p => p.vencimiento && new Date(p.vencimiento + 'T23:59:59') < Date.now());
  const porVencer = inv.filter(p => p.vencimiento && new Date(p.vencimiento + 'T23:59:59') >= Date.now()
    && Math.ceil((new Date(p.vencimiento + 'T23:59:59') - Date.now()) / 86400000) <= 7);
  if (vencidos.length > 0) sugerencias.push('🚨 Vencidos: ' + vencidos.map(p => escaparHTML(p.nombre)).join(', ') + '.');
  if (porVencer.length > 0) sugerencias.push('🗓️ Vencen en menos de 8 días: ' + porVencer.map(p => escaparHTML(p.nombre)).join(', ') + '.');
  if (sugerencias.length === 0) sugerencias.push('Todo en orden. No hay productos en estado crítico.');
  return { nivel, clase, icono, sinStock, bajos, alertas, unidades, sugerencias };
}

/* ---------- Navegación ---------- */

function irAVista(vista) {
  vistaActual = vista;
  ['inicio', 'seccion', 'precios', 'informe'].forEach(v => {
    document.getElementById('vista-' + v).classList.toggle('oculto', v !== vista);
  });
  document.getElementById('acciones-flotantes').classList.toggle('oculto', vista !== 'seccion');
  document.getElementById('nav-inicio').classList.toggle('activo', vista === 'inicio');
  document.getElementById('nav-informe').classList.toggle('activo', vista === 'informe');
  const navSec = document.getElementById('nav-' + seccionActual);
  document.querySelectorAll('.barra-inferior button').forEach(b => b.classList.remove('activo'));
  if (vista === 'seccion' && navSec) navSec.classList.add('activo');
  else document.getElementById('nav-' + vista).classList.add('activo');
  window.scrollTo(0, 0);
  if (vista === 'inicio') renderInicio();
  if (vista === 'informe') renderInforme();
  if (vista === 'seccion') renderSeccion();
  if (vista === 'precios') renderPrecios();
}

function abrirSeccion(sec) {
  seccionActual = sec;
  filtroCategoria = null;
  busqueda = '';
  document.getElementById('buscador').value = '';
  irAVista('seccion');
}

/* ---------- Render: Inicio ---------- */

function renderInicio() {
  const claves = Object.keys(SECCIONES);
  let totalProductos = 0, totalUnidades = 0, totalAlertas = 0, seccionesCriticas = 0;

  const html = claves.map(sec => {
    const a = analizar(sec);
    totalProductos += datos[sec].length;
    totalUnidades += a.unidades;
    totalAlertas += a.alertas;
    if (a.nivel === 'CRÍTICO') seccionesCriticas++;
    return `
      <div class="tarjeta-seccion" onclick="abrirSeccion('${sec}')">
        <div class="emoji">${SECCIONES[sec].emoji}</div>
        <div class="info">
          <h3>${SECCIONES[sec].titulo}</h3>
          <p>${datos[sec].length} productos · ${a.unidades} unidades · ${a.icono} ${a.nivel}</p>
        </div>
        <div class="flecha">›</div>
      </div>`;
  }).join('');

  document.getElementById('tarjetas-secciones').innerHTML = html;
  document.getElementById('home-productos').textContent = totalProductos;
  document.getElementById('home-unidades').textContent = totalUnidades;
  document.getElementById('home-alertas').textContent = totalAlertas;
  document.getElementById('home-valor').textContent = 'Bs ' + fmtBs(valorGlobal().total);

  const nivelGlobal = seccionesCriticas === claves.length ? ['estado-critico', '🔴', 'CRÍTICO']
    : seccionesCriticas > 0 ? ['estado-atencion', '🟡', 'EN ATENCIÓN']
    : totalAlertas > 0 ? ['estado-atencion', '🟡', 'EN ATENCIÓN']
    : ['estado-ok', '🟢', 'SALUDABLE'];
  const banner = document.getElementById('banner-global');
  banner.className = 'banner ' + nivelGlobal[0];
  let sugerencia = nivelGlobal[2] === 'SALUDABLE'
    ? 'Tu despensa está completa. ¡Buen trabajo!'
    : 'Revisá tus secciones: hay productos que necesitan reposición.';
  banner.innerHTML = `<h3>${nivelGlobal[1]} Estado general del hogar: ${nivelGlobal[2]}</h3><ul><li>${sugerencia}</li><li>${totalAlertas} producto(s) con stock bajo o agotado.</li></ul>`;
}

/* ---------- Render: Sección ---------- */

function productosFiltrados() {
  return datos[seccionActual]
    .map((p, i) => ({ p: p, i: i }))
    .filter(({ p }) => (filtroCategoria === null || p.categoria === filtroCategoria)
      && (!busqueda || p.nombre.toLowerCase().includes(busqueda)));
}

function renderSeccion() {
  const sec = seccionActual;
  const a = analizar(sec);
  const banner = document.getElementById('banner-seccion');
  banner.className = 'banner ' + a.clase;
  banner.innerHTML = `<h3>${a.icono} ${SECCIONES[sec].titulo}: ${a.nivel}</h3><ul>${a.sugerencias.map(s => `<li>${s}</li>`).join('')}</ul>`;

  // Chips de categorías
  const chips = document.getElementById('chips');
  chips.innerHTML = `<button class="chip ${filtroCategoria === null ? 'activo' : ''}" onclick="filtrar(null)">Todos</button>` +
    categoriasDe(sec).map(c => `
      <button class="chip ${filtroCategoria === c.id ? 'activo' : ''}" onclick="filtrar('${c.id}')">${c.emoji} ${c.nombre}</button>
    `).join('');

  document.getElementById('sec-productos').textContent = datos[sec].length;
  document.getElementById('sec-unidades').textContent = a.unidades;
  document.getElementById('sec-alertas').textContent = a.alertas;

  const lista = productosFiltrados();
  const contenedor = document.getElementById('lista-productos');
  if (lista.length === 0) {
    contenedor.innerHTML = `<div class="vacio">📭<br>No hay productos que coincidan.<br>Usá el botón ＋ para agregar.</div>`;
    return;
  }
  contenedor.innerHTML = lista.map(({ p, i }) => {
    const agotado = p.stock === 0;
    const bajo = !agotado && p.stock < p.minimo;
    let vencTxt = '';
    if (p.vencimiento) {
      const dv = Math.ceil((new Date(p.vencimiento + 'T23:59:59') - Date.now()) / 86400000);
      vencTxt = dv < 0 ? ' · 🚨 vencido'
        : dv <= 7 ? ` · 🗓️ vence en ${dv}d`
        : ` · vence ${new Date(p.vencimiento + 'T12:00:00').toLocaleDateString('es-BO')}`;
    }
    return `
      <div class="producto" onclick="abrirModalEditar(${i})">
        <div class="emoji">${p.emoji || emojiCategoria(sec, p.categoria)}</div>
        <div class="datos">
          <h4>${escaparHTML(p.nombre)}</h4>
          <div class="meta ${agotado ? 'sin' : ''}">
            ${emojiCategoria(sec, p.categoria)} ${nombreCategoria(sec, p.categoria)} · ${escaparHTML(p.unidad)} · mín ${p.minimo}${vencTxt}
            ${agotado ? ' · 🚫 sin stock' : bajo ? ' · ⚠️ stock bajo' : ''}
          </div>
          <div class="valor ${p.precio > 0 ? '' : 'pendiente'}"
               title="${p.precio > 0 ? 'Precio unitario: Bs ' + fmtBs(p.precio) + ' (cargado ' + (p.precioFecha || 'sin fecha') + ')' : 'Cargá el precio para ver el valor'}">
            ${p.precio > 0 ? '💰 Bs ' + fmtBs(p.precio * p.stock) : 'precio pendiente'}
          </div>
        </div>
        <div class="controles">
          <div class="stepper">
            <button class="menos" onclick="event.stopPropagation(); modificar(${i}, -1)" title="Consumir">−</button>
            <span class="stock ${agotado ? 'bajo' : bajo ? 'bajo' : 'ok'}">${p.stock}</span>
            <button class="mas" onclick="event.stopPropagation(); modificar(${i}, 1)" title="Agregar">+</button>
          </div>
          <button class="icono-btn" onclick="event.stopPropagation(); abrirModalEditar(${i})" title="Editar">✏️</button>
        </div>
      </div>`;
  }).join('');
}

function filtrar(cat) {
  filtroCategoria = cat;
  renderSeccion();
}

/* ---------- Render: Informe ---------- */

function renderInforme() {
  const claves = Object.keys(SECCIONES);
  let totalProductos = 0, totalUnidades = 0, totalAlertas = 0;
  let criticas = 0;

  claves.forEach(sec => {
    const a = analizar(sec);
    totalProductos += datos[sec].length;
    totalUnidades += a.unidades;
    totalAlertas += a.alertas;
    if (a.nivel === 'CRÍTICO') criticas++;
  });

  const nivel = criticas === claves.length ? ['estado-critico', '🔴', 'CRÍTICO']
    : criticas > 0 ? ['estado-atencion', '🟡', 'EN ATENCIÓN']
    : totalAlertas > 0 ? ['estado-atencion', '🟡', 'EN ATENCIÓN'] : ['estado-ok', '🟢', 'SALUDABLE'];

  const banner = document.getElementById('banner-informe');
  banner.className = 'banner ' + nivel[0];
  banner.innerHTML = `<h3>${nivel[1]} Estado general del hogar: ${nivel[2]}</h3><ul>${claves.map(sec => {
    const a = analizar(sec);
    return `<li>${SECCIONES[sec].emoji} ${SECCIONES[sec].titulo}: ${a.icono} ${a.nivel}</li>`;
  }).join('')}</ul>`;

  document.getElementById('inf-productos').textContent = totalProductos;
  document.getElementById('inf-unidades').textContent = totalUnidades;
  document.getElementById('inf-alertas').textContent = totalAlertas;
  if (typeof MU !== 'undefined' && MU.renderHistStock) MU.renderHistStock();
}

/* ---------- Acciones de stock ---------- */

function modificar(i, signo) {
  const p = datos[seccionActual][i];
  p.stock = Math.max(0, p.stock + signo);
  guardar(seccionActual);
  if (typeof MU !== 'undefined' && MU.registrarCambioStock) {
    MU.registrarCambioStock(seccionActual, p.nombre, signo, p.stock);
  }
  renderSeccion();
}

/* ---------- Modal agregar / editar ---------- */

function abrirModalNuevo() {
  editandoIndice = null;
  document.getElementById('modal-titulo').textContent = 'Agregar producto a ' + SECCIONES[seccionActual].corto;
  const select = document.getElementById('m-categoria');
  select.innerHTML = categoriasDe(seccionActual).map(c => `<option value="${c.id}">${c.emoji} ${c.nombre}</option>`).join('');
  document.getElementById('m-nombre').value = '';
  document.getElementById('m-emoji').value = '';
  document.getElementById('m-unidad').value = '';
  document.getElementById('m-stock').value = 1;
  document.getElementById('m-minimo').value = MINIMO_POR_DEFECTO;
  document.getElementById('m-precio').value = '';
  document.getElementById('m-vencimiento').value = '';
  document.getElementById('btn-eliminar-modal').classList.add('oculto');
  document.getElementById('modal-fondo').classList.add('abierto');
}

function abrirModalEditar(i) {
  const p = datos[seccionActual][i];
  editandoIndice = i;
  document.getElementById('modal-titulo').textContent = 'Editar producto';
  const select = document.getElementById('m-categoria');
  select.innerHTML = categoriasDe(seccionActual).map(c => `<option value="${c.id}" ${c.id === p.categoria ? 'selected' : ''}>${c.emoji} ${c.nombre}</option>`).join('');
  document.getElementById('m-nombre').value = p.nombre;
  document.getElementById('m-emoji').value = p.emoji || '';
  document.getElementById('m-unidad').value = p.unidad;
  document.getElementById('m-stock').value = p.stock;
  document.getElementById('m-minimo').value = p.minimo || MINIMO_POR_DEFECTO;
  document.getElementById('m-precio').value = p.precio > 0 ? p.precio : '';
  document.getElementById('m-vencimiento').value = p.vencimiento || '';
  document.getElementById('btn-eliminar-modal').classList.remove('oculto');
  document.getElementById('modal-fondo').classList.add('abierto');
}

function cerrarModal() {
  document.getElementById('modal-fondo').classList.remove('abierto');
  editandoIndice = null;
}

function cerrarModalSiFondo(e) {
  if (e.target.id === 'modal-fondo') cerrarModal();
}

function guardarProducto() {
  const nombre = document.getElementById('m-nombre').value.trim();
  const emoji = document.getElementById('m-emoji').value.trim();
  const unidad = document.getElementById('m-unidad').value.trim() || 'unidades';
  const categoria = document.getElementById('m-categoria').value;
  const stock = parseInt(document.getElementById('m-stock').value, 10);
  let minimo = parseInt(document.getElementById('m-minimo').value, 10);
  if (isNaN(minimo) || minimo < 1) minimo = MINIMO_POR_DEFECTO;
  const precioIngresado = document.getElementById('m-precio').value.trim();
  let precio = parseFloat(precioIngresado);
  if (isNaN(precio) || precio < 0) precio = 0;
  precio = Math.round(precio * 100) / 100;
  const vencimiento = document.getElementById('m-vencimiento').value || null;
  if (!nombre) { alert('Escribí el nombre del producto'); return; }
  if (isNaN(stock) || stock < 0) { alert('Ingresá una cantidad válida (0 o más)'); return; }

  const sec = seccionActual;
  if (editandoIndice === null) {
    const repetido = datos[sec].find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
    if (repetido) {
      repetido.stock += stock;
      repetido.minimo = minimo;
      if (emoji) repetido.emoji = emoji;
      if (document.getElementById('m-unidad').value.trim()) repetido.unidad = unidad;
      repetido.categoria = categoria;
      repetido.vencimiento = vencimiento;
      if (precioIngresado !== '') {
        repetido.precio = precio;
        repetido.precioFecha = precio > 0 ? hoy() : null;
        if (precio > 0 && typeof MU !== 'undefined') MU.registrarPrecioHistorial(sec, repetido.nombre, precio);
      }
    } else {
      datos[sec].push({ nombre, emoji: emoji || '📦', unidad, stock, categoria, minimo,
                        precio, precioFecha: precio > 0 ? hoy() : null, vencimiento });
      if (precio > 0 && typeof MU !== 'undefined') MU.registrarPrecioHistorial(sec, nombre, precio);
    }
  } else {
    const anterior = datos[sec][editandoIndice];
    datos[sec][editandoIndice] = { nombre, emoji: emoji || '📦', unidad, stock, categoria, minimo,
                                   precio, precioFecha: precio > 0 ? hoy() : (anterior.precioFecha || null),
                                   vencimiento };
    if (precio > 0 && typeof MU !== 'undefined') MU.registrarPrecioHistorial(sec, nombre, precio);
  }
  guardar(sec);
  cerrarModal();
  renderSeccion();
}

function eliminarDesdeModal() {
  if (editandoIndice === null) return;
  if (confirm(`¿Eliminar "${datos[seccionActual][editandoIndice].nombre}" del inventario?`)) {
    datos[seccionActual].splice(editandoIndice, 1);
    guardar(seccionActual);
    cerrarModal();
    renderSeccion();
  }
}

function preguntarRestablecer() {
  if (confirm(`¿Restablecer "${SECCIONES[seccionActual].titulo}" a los productos iniciales? Se borrarán tus cambios de esta sección.`)) {
    datos[seccionActual] = JSON.parse(JSON.stringify(SECCIONES[seccionActual].productos))
      .map(p => normalizarProducto(p, seccionActual));
    guardar(seccionActual);
    filtroCategoria = null;
    busqueda = '';
    document.getElementById('buscador').value = '';
    renderSeccion();
  }
}

/* ---------- Vista Precios ---------- */

let backupPrecios = null;

function cls(v) { return v > 0 ? 'sube' : v < 0 ? 'baja' : ''; }
function pct(v) { return v == null ? '—' : (v > 0 ? '+' : '') + v + '%'; }

function renderPrecios() {
  const gv = valorGlobal();
  document.getElementById('val-alimentos').textContent = 'Bs ' + fmtBs(valorSeccion('alimentos').total);
  document.getElementById('val-limpieza').textContent = 'Bs ' + fmtBs(valorSeccion('limpieza').total);
  document.getElementById('val-total').textContent = 'Bs ' + fmtBs(gv.total);
  renderPanelINE();
  renderGraficoValor();
  renderListaCompras();
  renderTopValor();
  renderTablaVariaciones();
  document.getElementById('btn-deshacer').classList.toggle('oculto', !backupPrecios);
  if (typeof MU !== 'undefined' && MU.preciosHogar) MU.preciosHogar();
}

function renderPanelINE() {
  const d = ineDatos();
  const panel = document.getElementById('panel-ine');
  if (!d || d.error) {
    panel.className = 'panel-ine';
    panel.innerHTML = `<h3>📉 IPC del INE</h3>
      <p class="vacio">Aún no hay datos oficiales cargados.</p>
      <p class="ine-pie">Para tener datos en vivo: ejecutá <b>python3 iniciar.py</b> y abrí la app desde
      <b>http://localhost:8000</b>, o corré <b>python3 scraper.py</b>.</p>`;
    return;
  }
  const g = d.general || {};
  const a = d.divis_alimentos || {};
  const caja = (lab, val) => `<div><p class="ine-lab">${lab}</p><p class="ine-val ${cls(val)}">${val == null ? '—' : pct(val)}</p></div>`;
  panel.className = 'panel-ine';
  panel.innerHTML = `
    <div class="ine-cab"><span>📉 Datos oficiales del INE</span><span class="ine-per">Periodo: <b>${escaparHTML(d.ultimo_periodo || '—')}</b></span></div>
    <div class="ine-cajas">
      ${caja('Inflación del mes', g.var_mensual)}
      ${caja('Acumulada (año)', g.var_acumulada)}
      ${caja('Últimos 12 meses', g.var_12m)}
      ${caja('Alimentos y bebidas (mes)', a.var_mensual)}
    </div>
    <p class="ine-pie">Fuente: ${escaparHTML(d.fuente || 'INE')} · publicado: ${escaparHTML(d.fecha_publicacion || '—')} · descargado: ${escaparHTML(d.fecha_descarga || '—')}</p>
    ${d.aviso ? `<p class="aviso-ine">⚠️ ${escaparHTML(d.aviso)}</p>` : ''}`;
}

function renderGraficoValor() {
  const filas = [];
  let max = 0;
  Object.keys(SECCIONES).forEach(sec => {
    const porCat = {};
    datos[sec].forEach(p => { porCat[p.categoria] = (porCat[p.categoria] || 0) + p.precio * p.stock; });
    Object.keys(porCat).forEach(cat => {
      const v = Math.round(porCat[cat] * 100) / 100;
      if (v > 0) { filas.push({ sec, cat, v }); max = Math.max(max, v); }
    });
  });
  const cont = document.getElementById('graf-valor');
  if (!filas.length) {
    cont.innerHTML = '<h3>📊 Valor por categoría</h3><p class="vacio">Sin precios cargados todavía. Editá un producto y poné su precio en Bs.</p>';
    return;
  }
  filas.sort((a, b) => b.v - a.v);
  cont.innerHTML = `<h3>📊 Valor del inventario por categoría (Bs)</h3>` + filas.map(f => `
    <div class="barra-fila">
      <div class="barra-etiqueta">${SECCIONES[f.sec].emoji} ${escaparHTML(nombreCategoria(f.sec, f.cat))}</div>
      <div class="barra-pista"><div class="barra-valor v-ambar" style="width:${(f.v / max) * 100}%"></div></div>
      <div class="barra-num">${fmtBs(f.v)}</div>
    </div>`).join('');
}

function renderListaCompras() {
  const items = [];
  let total = 0;
  Object.keys(SECCIONES).forEach(sec => {
    datos[sec].forEach(p => {
      if (p.stock < p.minimo && p.precio > 0) {
        const cant = p.minimo - p.stock;
        const costo = Math.round(cant * p.precio * 100) / 100;
        total += costo;
        items.push({ p, cant, costo });
      }
    });
  });
  total = Math.round(total * 100) / 100;
  const gv = valorGlobal();
  const cont = document.getElementById('lista-compras');
  cont.innerHTML = `<h3>🛒 Lista de compras sugerida (para llegar al mínimo)</h3>` +
    (items.length
      ? `<table class="tabla-datos"><thead><tr><th>Producto</th><th>Falta</th><th>Costo est.</th></tr></thead><tbody>` +
        items.map(i => `<tr><td>${i.p.emoji} ${escaparHTML(i.p.nombre)}</td><td>${i.cant} ${escaparHTML(i.p.unidad)}</td><td>Bs ${fmtBs(i.costo)}</td></tr>`).join('') +
        `</tbody></table><p class="total-linea">💰 Total estimado: <b>Bs ${fmtBs(total)}</b></p>`
      : `<p class="vacio">✅ Ningún producto está debajo de su mínimo. No hace falta comprar.</p>`) +
    (gv.pendientes.length
      ? `<details><summary>⏱️ Precios por cargar (${gv.pendientes.length})</summary><p class="pendientes">${gv.pendientes.map(x => x.p.emoji + ' ' + escaparHTML(x.p.nombre)).join(' · ')}</p></details>`
      : '');
}

function renderTopValor() {
  const items = [];
  Object.keys(SECCIONES).forEach(sec => {
    datos[sec].forEach(p => { if (p.precio > 0) items.push({ sec, p, valor: Math.round(p.precio * p.stock * 100) / 100 }); });
  });
  items.sort((a, b) => b.valor - a.valor);
  const cont = document.getElementById('top-valor');
  if (!items.length) { cont.innerHTML = ''; return; }
  cont.innerHTML = `<h3>🏆 Top ${Math.min(5, items.length)} productos de mayor valor</h3>` +
    items.slice(0, 5).map(i => `
      <div class="fila-preview">
        <span>${i.p.emoji} ${escaparHTML(i.p.nombre)} <small>(${i.p.stock} ${escaparHTML(i.p.unidad)} × Bs ${fmtBs(i.p.precio)})</small></span>
        <span><b>Bs ${fmtBs(i.valor)}</b></span>
      </div>`).join('');
}

function renderTablaVariaciones() {
  const cont = document.getElementById('tabla-var-ine');
  const d = ineDatos();
  if (!d || d.error) {
    cont.innerHTML = '';
    return;
  }
  const filas = [];
  Object.keys(SECCIONES).forEach(sec => {
    datos[sec].forEach(p => {
      const ine = ineDeProducto(p.nombre);
      if (ine) filas.push({ p, ine });
    });
  });
  if (!filas.length) { cont.innerHTML = ''; return; }
  filas.sort((a, b) => (b.ine.var_mensual || 0) - (a.ine.var_mensual || 0));
  const sinEquiv = valorGlobal().pendientes.length;
  cont.innerHTML = `<h3>📉 Variación oficial del INE por producto (periodo ${escaparHTML(d.ultimo_periodo || '—')})</h3>` +
    `<table class="tabla-datos"><thead><tr><th>Producto</th><th>Mes</th><th>Acum.</th><th>12 meses</th></tr></thead><tbody>` +
    filas.map(f => `<tr>
        <td>${f.p.emoji} ${escaparHTML(f.p.nombre)}</td>
        <td class="${cls(f.ine.var_mensual)}">${pct(f.ine.var_mensual)}</td>
        <td class="${cls(f.ine.var_acumulada)}">${pct(f.ine.var_acumulada)}</td>
        <td class="${cls(f.ine.var_12m)}">${pct(f.ine.var_12m)}</td>
      </tr>`).join('') +
    `</tbody></table>
     <p class="pie-var">Los productos se muestran según la canasta del INE. "Mes" = variación respecto al mes anterior.</p>`;
}

function actualizarINE() {
  const btn = document.getElementById('btn-actualizar-ine');
  btn.disabled = true;
  btn.textContent = '⏳ Consultando INE…';
  fetch('/api/ine/ipc?refresh=1')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(d => {
      window.INE_IPC = d;
      renderPrecios();
      alert('✅ Datos INE actualizados. Último periodo: ' + (d.ultimo_periodo || '—') + '.');
    })
    .catch(() => {
      alert('No se pudo actualizar en vivo.\n\nPara tener datos en tiempo real:\n' +
            '1) Ejecutá: python3 iniciar.py\n2) Abrí la app en http://localhost:8000\n\n' +
            'Si abriste index.html directo, igual funcionan los últimos datos guardados en js/ine_ipc.js.');
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = '🔄 Actualizar datos INE';
    });
}

/* ---------- Aplicar inflación INE a los precios ---------- */

function cambiosInflacion() {
  const campo = document.getElementById('i-periodo').value;
  const res = [];
  Object.keys(SECCIONES).forEach(sec => {
    datos[sec].forEach((p, i) => {
      if (p.precio <= 0) return;
      const ine = ineDeProducto(p.nombre);
      if (!ine || ine[campo] == null) return;
      const nuevo = Math.max(0, Math.round(p.precio * (1 + ine[campo] / 100) * 100) / 100);
      if (nuevo !== p.precio) res.push({ sec, i, p, variacion: ine[campo], nuevo });
    });
  });
  return res;
}

function abrirModalInflacion() {
  const d = ineDatos();
  if (!d || d.error) { alert('No hay datos del INE cargados todavía. Usá "Actualizar datos INE".'); return; }
  if (!cambiosInflacion().length) {
    alert('No hay productos con precio cargado y variación disponible del INE.\nCargá precios en los productos primero.');
    return;
  }
  document.getElementById('modal-inflacion').classList.add('abierto');
  renderPreviewInflacion();
}

function renderPreviewInflacion() {
  const campo = document.getElementById('i-periodo').value;
  const d = ineDatos();
  const nombres = { var_mensual: 'variación mensual', var_acumulada: 'variación acumulada (en el año)', var_12m: 'variación a 12 meses' };
  const cambios = cambiosInflacion();
  document.getElementById('i-nota').textContent = cambios.length
    ? `Se aplicará la ${nombres[campo]} oficial del INE (periodo ${d.ultimo_periodo || '—'}) a ${cambios.length} producto(s). Es una estimación, no un precio oficial; podrás deshacerlo.`
    : 'Ningún producto con precio cargado tiene esta variación disponible.';
  document.getElementById('i-preview').innerHTML = cambios.map(c => `
    <div class="fila-preview">
      <span>${c.p.emoji} ${escaparHTML(c.p.nombre)}</span>
      <span>Bs ${fmtBs(c.p.precio)} → <b>Bs ${fmtBs(c.nuevo)}</b> <small class="${cls(c.variacion)}">${pct(c.variacion)}</small></span>
    </div>`).join('');
}

function cerrarModalInflacion() {
  document.getElementById('modal-inflacion').classList.remove('abierto');
}

function cerrarInflacionSiFondo(e) {
  if (e.target.id === 'modal-inflacion') cerrarModalInflacion();
}

function aplicarInflacion() {
  const cambios = cambiosInflacion();
  if (!cambios.length) { cerrarModalInflacion(); return; }
  if (!confirm(`¿Aplicar el ajuste a ${cambios.length} producto(s)? Podrás deshacerlo con el botón ↩️.`)) return;
  backupPrecios = JSON.parse(JSON.stringify(datos));
  cambios.forEach(c => {
    datos[c.sec][c.i].precio = c.nuevo;
    datos[c.sec][c.i].precioFecha = hoy();
    if (typeof MU !== 'undefined') MU.registrarPrecioHistorial(c.sec, c.p.nombre, c.nuevo);
  });
  Object.keys(SECCIONES).forEach(guardar);
  cerrarModalInflacion();
  renderPrecios();
}

function deshacerInflacion() {
  if (!backupPrecios) return;
  if (confirm('¿Deshacer el último ajuste de precios?')) {
    datos = backupPrecios;
    backupPrecios = null;
    Object.keys(SECCIONES).forEach(sec => datos[sec].forEach(p => {
      if (p.precio > 0 && typeof MU !== 'undefined') MU.registrarPrecioHistorial(sec, p.nombre, p.precio);
    }));
    Object.keys(SECCIONES).forEach(guardar);
    renderPrecios();
  }
}

/* ---------- Informe PDF ---------- */

function descargarPDF() {
  const fecha = new Date().toLocaleString('es-BO');
  const claves = Object.keys(SECCIONES);
  let criticas = 0;

  let cuerpo = claves.map(sec => {
    const a = analizar(sec);
    if (a.nivel === 'CRÍTICO') criticas++;
    return `
      <h2>${SECCIONES[sec].emoji} ${SECCIONES[sec].titulo} — ${a.icono} ${a.nivel}</h2>
      <p>${datos[sec].length} productos · ${a.unidades} unidades en total · ${a.alertas} producto(s) con stock bajo o agotado</p>
      <p><strong>Sugerencias:</strong></p>
      <ul>${a.sugerencias.map(s => `<li>${s}</li>`).join('')}</ul>
      <table>
        <thead><tr><th>Producto</th><th>Categoría</th><th>Unidad</th><th>Stock</th><th>Mínimo</th><th>Precio Bs</th><th>Valor Bs</th><th>Estado</th></tr></thead>
        <tbody>${datos[sec].map(p => `
          <tr>
            <td>${p.emoji || ''} ${escaparHTML(p.nombre)}</td>
            <td>${escaparHTML(nombreCategoria(sec, p.categoria))}</td>
            <td>${escaparHTML(p.unidad)}</td>
            <td>${p.stock}</td>
            <td>${p.minimo}</td>
            <td>${p.precio > 0 ? fmtBs(p.precio) : '—'}</td>
            <td>${p.precio > 0 ? fmtBs(p.precio * p.stock) : '—'}</td>
            <td>${p.stock === 0 ? 'Sin stock' : p.stock < p.minimo ? 'Stock bajo' : 'Suficiente'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }).join('');

  // ---- Resumen financiero e INE ----
  const gv = valorGlobal();
  const items = [];
  let costoReposicion = 0;
  claves.forEach(sec => datos[sec].forEach(p => {
    if (p.stock < p.minimo && p.precio > 0) {
      const cant = p.minimo - p.stock;
      const costo = Math.round(cant * p.precio * 100) / 100;
      costoReposicion += costo;
      items.push({ p, cant, costo });
    }
  }));
  const d = ineDatos();
  const g = (d && !d.error) ? d.general : {};
  const resumenFinanciero = `
    <h2>💰 Resumen financiero del inventario</h2>
    <p>Valor total estimado: <b>Bs ${fmtBs(gv.total)}</b> (Alimentos: Bs ${fmtBs(valorSeccion('alimentos').total)} · Limpieza: Bs ${fmtBs(valorSeccion('limpieza').total)})</p>
    <p>Precios cargados: ${gv.conPrecio} de ${claves.reduce((s, sec) => s + datos[sec].length, 0)} productos${gv.pendientes.length ? ' · pendientes: ' + gv.pendientes.map(x => x.p.nombre).join(', ') : ''}</p>
    ${items.length ? `<p><strong>Lista de compras sugerida:</strong></p><ul>${items.map(i => `<li>${i.p.nombre}: ${i.cant} ${i.p.unidad} — Bs ${fmtBs(i.costo)}</li>`).join('')}</ul>
      <p>Costo estimado de reposición: <b>Bs ${fmtBs(Math.round(costoReposicion * 100) / 100)}</b></p>` : '<p>Lista de compras: sin faltantes bajo el mínimo.</p>'}`;

  const resumenINE = (d && !d.error)
    ? `<h2>📉 Índice de Precios al Consumidor (INE)</h2>
       <p>Periodo: <b>${escaparHTML(d.ultimo_periodo || '—')}</b> · publicado: ${escaparHTML(d.fecha_publicacion || '—')}</p>
       <ul>
         <li>Inflación del mes: ${pct(g.var_mensual)}</li>
         <li>Acumulada en el año: ${pct(g.var_acumulada)}</li>
         <li>Últimos 12 meses: ${pct(g.var_12m)}</li>
         ${d.divis_alimentos ? `<li>Alimentos y bebidas (mes): ${pct(d.divis_alimentos.var_mensual)}</li>` : ''}
       </ul>
       <p>Fuente: ${escaparHTML(d.fuente || 'INE')} — los precios en Bs son estimaciones cargadas por el usuario, no precios oficiales.</p>`
    : `<h2>📉 Índice de Precios al Consumidor (INE)</h2><p>Sin datos del INE cargados en este dispositivo.</p>`;

  const nivel = criticas === claves.length ? '🔴 CRÍTICO'
    : criticas > 0 ? '🟡 EN ATENCIÓN' : '🟢 SALUDABLE';
  document.getElementById('areaImpresion').innerHTML =
    `<h1>🛒 Informe de Inventario — Inventario Multiuso (Hogar)</h1><p>Fecha: ${fecha}</p>
     <p><strong>Estado general del hogar: ${nivel}</strong></p>` + resumenFinanciero + resumenINE + cuerpo;
  window.print();
}

/* ---------- Buscador ---------- */

document.getElementById('buscador').addEventListener('input', e => {
  busqueda = e.target.value.trim().toLowerCase();
  renderSeccion();
});

/* ---------- Inicio ---------- */

cargar();
irAVista('inicio');
if (typeof MU !== 'undefined' && MU.iniciarPlataforma) MU.iniciarPlataforma();
