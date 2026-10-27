/* ============================================================
   Inventario Multiuso — Estadísticas de mi negocio
   Indicadores sobre datos REALES registrados (ventas, entradas,
   costos). Cuando faltan datos se dice explícitamente; no se
   inventan cifras ni se presentan reglas fijas como IA.
   ============================================================ */

MU.stats = {};

/* ---------- Período de análisis ---------- */

MU.stats.periodo = function () {
  const sel = document.getElementById('sel-periodo').value;
  const ahora = new Date();
  let desde = null, hasta = null, etiqueta = '';
  if (sel === '7' || sel === '30') {
    const dias = parseInt(sel, 10);
    desde = new Date(ahora.getTime() - dias * 86400000).toISOString();
    etiqueta = `últimos ${dias} días`;
  } else if (sel === 'mes') {
    desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
    etiqueta = 'mes actual';
  } else if (sel === 'todo') {
    etiqueta = 'histórico completo';
  } else {
    const d = document.getElementById('p-desde').value;
    const h = document.getElementById('p-hasta').value;
    desde = d ? new Date(d + 'T00:00:00').toISOString() : null;
    hasta = h ? new Date(h + 'T23:59:59').toISOString() : null;
    etiqueta = `del ${d ? MU.fmtFecha(d) : 'el inicio'} al ${h ? MU.fmtFecha(h) : 'hoy'}`;
  }
  const enPeriodo = (f) => (!desde || f >= desde) && (!hasta || f <= hasta);
  const dias = desde ? Math.max(1, Math.ceil(((hasta ? new Date(hasta) : ahora) - new Date(desde)) / 86400000)) : null;
  return { desde, hasta, etiqueta, enPeriodo, dias };
};

/* Período inmediatamente anterior del mismo largo (para comparar). */
MU.stats.periodoAnterior = function (p) {
  if (!p.desde || !p.dias) return null;
  const fin = new Date(p.desde), ini = new Date(fin.getTime() - p.dias * 86400000);
  return { desde: ini.toISOString(), hasta: fin.toISOString(),
    enPeriodo: (f) => f >= ini.toISOString() && f < fin.toISOString() };
};

/* ---------- Agregaciones ---------- */

MU.stats.agregar = function (enP) {
  const ventas = MU.ventas().filter(v => enP(v.fecha));
  const porProducto = {};   // id → {uds, ingresos}
  let ingresos = 0, cogs = 0, conCostoItems = 0;
  ventas.forEach(v => {
    v.items.forEach(i => {
      const k = i.productoId;
      if (!porProducto[k]) porProducto[k] = { id: k, producto: i.producto, uds: 0, ingresos: 0 };
      porProducto[k].uds += i.cantidad;
      porProducto[k].ingresos += i.cantidad * i.precioUnitario;
      ingresos += i.cantidad * i.precioUnitario;
      if (i.costoUnitario > 0) { cogs += i.cantidad * i.costoUnitario; conCostoItems++; }
    });
  });
  return {
    ventas,
    lista: Object.values(porProducto),
    ingresos: Math.round(ingresos * 100) / 100,
    cogs: Math.round(cogs * 100) / 100,
    conCostoItems,
    totalItems: ventas.reduce((s, v) => s + v.items.length, 0)
  };
};

/* ---------- Inventario valorado al costo ---------- */

MU.stats.inventarioCosto = function () {
  const prods = MU.productos().filter(p => p.activo && p.costo > 0);
  return {
    valor: Math.round(prods.reduce((s, p) => s + p.costo * p.cantidad, 0) * 100) / 100,
    conCosto: prods.length,
    total: MU.productos().filter(p => p.activo).length
  };
};

/* Estimación del inventario al inicio del período:
   invInicial = invActual + salidas del período − entradas del período. */
MU.stats.invInicialPeriodo = function (p, invActual) {
  if (!p.desde) return invActual;
  let delta = 0;
  MU.movimientos().forEach(m => {
    if (m.fecha < p.desde || (p.hasta && m.fecha > p.hasta)) return;
    if (m.tipo === 'entrada' || m.tipo === 'devolucion') delta -= (m.delta || 0);
    else delta += -(m.delta || 0);   // salidas/mermas/ajustes negativos aumentan el inicial
  });
  return Math.max(0, invActual + delta);
};

/* ---------- Render principal ---------- */

MU.stats.render = function () {
  const cont = document.getElementById('stats-cont');
  const p = MU.stats.periodo();
  const a = MU.stats.agregar(p.enPeriodo);
  const inv = MU.stats.inventarioCosto();
  const u = MU.umbrales();
  const activos = MU.productos().filter(x => x.activo);
  const hayHistorial = MU.ventas().length > 0;

  /* ---- Estado inicial sin datos ---- */
  if (!hayHistorial) {
    cont.innerHTML = `
      <div class="tarjeta-lista">
        <h3>📊 Todavía no hay ventas registradas</h3>
        <p class="vacio">Estas estadísticas se calculan con tus ventas reales: cuanto más registres, más útiles serán.</p>
        <ol class="pasos-inicio">
          <li>Cargá tus productos en <b>Productos</b> (con costo y precio de venta si los conocés).</li>
          <li>Registrá cada venta en <b>Movimientos › Venta</b>.</li>
          <li>Registrá reposiciones en <b>Movimientos › Entrada</b>.</li>
          <li>Volvé acá: vas a ver ventas, rotación, permanencia y alertas.</li>
        </ol>
        <p class="nota-pequena">No mostramos datos de ejemplo para no confundirlos con los tuyos.</p>
      </div>`;
    return;
  }

  const cobertura = a.totalItems ? Math.round(a.conCostoItems / a.totalItems * 100) : 0;
  const margen = (a.ingresos > 0 && a.cogs > 0) ? Math.round((a.ingresos - a.cogs) * 100) / 100 : null;
  const margenPct = (margen !== null && a.ingresos > 0) ? Math.round(margen / a.ingresos * 1000) / 10 : null;
  const ticket = a.ventas.length ? Math.round(a.ingresos / a.ventas.length * 100) / 100 : 0;

  let html = '';

  /* ---- Calidad de los datos ---- */
  html += `<div class="tarjeta-lista">
    <h3>🧮 Calidad de los datos (${MU.esc(p.etiqueta)})</h3>
    <ul class="lista-datos">
      <li><b>${a.ventas.length}</b> venta(s) en el período · <b>${a.totalItems}</b> ítem(s) vendidos.</li>
      <li><b>${a.conCostoItems}</b> de ${a.totalItems} ítem(s) tienen costo registrado → cobertura de costos: <b>${cobertura}%</b>.</li>
      <li>Inventario activo valorado al costo: <b>Bs ${MU.fmtBs(inv.valor)}</b> (${inv.conCosto} de ${inv.total} productos con costo).</li>
      ${cobertura < 80 ? `<li class="baja">⚠️ Con pocos costos cargados, el margen y la rotación por costo son parciales: se muestran también métricas por unidades, claramente identificadas.</li>` : ''}
    </ul>
  </div>`;

  /* ---- Ventas del período ---- */
  html += `<div class="tarjeta-lista">
    <h3>💰 Ventas del período</h3>
    <div class="resumen-cajas">
      <div class="tarjeta"><h2>Bs ${MU.fmtBs(a.ingresos)}</h2><p>INGRESOS</p></div>
      <div class="tarjeta"><h2>${a.ventas.length}</h2><p>VENTAS</p></div>
      <div class="tarjeta"><h2>Bs ${MU.fmtBs(ticket)}</h2><p>TICKET PROMEDIO</p></div>
      ${margen !== null
        ? `<div class="tarjeta destacada"><h2>Bs ${MU.fmtBs(margen)}</h2><p>MARGEN BRUTO EST. (${margenPct}%)</p></div>`
        : `<div class="tarjeta"><h2>—</h2><p>MARGEN (FALTAN COSTOS)</p></div>`}
    </div>
    ${margen !== null
      ? `<p class="nota-pequena">Margen bruto estimado = ingresos por ventas − costo de la mercancía vendida (Bs ${MU.fmtBs(a.cogs)}). <b>No es la utilidad neta</b>: no incluye alquiler, sueldos, impuestos ni otros gastos del negocio.</p>`
      : `<p class="nota-pequena">Cargá el costo unitario de tus productos (en Productos o al registrar entradas) para calcular el margen bruto.</p>`}
  </div>`;

  /* ---- Top vendidos ---- */
  if (a.lista.length) {
    const top = a.lista.slice().sort((x, y) => y.uds - x.uds).slice(0, 10);
    const prev = MU.stats.periodoAnterior(p);
    const prevAg = prev ? MU.stats.agregar(prev.enPeriodo) : null;
    const prevMap = {};
    if (prevAg) prevAg.lista.forEach(x => { prevMap[x.id] = x; });
    html += `<div class="tarjeta-lista">
      <h3>🏆 Productos más vendidos (${MU.esc(p.etiqueta)})</h3>
      <div class="tabla-scroll"><table class="tabla-datos">
        <thead><tr><th>Producto</th><th>Uds. vendidas</th><th>Ingresos Bs</th><th>% ingresos</th><th>Vs. período anterior</th></tr></thead>
        <tbody>${top.map(x => {
          const pctIng = a.ingresos ? Math.round(x.ingresos / a.ingresos * 1000) / 10 : 0;
          const antes = prevMap[x.id];
          let comp = '<td class="sin-datos">—</td>';
          if (prevAg) {
            if (!antes) comp = '<td class="sube">Nuevo</td>';
            else if (antes.ingresos > 0) {
              const d = Math.round((x.ingresos - antes.ingresos) / antes.ingresos * 1000) / 10;
              comp = `<td class="${d > 0 ? 'sube' : d < 0 ? 'baja' : ''}">${d > 0 ? '+' : ''}${d}%</td>`;
            } else comp = '<td class="sin-datos">sin base</td>';
          }
          return `<tr><td>${MU.esc(x.producto)}</td><td>${x.uds}</td><td>${MU.fmtBs(x.ingresos)}</td><td>${pctIng}%</td>${comp}</tr>`;
        }).join('')}</tbody>
      </table></div>
      <p class="nota-pequena">Unidades vendidas, ingresos y participación son métricas distintas: un producto puede vender muchas unidades con pocos ingresos y viceversa.</p>
    </div>`;
  }

  /* ---- Ventas por día + día pico ---- */
  const porDia = {}, porSemana = [0, 0, 0, 0, 0, 0, 0];
  a.ventas.forEach(v => {
    const d = new Date(v.fecha);
    const clave = v.fecha.slice(0, 10);
    porDia[clave] = (porDia[clave] || 0) + v.total;
    porSemana[d.getDay()] += v.total;
  });
  const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const maxDia = Math.max(...porSemana, 0);
  const picoIdx = porSemana.indexOf(maxDia);
  if (maxDia > 0) {
    html += `<div class="tarjeta-lista">
      <h3>📅 Ventas por día de la semana</h3>
      ${porSemana.map((v, i) => `
        <div class="barra-fila">
          <div class="barra-etiqueta">${diasNombres[i]}</div>
          <div class="barra-pista"><div class="barra-valor ${i === picoIdx ? 'v-ok' : 'v-suave'}" style="width:${maxDia ? (v / maxDia) * 100 : 0}%"></div></div>
          <div class="barra-num">${MU.fmtBs(v)}</div>
        </div>`).join('')}
      <p class="nota-pequena">Día con más movimiento en este período: <b>${diasNombres[picoIdx]}</b> (Bs ${MU.fmtBs(maxDia)}). Es una observación sobre el período, no una predicción.</p>
    </div>`;
  }

  /* ---- Rotación ---- */
  const rotGlobalCosto = (a.cogs > 0 && inv.valor > 0 && p.dias) ? a.cogs / inv.valor : null;
  const invInicial = MU.stats.invInicialPeriodo(p, inv.valor);
  const invProm = (invInicial + inv.valor) / 2;
  const rotGlobalCostoProm = (a.cogs > 0 && invProm > 0 && p.dias) ? a.cogs / invProm : null;
  const rotUds = a.lista.length && p.dias
    ? a.lista.reduce((s, x) => s + x.uds, 0) / Math.max(1, activos.reduce((s, x) => s + x.cantidad, 0)) : null;

  const rotacionProd = a.lista.map(x => {
    const p2 = activos.find(z => z.id === x.id);
    const stock = p2 ? p2.cantidad : 0;
    const tasa = stock > 0 ? x.uds / stock : (x.uds > 0 ? Infinity : 0);
    let clase = 'sin-mov';
    if (x.uds === 0) clase = 'sin-mov';
    else if (tasa >= u.rotacionAlta) clase = 'alta';
    else if (tasa >= u.rotacionMedia) clase = 'media';
    else clase = 'baja';
    return Object.assign({}, x, { stock, tasa, clase });
  }).concat(activos.filter(p2 => !a.lista.some(x => x.id === p2.id))
    .map(p2 => ({ id: p2.id, producto: p2.nombre, uds: 0, ingresos: 0, stock: p2.cantidad, tasa: 0, clase: 'sin-mov' })))
    .sort((x, y) => (y.tasa === Infinity ? 1e9 : y.tasa) - (x.tasa === Infinity ? 1e9 : x.tasa));
  const etiquetaClase = { alta: ['estado-ok', 'Alta'], media: ['estado-info', 'Media'],
    baja: ['estado-atencion', 'Baja'], 'sin-mov': ['estado-critico', 'Sin movimientos'] };

  html += `<div class="tarjeta-lista">
    <h3>🔄 Rotación de inventario</h3>
    <ul class="lista-datos">
      ${rotGlobalCostoProm !== null
        ? `<li>Rotación del período (por costo) = costo de mercancía vendida Bs ${MU.fmtBs(a.cogs)} ÷ inventario promedio al costo Bs ${MU.fmtBs(invProm)} = <b>${Math.round(rotGlobalCostoProm * 100) / 100}</b>.
           <small>≈ vendiste el ${Math.round(rotGlobalCostoProm * 100)}% del inventario promedio durante el período.</small></li>`
        : `<li>Rotación por costo: requiere ventas con costo registrado e inventario valorado al costo. Cobertura actual: ${cobertura}%.</li>`}
      ${rotUds !== null ? `<li>Medida alternativa por unidades: ${a.lista.reduce((s, x) => s + x.uds, 0)} uds. vendidas ÷ ${Math.round(activos.reduce((s, x) => s + x.cantidad, 0) * 100) / 100} uds. en existencias = <b>${Math.round(rotUds * 100) / 100}</b> <small>(no usa costos: no la compares con la de arriba)</small>.</li>` : ''}
    </ul>
    <div class="tabla-scroll"><table class="tabla-datos">
      <thead><tr><th>Producto</th><th>Vendidas (período)</th><th>Stock actual</th><th>Tasa uds/stock</th><th>Rotación</th></tr></thead>
      <tbody>${rotacionProd.slice(0, 15).map(x => `
        <tr><td>${MU.esc(x.producto)}</td><td>${x.uds}</td><td>${x.stock}</td>
        <td>${x.tasa === Infinity ? 'agotado' : Math.round(x.tasa * 100) / 100}</td>
        <td><span class="chip-estado ${etiquetaClase[x.clase][0]}">${etiquetaClase[x.clase][1]}</span></td></tr>`).join('')}
      </tbody></table></div>
    <p class="nota-pequena">Tasa = unidades vendidas en el período ÷ stock actual. Umbrales: alta ≥ ${u.rotacionAlta}, media ≥ ${u.rotacionMedia}. No clasificamos por antigüedad de registro: un producto nuevo no es «de baja rotación» por existir poco tiempo.</p>
  </div>`;

  /* ---- Permanencia en almacén ---- */
  const movs = MU.movimientos();
  const permanencia = activos.map(p2 => {
    const ultVenta = movs.filter(m => m.productoId === p2.id && m.tipo === 'venta').pop();
    const ultEntrada = movs.filter(m => m.productoId === p2.id && (m.tipo === 'entrada' || m.tipo === 'devolucion')).pop();
    return {
      producto: p2.nombre, cantidad: p2.cantidad, costo: p2.costo,
      diasVenta: ultVenta ? MU.diasEntre(ultVenta.fecha) : null,
      diasIngreso: ultEntrada ? MU.diasEntre(ultEntrada.fecha) : null,
      inmovilizado: Math.round(p2.cantidad * p2.costo * 100) / 100
    };
  }).filter(x => x.cantidad > 0)
    .sort((x, y) => (y.diasVenta === null ? 1e9 : y.diasVenta) - (x.diasVenta === null ? 1e9 : x.diasVenta));
  const totalInmov = permanencia.reduce((s, x) => s + x.inmovilizado, 0);
  html += `<div class="tarjeta-lista">
    <h3>🧱 Permanencia en almacén</h3>
    <p class="nota-pequena">Capital inmovilizado estimado (solo productos con costo): <b>Bs ${MU.fmtBs(totalInmov)}</b>. La antigüedad de las unidades actuales se estima con el último ingreso registrado; si un producto no tiene entradas en el historial, no se inventa fecha.</p>
    <div class="tabla-scroll"><table class="tabla-datos">
      <thead><tr><th>Producto</th><th>Días desde la última venta</th><th>Días desde el último ingreso</th><th>Capital inmovilizado Bs</th></tr></thead>
      <tbody>${permanencia.slice(0, 15).map(x => `
        <tr><td>${MU.esc(x.producto)}</td>
        <td class="${x.diasVenta === null ? 'sin-datos' : x.diasVenta > u.sinMovimientoDias ? 'baja' : ''}">${x.diasVenta === null ? 'nunca vendido' : x.diasVenta}</td>
        <td class="${x.diasIngreso === null ? 'sin-datos' : ''}">${x.diasIngreso === null ? 'sin entradas registradas' : x.diasIngreso}</td>
        <td>${MU.fmtBs(x.inmovilizado)}</td></tr>`).join('')}
      </tbody></table></div>
  </div>`;

  /* ---- Patrones exploratorios ---- */
  const porVenta = {};
  a.ventas.forEach(v => {
    const ids = [...new Set(v.items.map(i => i.productoId))].sort();
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const clave = ids[i] + '|' + ids[j];
      porVenta[clave] = (porVenta[clave] || 0) + 1;
    }
  });
  const pares = Object.entries(porVenta).filter(([, n]) => n >= u.minCoocurrencia)
    .sort((x, y) => y[1] - x[1]).slice(0, 8);
  html += `<div class="tarjeta-lista">
    <h3>🔗 Patrones observados</h3>
    ${pares.length
      ? `<p>Productos que aparecen juntos en las mismas ventas (≥ ${u.minCoocurrencia} ventas conjuntas):</p>
         <ul class="lista-datos">${pares.map(([k, n]) => {
           const [a1, b1] = k.split('|');
           const n1 = (activos.find(x => x.id === a1) || {}).nombre || a1;
           const n2 = (activos.find(x => x.id === b1) || {}).nombre || b1;
           return `<li>${MU.esc(n1)} + ${MU.esc(n2)}: <b>${n} ventas</b> juntas</li>`;
         }).join('')}</ul>
         <p class="nota-pequena">Sobre ${a.ventas.length} venta(s) del período. Es co-ocurrencia observada en tus ventas registradas (no un modelo predictivo): úsala como pista para combinarlos en exhibiciones o promociones.</p>`
      : `<p class="vacio">Todavía no hay suficientes ventas con varios productos a la vez para detectar pares. Cargá ventas completas (varios productos por venta) para habilitar este análisis.</p>`}
  </div>`;

  /* ---- Umbrales configurables ---- */
  html += `<div class="tarjeta-lista">
    <h3>⚙️ Umbrales de las reglas de alerta</h3>
    <div class="doble-campo">
      <div class="campo"><label>Avisar vencimientos con menos de (días)</label><input type="number" id="u-vencimiento" min="1" value="${u.vencimientoDias}"></div>
      <div class="campo"><label>Avisar sin ventas desde (días)</label><input type="number" id="u-sinmov" min="1" value="${u.sinMovimientoDias}"></div>
    </div>
    <div class="doble-campo">
      <div class="campo"><label>Rotación alta ≥ (uds vendidas ÷ stock)</label><input type="number" id="u-alta" min="0" step="0.1" value="${u.rotacionAlta}"></div>
      <div class="campo"><label>Rotación media ≥ (uds vendidas ÷ stock)</label><input type="number" id="u-media" min="0" step="0.1" value="${u.rotacionMedia}"></div>
    </div>
    <button class="btn-secundario" onclick="MU.stats.guardarUmbrales()">💾 Guardar umbrales</button>
  </div>`;

  cont.innerHTML = html;
};

MU.stats.cambioPeriodo = function () {
  const custom = document.getElementById('sel-periodo').value === 'custom';
  document.getElementById('periodo-custom').classList.toggle('oculto', !custom);
  MU.stats.render();
};

MU.stats.guardarUmbrales = function () {
  MU.guardarUmbrales({
    vencimientoDias: Math.max(1, parseInt(document.getElementById('u-vencimiento').value, 10) || 7),
    sinMovimientoDias: Math.max(1, parseInt(document.getElementById('u-sinmov').value, 10) || 30),
    rotacionAlta: Math.max(0, parseFloat(document.getElementById('u-alta').value) || 1),
    rotacionMedia: Math.max(0, parseFloat(document.getElementById('u-media').value) || 0.3)
  });
  MU.toast('Umbrales guardados', 'ok');
  MU.stats.render();
};
