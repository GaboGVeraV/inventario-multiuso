# 🛒 Inventario Multiuso

Aplicación web estática con dos modalidades:

- **🏠 Hogar**: inventario de la despensa familiar con precios en **Bs (2 decimales)**
  y estadística de inflación oficial del **INE**.
- **🏪 Negocio**: inventario de un pequeño negocio con productos, **movimientos
  trazables** (entrada / salida / ajuste / merma / devolución), ventas y
  **estadísticas comerciales** calculadas con tus datos reales.

Funciona 100% offline en el navegador: los datos se guardan en el propio
dispositivo (localStorage). No requiere instalación, servidor ni conexión a
internet para usarla (el servidor local solo habilita la actualización de los
datos del INE).

## Cómo usar

**Opción A (simple):** abrí `index.html` con tu navegador (doble clic). No
necesita instalación ni servidor; funciona 100% offline con los últimos datos
del INE guardados en `js/ine_ipc.js`.

**Opción B (con datos en vivo del INE):** desde una terminal:

```bash
python3 iniciar.py
```

y abrí **http://localhost:8000**. Con esto además funciona el botón
**🔄 Actualizar datos INE** de la pestaña Precios (máximo una descarga por
hora por cortesía con los servidores del INE; el botón fuerza el refresco).
En el celular de la misma red entrás con `http://<IP-de-esta-pc>:8000`.

Para refrescar los datos sin servidor: `python3 scraper.py`
(`--forzar` para ignorar la caché, `--offline` para no tocar internet).

## Empezar

1. **Modo hogar**: la app arranca con la despensa de ejemplo; cargá tus
   productos reales (✏️ o ＋) con precio y, si querés, fecha de vencimiento.
2. **Modo negocio**: tocá **🏪 Personalizar mi negocio** (Inicio del modo
   hogar). Un asistente breve pide nombre del negocio, sector (A–E),
   subcategoría, moneda y método de registro; al guardarlo entrás al modo
   negocio. Tus datos del hogar quedan intactos.
3. En el modo negocio: **Productos** (catálogo genérico semiasistido o alta
   manual), **Movimientos** (ventas, entradas, ajustes e historial),
   **Estadísticas** y **Precios** (observaciones de mercado, sin IPC).
4. El botón **Modo hogar · cambiar** de la cabecera alterna entre modalidades
   en cualquier momento (con confirmación para no perder contexto).

## Funciones

### 🏠 Modalidad hogar

- **Inicio**: resumen general con estado (🟢 Saludable / 🟡 En atención / 🔴 Crítico).
- **🍚 Alimentos** y **🧹 Limpieza**: buscador, filtros por categoría, cards con
  emoji, stepper −/＋, edición y eliminación, y restablecer sección.
- **💲 Precios**:
  - Valorización del inventario en **bolivianos (Bs, 2 decimales)**.
  - **📉 Panel con datos oficiales del INE** (IPC base 2016=100): inflación
    mensual, acumulada y a 12 meses, con período y fecha de publicación reales.
  - **📈 Aplicar inflación a mis precios**: vista previa, elección de período,
    etiqueta de "estimado" y botón **↩️ Deshacer**.
  - **📈 Evolución de tus precios**: historial propio (cada precio cargado queda
    registrado) con gráfico y variación; es *tu* historia de precios, no el IPC.
  - **🧺 Tu canasta personal**: valor actual vs. valor a tus primeros precios
    registrados, producto por producto.
  - **🏷️ Precios de mercado (muestra observada)**: lo que observás en comercios,
    con fuente, ciudad y fecha. Nunca se presenta como inflación oficial.
- **📊 Informe**: estado consolidado, resumen financiero, últimos cambios de
  existencias y **descargar el PDF** (función de impresión del navegador).

### 🏪 Modalidad negicio

- **Inicio**: banner de estado, cajas (productos, unidades, alertas, ingresos
  30 días, inventario a costo) y **lista de alertas** derivadas de reglas fijas
  sobre tus datos (stock bajo, agotado, vencimientos, sin movimiento,
  ventas crecientes con stock reducido).
- **Productos**:
  - **Alta semiasistida**: buscás en un catálogo genérico (~60 productos con
    unidad, categoría y emoji sugeridos), la sugerencia precarga el formulario
    **editable**; nada se guarda hasta que confirmás y ningún dato tuyo se
    sobrescribe sin que lo elijas.
  - **Alta manual completa**: nombre, categoría, marca, SKU, código de barras,
    unidad y unidad base, stock inicial, stock mínimo, costo, precio de venta,
    proveedor, vencimiento, ubicación, descripción y estado.
  - Aviso de posibles duplicados (sugerencia, no bloqueo) y deduplicado exacto
    con confirmación.
  - **El stock solo cambia por movimientos**: la edición de un producto no
    expone el campo cantidad (quedó trazado como movimiento inicial).
  - Búsqueda por nombre, marca, SKU o código; filtros por categoría e inactivos.
- **Movimientos**:
  - **Venta** con carrito, precio unitario editable, validación de stock y
    guarda anti doble-envío; la venta descuenta stock y genera un movimiento
    por ítem enlazado a la venta.
  - **Entrada** (compra/reposición) con costo unitario opcional (actualiza el
    costo del producto) y proveedor.
  - **Ajuste / Merma / Devolución** con **motivo obligatorio**; nunca deja
    stock negativo.
  - **Historial** filtrable por tipo y período con el stock resultante de cada
    movimiento.
- **Estadísticas de mi negocio** (solo datos reales; sin datos de ejemplo):
  - Calidad de datos: ventas del período, cobertura de costos, inventario
    valorado.
  - Ventas: ingresos, ticket promedio, **margen bruto estimado** (con la
    advertencia explícita de que *no es la utilidad neta*) y comparación con el
    período anterior.
  - Top de productos más vendidos por unidades e ingresos con % de participación.
  - Ventas por día de la semana.
  - **Rotación** con fórmula explícita (costo de mercancía vendida ÷ inventario
    promedio) y medida alternativa por unidades; clasificación alta/media/baja
    por umbrales configurables, sin clasificar por antigüedad de registro.
  - **Permanencia en almacén**: días desde la última venta/ingreso y capital
    inmovilizado.
  - **Patrones observados**: pares de productos que aparecen juntos en las
    mismas ventas (co-ocurrencia observada, no un modelo predictivo; requiere
    ventas con varios productos).
  - Estados vacíos honestos cuando faltan datos.
- **Precios**: módulo de **observaciones de mercado** (alta manual o CSV), sin
  panel de inflación doméstica.

## Fuentes de datos (y sus límites)

| Fuente | Uso | Límites |
|---|---|---|
| **INE** (https://www.ine.gob.bo/index.php/graficos-ipc/) | Única fuente de **inflación oficial**. `scraper.py` descarga los xlsx oficiales y `iniciar.py` los sirve. | El INE publica índices y variaciones porcentuales, **no precios**: por eso los precios de tu inventario los cargás vos y el ajuste por inflación se etiqueta siempre como *estimado con variación oficial*. |
| **Tus registros y tu historial** | Evolución de tus precios y tu canasta personal. | Es tu propia historia; no representa al mercado. |
| **Observaciones de mercado (muestra)** | Precios que observás en comercios, con fuente, ciudad y fecha; comparables por unidad base (kg/l/un) tras homologar la presentación con un factor. | Muestra parcial y no representativa; nunca se presenta como IPC ni como inflación oficial. Se avisa si una observación tiene más de 30 días. |

**Sobre precios de supermercados (Hipermaxi y otros): no existe una API pública
autorizada**; sus páginas bloquean el acceso automatizado (CAPTCHA) y reutilizar
sus datos sin permiso puede violar sus términos. Por eso esta app **no simula
conexiones ni inventa precios**: la vía habilitada es el alta manual de lo que
observés o la importación por CSV (columnas: producto, fuente, ciudad, fecha,
precio, unidad, factor, unidadBase, marca, tipo). Si algún día existe una API
pública, sería un módulo nuevo y opt-in.

## Diseño y multipantalla

Identidad minimalista **verde salvia** (`#A3C0B0` con verde oscuro `#3F5A4C`
para estructura): fondos claros, tarjetas blancas con borde fino, sin degradados
pesados. Los estados siempre combinan color con texto o icono (nunca solo color).

Verificada en navegador real (Firefox) en **320×568, 390×844, 768×1024,
1366×768 y 1920×1080**, en modo hogar y modo negocio:

- Sin desbordes horizontales en ninguna resolución.
- Inputs a 16 px en pantallas chicas (evita el zoom de iOS) y botones táctiles
  de 42 px; `safe-area` para muescas y `dvh` para modales.
- Modo oscuro forzado de Android desactivado (`color-scheme: light`).
- Tablet y escritorio: productos en grilla automática de 1/2/3 columnas; las
  tablas amplias usan scroll interno.

## Estructura

```
inventario-app/
├── index.html          # estructura (modalidad hogar + modalidad negocio)
├── iniciar.py          # servidor local + API /api/ine-ipc
├── scraper.py          # descarga y parsea las tablas oficiales del INE
├── INFORME.md          # informe de implementación y pruebas
├── datos/
│   ├── ine_ipc.json    # últimos datos del INE (caché del scraper)
│   └── _cache/         # xlsx descargados (reutilizados 24 h)
├── css/
│   └── estilos.css     # estilos (identidad salvia + impresión)
└── js/
    ├── ine_ipc.js      # window.INE_IPC (generado por scraper.py)
    ├── datos.js        # catálogo inicial doméstico y mapeo → INE
    ├── nucleo.js       # núcleo MU: almacenamiento, modo, utilidades
    ├── catalogo.js     # sectores A–E y catálogo genérico de productos
    ├── negocio.js      # modo negocio: asistente, productos, movimientos, ventas
    ├── estadisticas.js # estadísticas comerciales y umbrales
    ├── mercado.js      # precios observados, CSV y evolución doméstica
    └── app.js          # lógica doméstica (stock, precios, INE, PDF)
```

## Datos y almacenamiento

- **Modalidad hogar**: `inventarioAlimentos` e `inventarioLimpieza` en
  localStorage. La app detecta y adopta datos de versiones anteriores
  (`inventarioCanasta`), así no se pierde el stock ya cargado. Además se
  guardan `mu_hist_precios` (evolución de tus precios) y `mu_hist_stock`
  (últimos cambios de existencias).
- **Modalidad negocio**: `mu_config` (modalidad activa), `mu_negocio`
  (asistente), `mu_productos`, `mu_movimientos`, `mu_ventas`,
  `mu_precios_observados` y `mu_umbrales`.
- **Un solo dispositivo, sin sincronización**: los datos viven solo en el
  navegador donde los cargaste. No hay cuentas ni nube; si limpiás los datos
  del navegador o usás otro dispositivo, no los vas a encontrar. Exportá el CSV
  de precios observados y hacé copias si te importan los datos.
- **Límites de localStorage**: cada origen guarda ~5 MB (hasta ~10 MB en
  algunos navegadores). Es suficiente para inventarios familiares y pequeños
  negocios (miles de productos y decenas de miles de movimientos), pero si se
  llena, la app avisa y conviene exportar/archivar. Por eso los históricos se
  recortan a un tope razonable (2000 precios, 800 cambios de stock).
- **Una sola persona a la vez**: la app está pensada para uso individual en un
  dispositivo; no maneja usuarios, permisos ni concurrencia.

## Pruebas

- `verificar.py` (auditoría estática): estructura, paleta, IDs, integración
  entre módulos, reglas de negocio escritas en código y documentación.
- `navegador.py` (suite E2E con Firefox real vía Marionette): recorre ambas
  modalidades, trazabilidad de movimientos, estadísticas, precios de mercado,
  separación de modalidades, persistencia tras recarga, seguridad XSS y las
  5 resoluciones. Detalle en `INFORME.md`.
