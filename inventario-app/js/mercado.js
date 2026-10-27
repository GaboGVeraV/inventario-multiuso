/* ============================================================
   Inventario Multiuso — Precios de mercado (muestra observada)
   y evolución doméstica de precios.
   - La INFLACIÓN OFICIAL solo viene del INE (js/ine_ipc.js).
   - Los precios de comercios son una MUESTRA observada/manual,
     con fuente, ciudad y fecha; nunca se presentan como IPC.
   - Sin APIs públicas autorizadas en Bolivia: el alta es manual
     o por CSV; ver README (sección Fuentes).
   ============================================================ */

MU.mercado = {};

MU.observaciones = function () { return MU.leer(MU.CLAVES.observaciones, []) || []; };
MU.guardarObservaciones = function (a) { return MU.guardar(MU.CLAVES.observaciones, a); };

MU.normObservacion = function (o) {
  return {
    id: o.id || MU.uid(),
    producto: String(o.producto || '').trim(),
    fuente: String(o.fuente || 'Sin especificar').trim(),
    ciudad: String(o.ciudad || 'Sin especificar').trim(),
    fecha: o.fecha || MU.fechaHoy(),              // fecha de observación del precio
    precio: Math.max(0, Math.round(MU.num(o.precio, 0) * 100) / 100),
    unidad: String(o.unidad || 'un').trim(),
    factor: Math.max(0.0001, MU.num(o.factor, 1)), // cuántas unidades base trae la presentación
    unidadBase: ['kg', 'l', 'un'].indexOf(o.unidadBase) >= 0 ? o.unidadBase : 'un',
    marca: String(o.marca || '').trim(),
    tipo: o.tipo === 'publicado' ? 'publicado' : 'observado',  // publicado en catálogo vs visto en el local
    fechaRegistro: o.fechaRegistro || MU.ahoraISO()
  };
};

/* Precio homologado a la unidad base (por unidad base). */
MU.precioPorBase = function (o) { return o.precio / o.factor; };

MU.mercado.agrupar = function () {
  const grupos = {};
  MU.observaciones().forEach(o => {
    const clave = MU.normTexto(o.producto) + '|' + o.unidadBase;
    if (!grupos[clave]) grupos[clave] = { producto: o.producto, unidadBase: o.unidadBase, obs: [] };
    grupos[clave].obs.push(o);
  });
  return Object.values(grupos).map(g => {
    const bases = g.obs.map(MU.precioPorBase);
    const n = bases.length;
    const suma = bases.reduce((s, x) => s + x, 0);
    const fechas = g.obs.map(o => o.fecha).sort();
    return {
      clave: MU.normTexto(g.producto) + '|' + g.unidadBase,
      producto: g.producto, unidadBase: g.unidadBase,
      n: n,
      min: Math.round(Math.min(...bases) * 100) / 100,
      prom: Math.round(suma / n * 100) / 100,
      max: Math.round(Math.max(...bases) * 100) / 100,
      ultimaFecha: fechas[fechas.length - 1],
      fuentes: [...new Set(g.obs.map(o => o.fuente))],
      ciudades: [...new Set(g.obs.map(o => o.ciudad))],
      obs: g.obs.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)),
      rangoPct: suma > 0 ? Math.round((Math.max(...bases) - Math.min(...bases)) / (suma / n) * 100) : 0
    };
  }).sort((a, b) => b.n - a.n);
};

/* ---------- Render del módulo ---------- */

MU.mercado.render = function (cont) {
  const d = (typeof window !== 'undefined' && window.INE_IPC && !window.INE_IPC.error) ? window.INE_IPC : null;
  const grupos = MU.mercado.agrupar();
  const hoy = MU.fechaHoy();

  let html = `
  <div class="tarjeta-lista">
    <h3>🏷️ Precios de mercado (muestra observada)</h3>
    <p class="nota-pequena">Estos precios los cargás vos (o los importás por CSV) a partir de lo que observás en comercios o catálogos. Son una <b>muestra</b>: no representan todos los precios de Bolivia y <b>no son el IPC oficial</b>.</p>
    <ul class="lista-datos">
      <li>📈 Inflación oficial: <b>${d ? 'disponible del INE (periodo ' + MU.esc(d.ultimo_periodo || '—') + ')' : 'abrí el módulo de Precios del hogar con el servidor para cargar el IPC del INE'}</b>.</li>
      <li>👁️ Precios observados cargados: <b>${MU.observaciones().length}</b> en ${grupos.length} producto(s)/unidad(es).</li>
      <li>🧪 Los precios se comparan solo dentro de cada producto y unidad base (kg, litro o unidad); se homologa por presentación con el factor indicado.</li>
    </ul>
    <details class="detalle-form">
      <summary>➕ Registrar un precio observado</summary>
      <div class="campo"><label>Producto</label><input type="text" id="mo-producto" placeholder="Ej: Arroz"></div>
      <div class="doble-campo">
        <div class="campo"><label>Comercio / fuente</label><input type="text" id="mo-fuente" placeholder="Ej: Hipermaxi Sopocachi"></div>
        <div class="campo"><label>Ciudad</label><input type="text" id="mo-ciudad" placeholder="Ej: La Paz"></div>
      </div>
      <div class="doble-campo">
        <div class="campo"><label>Precio Bs</label><input type="number" id="mo-precio" min="0" step="0.01"></div>
        <div class="campo"><label>Fecha de observación</label><input type="date" id="mo-fecha" value="${hoy}"></div>
      </div>
      <div class="doble-campo">
        <div class="campo"><label>Presentación (unidad)</label><input type="text" id="mo-unidad" placeholder="Ej: paquete 1 kg"></div>
        <div class="campo"><label>Unidad base</label>
          <select id="mo-base"><option value="kg">Kilogramo</option><option value="l">Litro</option><option value="un" selected>Unidad</option></select>
        </div>
      </div>
      <div class="doble-campo">
        <div class="campo"><label>Factor a la unidad base (presentación ÷ base)</label><input type="number" id="mo-factor" min="0.001" step="0.001" value="1"></div>
        <div class="campo"><label>Tipo de dato</label>
          <select id="mo-tipo"><option value="observado" selected>Precio observado en el local</option><option value="publicado">Precio publicado en catálogo/página</option></select>
        </div>
      </div>
      <div class="campo"><label>Marca / presentación (opcional)</label><input type="text" id="mo-marca" placeholder="Ej: Marca X, 500 g"></div>
      <button class="btn-primario ancho" onclick="MU.mercado.altaManual()">💾 Guardar observación</button>
    </details>
    <details class="detalle-form">
      <summary>📄 Importar / exportar CSV</summary>
      <p class="nota-pequena">Columnas: producto, fuente, ciudad, fecha (aaaa-mm-dd), precio, unidad, factor, unidadBase (kg|l|un), marca, tipo (publicado|observado). Una fila por observación; sin comas dentro de los campos.</p>
      <textarea id="mo-csv" rows="4" placeholder="Arroz,Hipermaxi Sopocachi,La Paz,2026-10-01,8.50,paquete 1 kg,1,kg,Marca X,publicado"></textarea>
      <div class="acciones-rapidas">
        <button class="btn-secundario" onclick="MU.mercado.importarCSV()">📥 Importar filas</button>
        <button class="btn-secundario" onclick="MU.mercado.exportarCSV()">📤 Exportar CSV</button>
      </div>
    </details>
  </div>`;

  html += grupos.length
    ? `<div class="tarjeta-lista">
        <h3>📊 Comparación por producto (por unidad base)</h3>
        <div class="tabla-scroll"><table class="tabla-datos">
          <thead><tr><th>Producto</th><th>n</th><th>Más bajo</th><th>Promedio</th><th>Más alto</th><th>Rango</th><th>Última obs.</th></tr></thead>
          <tbody>${grupos.map(g => {
            const vieja = MU.diasEntre(g.ultimaFecha + 'T12:00:00') > 30;
            return `<tr>
              <td>${MU.esc(g.producto)} <small>(${g.unidadBase})</small>${vieja ? ' <span class="chip-estado estado-atencion">desactualizado</span>' : ''}</td>
              <td>${g.n}</td>
              <td>Bs ${MU.fmtBs(g.min)}</td>
              <td><b>Bs ${MU.fmtBs(g.prom)}</b></td>
              <td>Bs ${MU.fmtBs(g.max)}</td>
              <td>${g.rangoPct}%</td>
              <td>${MU.fmtFecha(g.ultimaFecha)}</td>
            </tr>`;
          }).join('')}</tbody></table></div>
        <p class="nota-pequena">«Rango» = diferencia entre el precio más alto y más bajo respecto al promedio: un rango alto puede deberse a marcas o presentaciones distintas, revisá el detalle.</p>
        ${grupos.map(g => `
          <details class="detalle-form">
            <summary>🔍 Detalle: ${MU.esc(g.producto)} (${g.n} observaciones)</summary>
            <div class="tabla-scroll"><table class="tabla-datos">
              <thead><tr><th>Fecha</th><th>Comercio</th><th>Ciudad</th><th>Precio</th><th>Presentación</th><th>Tipo</th></tr></thead>
              <tbody>${g.obs.map(o => `<tr>
                <td>${MU.fmtFecha(o.fecha)}</td><td>${MU.esc(o.fuente)}</td><td>${MU.esc(o.ciudad)}</td>
                <td>Bs ${MU.fmtBs(o.precio)} <small>(Bs ${MU.fmtBs(MU.precioPorBase(o))}/${g.unidadBase})</small></td>
                <td>${MU.esc(o.unidad)}${o.marca ? ' · ' + MU.esc(o.marca) : ''}</td>
                <td>${o.tipo === 'publicado' ? 'Publicado' : 'Observado'}</td></tr>`).join('')}
              </tbody></table></div>
          </details>`).join('')}
      </div>`
    : `<div class="tarjeta-lista"><p class="vacio">👁️ Sin precios observados todavía. Registrá el precio que veas en un comercio (con su fuente y fecha) o importá un CSV para empezar a comparar.</p></div>`;

  cont.innerHTML = html;
};

MU.mercado.altaManual = function () {
  const g = (id) => document.getElementById(id).value;
  const producto = g('mo-producto').trim();
  const precio = parseFloat(g('mo-precio'));
  if (!producto) { alert('Escribí el producto'); return; }
  if (isNaN(precio) || precio <= 0) { alert('Ingresá un precio válido'); return; }
  const lista = MU.observaciones();
  lista.push(MU.normObservacion({
    producto: producto,
    fuente: g('mo-fuente').trim() || 'Sin especificar',
    ciudad: g('mo-ciudad').trim() || 'Sin especificar',
    fecha: g('mo-fecha') || MU.fechaHoy(),
    precio: precio,
    unidad: g('mo-unidad').trim() || g('mo-base'),
    factor: parseFloat(g('mo-factor')) || 1,
    unidadBase: g('mo-base'),
    marca: g('mo-marca').trim(),
    tipo: g('mo-tipo')
  }));
  MU.guardarObservaciones(lista);
  ['mo-producto', 'mo-fuente', 'mo-ciudad', 'mo-precio', 'mo-unidad', 'mo-marca'].forEach(id => { document.getElementById(id).value = ''; });
  MU.toast('Precio observado registrado', 'ok');
  const cont = document.getElementById('bloq-mercado');
  MU.mercado.render(MU.config().modo === 'negocio' ? document.getElementById('mercado-neg') : cont);
};

MU.mercado.importarCSV = function () {
  const texto = document.getElementById('mo-csv').value.trim();
  if (!texto) { alert('Pegá las filas CSV primero'); return; }
  const filas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  const lista = MU.observaciones();
  let ok = 0, mal = 0;
  filas.forEach((fila, i) => {
    const c = fila.split(',').map(x => x.trim());
    if (i === 0 && MU.normTexto(c[0]) === 'producto') return;   // encabezado
    if (c.length < 5 || isNaN(parseFloat(c[4]))) { mal++; return; }
    lista.push(MU.normObservacion({
      producto: c[0], fuente: c[1] || 'CSV', ciudad: c[2] || 'Sin especificar',
      fecha: c[3] || MU.fechaHoy(), precio: parseFloat(c[4]),
      unidad: c[5] || 'un', factor: parseFloat(c[6]) || 1,
      unidadBase: c[7] || 'un', marca: c[8] || '', tipo: c[9] === 'publicado' ? 'publicado' : 'observado'
    }));
    ok++;
  });
  MU.guardarObservaciones(lista);
  document.getElementById('mo-csv').value = '';
  MU.toast(`Importadas ${ok} observaciones${mal ? ` (${mal} filas inválidas)` : ''}`, ok ? 'ok' : 'alerta');
  const cont = document.getElementById('bloq-mercado');
  MU.mercado.render(MU.config().modo === 'negocio' ? document.getElementById('mercado-neg') : cont);
};

MU.mercado.exportarCSV = function () {
  const filas = ['producto,fuente,ciudad,fecha,precio,unidad,factor,unidadBase,marca,tipo'];
  MU.observaciones().forEach(o => {
    filas.push([o.producto, o.fuente, o.ciudad, o.fecha, o.precio, o.unidad,
      o.factor, o.unidadBase, o.marca, o.tipo].join(','));
  });
  const blob = new Blob([filas.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'precios-observados-' + MU.fechaHoy() + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ============================================================
   Extras del módulo doméstico de Precios:
   evolución de MIS precios y canasta personal.
   ============================================================ */

MU.preciosHogar = function () {
  MU.renderHistorialPrecios();
  MU.renderCanastaPersonal();
  const cont = document.getElementById('bloq-mercado');
  if (cont) MU.mercado.render(cont);
};

/* Evolución de los precios que registró el usuario (histórico propio). */
MU.renderHistorialPrecios = function () {
  const cont = document.getElementById('bloq-historial');
  if (!cont) return;
  const hist = MU.leer(MU.CLAVES.histPrecios, []) || [];
  const porProducto = {};
  hist.forEach(h => {
    const k = h.sec + '|' + h.nombre;
    if (!porProducto[k]) porProducto[k] = { sec: h.sec, nombre: h.nombre, registros: [] };
    porProducto[k].registros.push(h);
  });
  const multi = Object.values(porProducto).filter(x => x.registros.length >= 2);
  if (!multi.length) {
    cont.innerHTML = `<h3>📈 Evolución de tus precios</h3>
      <p class="vacio">Todavía no hay evolución registrada: cargá o modificá precios de tus productos y acá se va a guardar su historia (esto es <b>tus</b> precios, no el IPC oficial).</p>`;
    return;
  }
  multi.sort((a, b) => b.registros.length - a.registros.length);
  const sel = document.getElementById('hp-producto');
  const elegido = (sel && sel.value) || (multi[0].sec + '|' + multi[0].nombre);
  const actual = multi.find(x => x.sec + '|' + x.nombre === elegido) || multi[0];
  const regs = actual.registros;
  const primero = regs[0].precio, ultimo = regs[regs.length - 1].precio;
  const varPct = primero > 0 ? Math.round((ultimo - primero) / primero * 1000) / 10 : null;
  const min = Math.min(...regs.map(r => r.precio));
  const max = Math.max(...regs.map(r => r.precio));
  const ancho = 260, alto = 64;
  const pts = regs.map((r, i) => {
    const x = regs.length > 1 ? (i / (regs.length - 1)) * ancho : ancho / 2;
    const y = max > min ? alto - ((r.precio - min) / (max - min)) * (alto - 8) - 4 : alto / 2;
    return `${Math.round(x)},${Math.round(y)}`;
  }).join(' ');
  cont.innerHTML = `<h3>📈 Evolución de tus precios (registrado por vos)</h3>
    <div class="campo"><label>Producto</label>
      <select id="hp-producto" onchange="MU.renderHistorialPrecios()">
        ${multi.map(x => `<option value="${MU.esc(x.sec + '|' + x.nombre)}" ${x === actual ? 'selected' : ''}>${MU.esc(x.nombre)}</option>`).join('')}
      </select>
    </div>
    <div class="fila-grafico">
      <svg viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-label="Evolución del precio de ${MU.esc(actual.nombre)}">
        <polyline fill="none" stroke="var(--verde-osc)" stroke-width="2" points="${pts}"></polyline>
      </svg>
      <div>
        <p>Bs ${MU.fmtBs(primero)} → <b>Bs ${MU.fmtBs(ultimo)}</b> (${regs.length} cambios)</p>
        <p class="${varPct > 0 ? 'sube' : varPct < 0 ? 'baja' : ''}">Variación propia: ${varPct === null ? '—' : (varPct > 0 ? '+' : '') + varPct + '%'}</p>
        <p class="nota-pequena">Rango registrado: Bs ${MU.fmtBs(min)} – Bs ${MU.fmtBs(max)}</p>
      </div>
    </div>
    <details class="detalle-form"><summary>📜 Ver todos los cambios</summary>
      <div class="tabla-scroll"><table class="tabla-datos">
        <thead><tr><th>Fecha</th><th>Precio Bs</th></tr></thead>
        <tbody>${regs.slice().reverse().map(r => `<tr><td>${MU.fmtFecha(r.fecha)}</td><td>${MU.fmtBs(r.precio)}</td></tr>`).join('')}</tbody>
      </table></div>
    </details>
    <p class="nota-pequena">Historial propio: cada vez que cargás un precio nuevo queda registrado acá. La «inflación oficial» del INE se muestra arriba, separada.</p>`;
};

/* Canasta personal: valor actual vs valor a tus precios de compra. */
MU.renderCanastaPersonal = function () {
  const cont = document.getElementById('bloq-canasta');
  if (!cont) return;
  const hist = MU.leer(MU.CLAVES.histPrecios, []) || [];
  const primeroDe = (sec, nombre) => {
    const h = hist.find(x => x.sec === sec && x.nombre === nombre);
    return h ? h.precio : null;
  };
  let actual = 0, aCompra = 0, n = 0, comparables = 0;
  const filas = [];
  Object.keys(SECCIONES).forEach(sec => {
    datos[sec].forEach(p => {
      if (p.precio > 0 && p.stock > 0) {
        actual += p.precio * p.stock;
        const pc = primeroDe(sec, p.nombre);
        if (pc !== null) { aCompra += pc * p.stock; comparables++; }
        n++;
        if (pc !== null && pc !== p.precio) {
          filas.push({ nombre: p.nombre, sec, pc, actual: p.precio,
            pct: pc > 0 ? Math.round((p.precio - pc) / pc * 1000) / 10 : 0 });
        }
      }
    });
  });
  actual = Math.round(actual * 100) / 100;
  aCompra = Math.round(aCompra * 100) / 100;
  if (!comparables) {
    cont.innerHTML = `<h3>🧺 Tu canasta personal</h3>
      <p class="vacio">Cargá precios y modificá algún producto para poder comparar el valor actual de tu canasta con tus precios de compra registrados.</p>`;
    return;
  }
  const dif = Math.round((actual - aCompra) * 100) / 100;
  const difPct = aCompra > 0 ? Math.round(dif / aCompra * 1000) / 10 : null;
  filas.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  cont.innerHTML = `<h3>🧺 Tu canasta personal (tus precios, no el IPC)</h3>
    <ul class="lista-datos">
      <li>Valor actual de tu canasta (con tus precios cargados): <b>Bs ${MU.fmtBs(actual)}</b> sobre ${n} producto(s) con precio.</li>
      <li>Valor a tus primeros precios registrados (comparable): <b>Bs ${MU.fmtBs(aCompra)}</b> en ${comparables} producto(s).</li>
      <li>Diferencia: <b class="${dif > 0 ? 'sube' : dif < 0 ? 'baja' : ''}">${dif > 0 ? '+' : ''}Bs ${MU.fmtBs(dif)}${difPct !== null ? ` (${difPct > 0 ? '+' : ''}${difPct}%)` : ''}</b></li>
    </ul>
    ${filas.length ? `<div class="tabla-scroll"><table class="tabla-datos">
      <thead><tr><th>Producto</th><th>Precio de compra Bs</th><th>Precio actual Bs</th><th>Cambio</th></tr></thead>
      <tbody>${filas.slice(0, 10).map(f => `<tr>
        <td>${MU.esc(f.nombre)}</td><td>${MU.fmtBs(f.pc)}</td><td>${MU.fmtBs(f.actual)}</td>
        <td class="${f.pct > 0 ? 'sube' : f.pct < 0 ? 'baja' : ''}">${f.pct > 0 ? '+' : ''}${f.pct}%</td></tr>`).join('')}
      </tbody></table></div>` : ''}
    <p class="nota-pequena">Evolutivo de tu propia despensa: no confundir con la inflación oficial del INE (arriba) ni con precios de mercado (más abajo).</p>`;
};

/* Histórico de existencias domésticas (Informe). */
MU.renderHistStock = function () {
  const cont = document.getElementById('bloq-hist-stock');
  if (!cont) return;
  const h = (MU.leer(MU.CLAVES.histStock, []) || []).slice().reverse().slice(0, 20);
  cont.innerHTML = `<h3>📦 Últimos cambios de existencias</h3>` +
    (h.length
      ? `<div class="tabla-scroll"><table class="tabla-datos">
          <thead><tr><th>Fecha</th><th>Producto</th><th>Cambio</th><th>Quedó en</th></tr></thead>
          <tbody>${h.map(x => `<tr>
            <td>${MU.fmtFechaHora(x.fecha)}</td><td>${MU.esc(x.nombre)}</td>
            <td class="${x.delta < 0 ? 'baja' : 'sube'}">${x.delta > 0 ? '+' : ''}${x.delta}</td>
            <td>${x.stock}</td></tr>`).join('')}
          </tbody></table></div>`
      : `<p class="vacio">Todavía no se registraron cambios de existencias: usá los botones − / ＋ de los productos.</p>`);
};
