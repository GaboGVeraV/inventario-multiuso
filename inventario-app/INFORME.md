# INFORME — Inventario Multiuso

Informe de implementación de la plataforma dual (hogar + negocio) construida
sobre la aplicación de inventario doméstico existente, sin reescribirla.

Fecha: octubre 2026 · Versión de datos: 2 (`mu_config.version = 2`)

---

## 1. Características implementadas

### Plataforma (núcleo)

- Espacio de nombres `MU` con capa de almacenamiento versionada sobre
  localStorage (lectura tolerante a datos corruptos, aviso ante cuota llena),
  configuración de modalidad (`hogar` / `negocio`), utilidades compartidas
  (uid, fechas, formato Bs 2 decimales, normalización de texto, toast accesible
  con `role="status"`) e interruptor de modalidad en la cabecera.
- La app arranca en la última modalidad usada y alterna sin perder datos.

### 🏠 Modalidad hogar (todo lo preexistente conservado)

- Inicio, Alimentos, Limpieza, Precios e Informe: mismo flujo, mismas claves
  de localStorage (`inventarioAlimentos`, `inventarioLimpieza`) y migración de
  `inventarioCanasta` intactos.
- **Novedades**: campo de **fecha de vencimiento** opcional por producto (con
  alerta en la tarjeta, en el banner y en el Informe), **historial de precios
  propio** (`mu_hist_precios`, recortado a 2000 registros), **historial de
  existencias** (`mu_hist_stock`, mostrado en el Informe) y **canasta personal**
  (valor actual vs. valor a tus primeros precios registrados).
- Inflación **solo del INE**: panel oficial, aplicación con vista previa y
  deshacer; la aplicación queda registrada en el historial propio.

### 🏪 Modalidad negocio

- **Asistente «Personalizar mi negocio»**: nombre, sector económico A–E
  (comercio, alimentos, limpieza, manufactura, otros) con subcategorías,
  descripción de la actividad, moneda y método de registro (enteros/decimales).
- **Productos**: alta **semiasistida** sobre un catálogo genérico de ~60
  productos (nombre, unidad, unidad base, categoría y emoji sugeridos;
  100% editable, sin sobrescribir sin confirmación) o **alta manual completa**
  (nombre, categoría, marca, SKU, código de barras, unidad y unidad base,
  stock inicial, stock mínimo, costo, precio de venta, proveedor, vencimiento,
  ubicación, descripción, estado). Aviso de posibles duplicados (no bloqueante)
  y deduplicado exacto con confirmación. El stock **no** es editable en la
  ficha: solo cambia vía movimientos.
- **Movimientos trazables**: venta (con carrito, validación de stock y guarda
  anti doble-envío), entrada (actualiza costo/proveedor), ajuste (+/−),
  merma y devolución — los tres últimos exigen motivo. Cada movimiento guarda
  producto, cantidad, delta, fecha, motivo y **stock resultante**; la venta
  genera un movimiento por ítem enlazado con `ventaId`. Nunca queda stock
  negativo.
- **Estadísticas de mi negocio**: calidad de datos (cobertura de costos),
  ingresos/ticket/margen bruto estimado con la advertencia «no es la utilidad
  neta», top vendidos por unidades e ingresos con comparación contra el
  período anterior, ventas por día de la semana, **rotación** con fórmula
  explícita (costo de mercancía vendida ÷ inventario promedio al costo) y
  medida alternativa por unidades, **permanencia** (días desde la última
  venta/ingreso y capital inmovilizado), **patrones de co-ocurrencia** (pares
  que aparecen juntos en las mismas ventas, con umbral configurable) y
  **umbrales configurables** de las alertas. Sin datos reales se muestra un
  estado inicial con instrucciones; nunca datos de ejemplo.
- **Alertas** deterministas etiquetadas como «reglas fijas configuradas»
  (jamás «IA»): agotado, stock bajo, por vencer/vencido, sin movimiento,
  inventario estancado y «ventas subiendo con stock reducido».
- **Precios**: módulo de observaciones de mercado (alta manual o CSV,
  homologación por factor a unidad base kg/l/un, comparación min/promedio/max
  y aviso de observaciones con más de 30 días). **Sin panel de inflación
  doméstica**: la pestaña Precios del negocio no muestra el IPC del INE
  como herramienta de venta.

### Fuentes y honestidad de datos

- Inflación oficial **solo del INE** (scraper de sus xlsx oficiales +
  API local `/api/ine/ipc`); nunca se simulan conexiones.
- Precios de supermercados: **sin API pública autorizada** (CAPTCHA/bloqueo),
  documentado en el README; la vía implementada es alta manual con fuente,
  ciudad y fecha, o importación CSV. Las observaciones nunca se presentan
  como IPC ni como inflación.
- Evolución de precios y canasta personal se etiquetan siempre como datos
  propios del usuario, separados del IPC y del mercado.

### Diseño

- Paleta **verde salvia** (`#A3C0B0` + verde oscuro `#3F5A4C`), minimalista,
  con estados que combinan color + texto/icono (nunca color solo).
- Responsivo en 320×568, 390×844, 768×1024, 1366×768 y 1920×1080; grilla
  automática en tablet/escritorio, tablas con scroll interno, safe-area,
  objetivos táctiles de 42 px e impresión/PDF del Informe.

## 2. Modelo de datos (localStorage)

| Clave | Contenido |
|---|---|
| `inventarioAlimentos`, `inventarioLimpieza` | Inventario doméstico (sin cambios de esquema; se añadieron `vencimiento` opcional y `precioFecha`). |
| `inventarioCanasta` | Legado; se migra y descarta. |
| `mu_config` | `{version:2, modo:'hogar'\|'negocio'}`. |
| `mu_negocio` | Nombre, sector/subcategoría, moneda, método de registro, preferencias. |
| `mu_productos` | Ficha completa del producto del negocio; `cantidad` es el stock vigente (caché del resultado de movimientos). |
| `mu_movimientos` | Log único de verdad: venta/entrada/ajuste/merma/devolución con `delta`, `stockDespues`, `ventaId` (ventas) y motivo. |
| `mu_ventas` | Ventas con ítems (cantidad, precio y costo unitarios) y total. |
| `mu_precios_observados` | Observaciones con fuente, ciudad, fecha de observación, presentación, factor y unidad base. |
| `mu_hist_precios`, `mu_hist_stock` | Históricos domésticos (recortados a 2000/800 registros). |
| `mu_umbrales` | Umbrales configurables de las reglas de alerta. |

## 3. Pruebas ejecutadas (resultados reales)

### 3.1 Auditoría estática — `verificar.py`: **121/121 OK**

Estructura de archivos, orden de carga de scripts, ~150 IDs (domésticos
preservados + nuevos), handlers del HTML contra funciones reales, paleta
verde salvia (y ausencia de la paleta vieja), balance sintáctico de los
8 módulos JS, claves de almacenamiento, ganchos domésticos (historial,
vencimiento, inicio de plataforma), reglas del negocio escritas en código
(stock solo por movimientos, guarda antiflazo, motivo obligatorio),
criterios estadísticos explícitos, honestidad del módulo de precios,
**escape de nombres en sugerencias/banner/informe**, seguridad,
scraper/servidor y documentación.

### 3.2 Suite E2E con Firefox real — `navegador.py`: **115/115 OK**

Cliente Marionette nativo (protocolo v3, sin dependencias) contra Firefox 155:

- **Carga y modo hogar** (9): arranque en modo hogar, espacios de nombres,
  INE cargado vía servidor.
- **Regresión doméstica** (20): secciones, stepper, persistencia, alta con
  vencimiento, duplicado que suma stock, XSS neutralizado, panel INE,
  inflación aplicar/deshacer sobre producto con mapeo INE (Bs 10 → 10.37),
  evolución de precios, canasta personal, precios observados, informe con
  histórico de existencias.
- **Asistente** (9): sectores, subcategorías, activación del modo negocio,
  persistencia de `mu_config`, estado inicial honesto de estadísticas.
- **Productos** (13): catálogo semiasistido (búsqueda, precarga, edición),
  alta con stock inicial trazado, aviso de duplicados, edición sin campo de
  stock, alta manual, desactivar/reactivar.
- **Movimientos** (14): venta con carrito y total, descuento de stock,
  movimiento enlazado por `ventaId`, rechazo de stock insuficiente, guarda
  antiflazo doble envío, entrada con costo, ajuste sin motivo rechazado,
  merma aplicada, merma imposible rechazada, devolución, historial y filtros.
- **Estadísticas** (14): ingresos del período (Bs 48.00) y margen con
  cobertura 100%, co-ocurrencia con n ventas, ausencia de lenguaje de IA,
  fórmula de rotación explícita en período de 30 días, umbrales guardados.
- **Precios de negocio** (6): sin panel INE ni botón de inflación en la
  modalidad negocio, homologación por unidad base, CSV importado (promedio
  verificado 44.67 Bs/kg), marca «desactualizado» >30 días.
- **Separación y persistencia** (6): coexistencia de datos domésticos y de
  negocio, ida y vuelta de modalidades y recarga completa conservándolo todo.
- **Seguridad** (1): payloads XSS en nombres, motivos y observaciones
  neutralizados.
- **Responsividad** (23): sin desborde horizontal en 320×568, 390×844
  (iframe same-origin), 768×1024, 1366×768 y 1920×1080 en vistas clave de
  ambas modalidades.

### 3.3 Hallazgo y corrección de seguridad (XSS reflejado)

La suite detectó de forma **intermitente** el check «XSS doméstico
neutralizado» (1 de cada ~4 corridas). Diagnóstico con un script de
reproducción que intercepta el setter de `innerHTML`: la inyección ocurría
en el **banner de la sección** (y también en el área de impresión del
informe), donde las sugerencias de `analizar()` insertaban el nombre del
producto **sin escapar** («Reponer pronto: …»). La intermitencia era solo
el timing de lectura respecto a la carga del `<img>` inyectado; la tarjeta
del producto siempre estuvo escapada.

**Corrección (en la raíz)**: los nombres se escapan al generar cada
sugerencia (`escaparHTML(p.nombre)` en las cuatro líneas de `analizar()`),
lo que cubre ambos destinos y usos futuros. Verificado con la misma trampa
de reproducción: **8/8 iteraciones sin ejecución del payload** y regresión
de la suite completa a **115/115**.

### 3.4 Revisión visual

~20 capturas (escritorio, móvil 320/390 y tablet) revisadas; corrigió un
detalle real detectado en captura (los pares de co-ocurrencia mostraban IDs
internos en lugar de nombres).

## 4. Limitaciones conocidas

- **Un solo dispositivo y un solo usuario**: no hay cuentas, sincronización
  ni concurrencia; los datos viven en el navegador donde se cargaron.
- **localStorage**: ~5–10 MB por origen; si se llena, la app avisa (no hay
  respaldo automático). Los históricos se recortan a topes razonables.
- **Sin precios oficiales de supermercados**: no existen APIs públicas
  autorizadas (CAPTCHA); las observaciones son muestra manual/CSV y se
  etiquetan como tales.
- **El INE publica índices, no precios**: el ajuste por inflación es una
  *estimación* aplicada a precios del usuario, con deshacer.
- La rotación y el margen dependen de que se carguen costos; se muestra la
  cobertura y, sin ella, solo métricas por unidades.
- Las alertas son reglas fijas simples sobre datos registrados; no predicen
  demanda ni estacionalidad.
- El modo negocio no genera PDF (el Informe PDF es del modo hogar).
- No es un sistema fiscal: no emite facturas ni boletas.

## 5. Cómo ejecutar

```bash
# Offline (doble clic): abrir index.html
# Con servidor local (habilita Actualizar datos INE):
python3 iniciar.py          # → http://localhost:8000
# Actualizar los datos oficiales del INE:
python3 scraper.py          # --forzar / --offline
# Pruebas (desde la carpeta de pruebas con verificar.py y navegador.py):
python3 verificar.py        # auditoría estática
python3 navegador.py        # suite E2E con Firefox (puerto 2828, headless)
```

## 6. Git

El proyecto quedó inicializado como repositorio Git local con un commit
limpio y un `.gitignore` (cachés y perfiles de prueba). Para publicarlo en
GitHub como **Inventario Multiuso**:

```bash
cd /home/gabrielvera/PYTHON/inventario-app
git remote add origin https://github.com/<tu-usuario>/inventario-multiuso.git
git push -u origin main
```

(esta máquina no tiene credenciales ni `gh` configurado; el push requiere
autenticación del propietario).
