/* ============================================================
   Inventario Multiuso — clasificación de sectores y
   catálogo genérico de productos (registro semiasistido)
   Los datos son locales: no dependen de servicios externos.
   ============================================================ */

/* ---------- Sectores económicos (ampliables) ---------- */

const MU_SECTORES = [
  {
    id: 'comercio', nombre: 'A. Comercio minorista', emoji: '🏪',
    subcategorias: [
      { id: 'tienda-barrio',   nombre: 'Tiendas de barrio',            cats: ['Abarrotes', 'Bebidas', 'Lácteos', 'Snacks', 'Limpieza'] },
      { id: 'minimercado',     nombre: 'Minimercados y abarrotes',     cats: ['Abarrotes', 'Bebidas', 'Lácteos', 'Snacks', 'Limpieza'] },
      { id: 'ropa',            nombre: 'Tiendas de ropa',              cats: ['Prendas', 'Calzado', 'Accesorios'] },
      { id: 'calzado',         nombre: 'Calzado y accesorios',         cats: ['Calzado', 'Accesorios'] },
      { id: 'papeleria',       nombre: 'Papelerías y librerías',       cats: ['Papelería', 'Útiles escolares', 'Oficina'] },
      { id: 'ferreteria',      nombre: 'Ferreterías',                  cats: ['Ferretería', 'Pinturas', 'Materiales', 'Herramientas'] },
      { id: 'hogar',           nombre: 'Artículos para el hogar',      cats: ['Utensilios', 'Decoración', 'Menaje'] },
      { id: 'cosmetica',       nombre: 'Cosméticos y cuidado personal', cats: ['Cuidado personal', 'Cosméticos', 'Perfumería'] },
      { id: 'electronica',     nombre: 'Electrónica y accesorios',     cats: ['Electrónica', 'Accesorios', 'Cables'] },
      { id: 'comercio-otro',   nombre: 'Otros comercios',              cats: ['General'] }
    ]
  },
  {
    id: 'alimentos', nombre: 'B. Alimentos y bebidas', emoji: '🍽️',
    subcategorias: [
      { id: 'panaderia',       nombre: 'Panaderías',            cats: ['Pan', 'Pastelería', 'Insumos'] },
      { id: 'pasteleria',      nombre: 'Pastelerías',           cats: ['Tortas', 'Pastelería', 'Insumos'] },
      { id: 'cafeteria',       nombre: 'Cafeterías',            cats: ['Bebidas caliente', 'Alimentos', 'Insumos'] },
      { id: 'restaurante',     nombre: 'Restaurantes',          cats: ['Platos', 'Bebidas', 'Insumos'] },
      { id: 'comida-rapida',   nombre: 'Comida rápida',         cats: ['Comida rápida', 'Bebidas', 'Insumos'] },
      { id: 'distribuidor',    nombre: 'Distribuidores de alimentos', cats: ['Granos', 'Lácteos', 'Carnes', 'Bebidas'] },
      { id: 'gastronómico',    nombre: 'Otros negocios gastronómicos', cats: ['Alimentos', 'Bebidas', 'Insumos'] }
    ]
  },
  {
    id: 'limpieza', nombre: 'C. Limpieza y mantenimiento', emoji: '🧴',
    subcategorias: [
      { id: 'prod-limpieza',   nombre: 'Productos de limpieza',            cats: ['Limpieza', 'Desinfección', 'Insumos'] },
      { id: 'mantenimiento',   nombre: 'Artículos de mantenimiento',       cats: ['Mantenimiento', 'Herramientas', 'Repuestos'] },
      { id: 'institucional',   nombre: 'Insumos de limpieza institucional', cats: ['Insumos institucionales', 'Limpieza', 'Equipos'] },
      { id: 'limpieza-otro',   nombre: 'Otros',                            cats: ['General'] }
    ]
  },
  {
    id: 'manufactura', nombre: 'D. Producción y manufactura a pequeña escala', emoji: '🧵',
    subcategorias: [
      { id: 'elaboracion',     nombre: 'Elaboración de alimentos',   cats: ['Insumos', 'Productos terminados', 'Empaques'] },
      { id: 'artesanias',      nombre: 'Artesanías',                 cats: ['Materias primas', 'Artesanías', 'Insumos'] },
      { id: 'confeccion',      nombre: 'Confección textil',          cats: ['Telas', 'Insumos', 'Prendas'] },
      { id: 'personalizados',  nombre: 'Artículos personalizados',   cats: ['Insumos', 'Productos personalizados'] }
    ]
  },
  {
    id: 'otros', nombre: 'E. Otros sectores', emoji: '🌱',
    subcategorias: [
      { id: 'agro',            nombre: 'Agricultura y productos agropecuarios', cats: ['Productos agropecuarios', 'Insumos', 'Herramientas'] },
      { id: 'logistica',       nombre: 'Distribución y logística',    cats: ['Embalaje', 'Insumos', 'Servicios'] },
      { id: 'servicios',       nombre: 'Servicios con consumo de insumos', cats: ['Insumos', 'Materiales'] },
      { id: 'sin-clasificar',  nombre: 'Actividades no clasificadas', cats: ['General'] },
      { id: 'otro',            nombre: 'Otro (especificar manualmente)', cats: ['General'] }
    ]
  }
];

MU.subcategoria = function (id) {
  for (const s of MU_SECTORES) {
    for (const sub of s.subcategorias) if (sub.id === id) return sub;
  }
  return null;
};

MU.categoriasSugeridas = function (idSub) {
  const sub = MU.subcategoria(idSub);
  return (sub ? sub.cats : ['General']).slice();
};

/* ---------- Catálogo genérico de productos ----------
   n: nombre · u: unidad sugerida · ub: unidad base (kg|l|un|par)
   c: categoría sugerida · e: emoji · s: subcategorías a las que aplica
   ('todos' = universal). El usuario puede editar o ignorar cada dato. */

const MU_CATALOGO = [
  // ---- Alimentos básicos ----
  { n: 'Arroz',                 u: 'kg',     ub: 'kg', c: 'Abarrotes',      e: '🍚', s: ['tienda-barrio', 'minimercado', 'distribuidor', 'restaurante', 'comida-rapida', 'elaboracion'] },
  { n: 'Azúcar',                u: 'kg',     ub: 'kg', c: 'Abarrotes',      e: '🍬', s: ['tienda-barrio', 'minimercado', 'distribuidor', 'panaderia', 'pasteleria', 'cafeteria'] },
  { n: 'Harina de trigo',       u: 'kg',     ub: 'kg', c: 'Insumos',        e: '🌾', s: ['panaderia', 'pasteleria', 'restaurante', 'comida-rapida', 'elaboracion', 'distribuidor'] },
  { n: 'Harina de maíz',        u: 'kg',     ub: 'kg', c: 'Insumos',        e: '🌽', s: ['panaderia', 'restaurante', 'elaboracion', 'distribuidor'] },
  { n: 'Aceite',                u: 'litros', ub: 'l',  c: 'Abarrotes',      e: '🫒', s: ['tienda-barrio', 'minimercado', 'distribuidor', 'restaurante', 'comida-rapida', 'elaboracion'] },
  { n: 'Sal',                   u: 'kg',     ub: 'kg', c: 'Abarrotes',      e: '🧂', s: ['todos'] },
  { n: 'Leche',                 u: 'litros', ub: 'l',  c: 'Lácteos',        e: '🥛', s: ['tienda-barrio', 'minimercado', 'cafeteria', 'panaderia', 'distribuidor'] },
  { n: 'Queso',                 u: 'kg',     ub: 'kg', c: 'Lácteos',        e: '🧀', s: ['tienda-barrio', 'minimercado', 'restaurante', 'distribuidor'] },
  { n: 'Huevos',                u: 'docenas', ub: 'un', c: 'Lácteos',       e: '🥚', s: ['minimercado', 'panaderia', 'pasteleria', 'restaurante', 'distribuidor'] },
  { n: 'Mantequilla',           u: 'kg',     ub: 'kg', c: 'Lácteos',        e: '🧈', s: ['panaderia', 'pasteleria', 'minimercado'] },
  { n: 'Café molido',           u: 'paquetes', ub: 'un', c: 'Bebidas caliente', e: '☕', s: ['cafeteria', 'minimercado', 'restaurante'] },
  { n: 'Té',                    u: 'cajas',  ub: 'un', c: 'Bebidas caliente', e: '🍵', s: ['minimercado', 'tienda-barrio', 'cafeteria'] },
  { n: 'Gaseosa',               u: 'botellas', ub: 'un', c: 'Bebidas',      e: '🥤', s: ['tienda-barrio', 'minimercado', 'restaurante', 'comida-rapida'] },
  { n: 'Agua mineral',          u: 'botellas', ub: 'un', c: 'Bebidas',      e: '💧', s: ['tienda-barrio', 'minimercado', 'restaurante', 'comida-rapida'] },
  { n: 'Jugo envasado',         u: 'litros', ub: 'l',  c: 'Bebidas',        e: '🧃', s: ['tienda-barrio', 'minimercado', 'restaurante'] },
  { n: 'Pan',                   u: 'unidades', ub: 'un', c: 'Pan',          e: '🍞', s: ['panaderia', 'tienda-barrio', 'minimercado'] },
  { n: 'Galletas',              u: 'paquetes', ub: 'un', c: 'Pastelería',   e: '🍪', s: ['tienda-barrio', 'minimercado', 'cafeteria'] },
  { n: 'Chocolate',             u: 'tablillas', ub: 'un', c: 'Pastelería',  e: '🍫', s: ['minimercado', 'pasteleria', 'cafeteria'] },
  { n: 'Levadura',              u: 'paquetes', ub: 'un', c: 'Insumos',      e: '🫧', s: ['panaderia', 'pasteleria', 'elaboracion'] },
  { n: 'Carne de res',          u: 'kg',     ub: 'kg', c: 'Carnes',        e: '🥩', s: ['restaurante', 'comida-rapida', 'distribuidor', 'minimercado'] },
  { n: 'Pollo',                 u: 'kg',     ub: 'kg', c: 'Carnes',        e: '🍗', s: ['restaurante', 'comida-rapida', 'distribuidor', 'minimercado'] },
  { n: 'Papa',                  u: 'kg',     ub: 'kg', c: 'Verduras',      e: '🥔', s: ['restaurante', 'comida-rapida', 'distribuidor', 'minimercado'] },
  { n: 'Cebolla',               u: 'kg',     ub: 'kg', c: 'Verduras',      e: '🧅', s: ['restaurante', 'comida-rapida', 'distribuidor', 'minimercado'] },
  // ---- Limpieza ----
  { n: 'Detergente en polvo',   u: 'kg',     ub: 'kg', c: 'Limpieza',       e: '🧺', s: ['prod-limpieza', 'institucional', 'minimercado', 'tienda-barrio'] },
  { n: 'Lavavajilla líquido',   u: 'litros', ub: 'l',  c: 'Limpieza',       e: '🧴', s: ['prod-limpieza', 'institucional', 'minimercado', 'tienda-barrio'] },
  { n: 'Jabón en barra',        u: 'unidades', ub: 'un', c: 'Limpieza',     e: '🧼', s: ['prod-limpieza', 'institucional', 'minimercado', 'tienda-barrio'] },
  { n: 'Lavandina (cloro)',     u: 'litros', ub: 'l',  c: 'Desinfección',   e: '🧪', s: ['prod-limpieza', 'institucional', 'minimercado', 'tienda-barrio'] },
  { n: 'Desinfectante',         u: 'litros', ub: 'l',  c: 'Desinfección',   e: '💧', s: ['prod-limpieza', 'institucional', 'minimercado'] },
  { n: 'Papel higiénico',       u: 'paquetes', ub: 'un', c: 'Limpieza',     e: '🧻', s: ['prod-limpieza', 'institucional', 'minimercado', 'tienda-barrio'] },
  { n: 'Bolsas de basura',      u: 'paquetes', ub: 'un', c: 'Insumos',      e: '🗑️', s: ['prod-limpieza', 'institucional', 'minimercado'] },
  { n: 'Shampoo',               u: 'frascos', ub: 'un', c: 'Cuidado personal', e: '🧴', s: ['cosmetica', 'minimercado'] },
  { n: 'Pasta dental',          u: 'unidades', ub: 'un', c: 'Cuidado personal', e: '🦷', s: ['cosmetica', 'minimercado', 'tienda-barrio'] },
  { n: 'Esponja',               u: 'unidades', ub: 'un', c: 'Insumos',      e: '🧽', s: ['prod-limpieza', 'minimercado'] },
  { n: 'Escoba',                u: 'unidades', ub: 'un', c: 'Insumos',      e: '🧹', s: ['prod-limpieza', 'minimercado', 'ferreteria'] },
  // ---- Papelería ----
  { n: 'Cuaderno',              u: 'unidades', ub: 'un', c: 'Útiles escolares', e: '📓', s: ['papeleria'] },
  { n: 'Birome',                u: 'unidades', ub: 'un', c: 'Papelería',    e: '🖊️', s: ['papeleria'] },
  { n: 'Resma de papel',        u: 'resmas', ub: 'un', c: 'Oficina',        e: '📄', s: ['papeleria'] },
  { n: 'Lápiz',                 u: 'unidades', ub: 'un', c: 'Útiles escolares', e: '✏️', s: ['papeleria'] },
  // ---- Ferretería ----
  { n: 'Clavos',                u: 'kg',     ub: 'kg', c: 'Ferretería',     e: '🔨', s: ['ferreteria'] },
  { n: 'Tornillos',             u: 'cajas',  ub: 'un', c: 'Ferretería',     e: '🔩', s: ['ferreteria'] },
  { n: 'Pintura',               u: 'galones', ub: 'l', c: 'Pinturas',       e: '🎨', s: ['ferreteria'] },
  { n: 'Cinta aisladora',       u: 'unidades', ub: 'un', c: 'Cables',       e: '🔌', s: ['ferreteria', 'electronica'] },
  { n: 'Cable eléctrico',       u: 'metros', ub: 'un', c: 'Cables',         e: '🧵', s: ['ferreteria', 'electronica'] },
  { n: 'Martillo',              u: 'unidades', ub: 'un', c: 'Herramientas', e: '🔨', s: ['ferreteria'] },
  // ---- Ropa y accesorios ----
  { n: 'Camiseta',              u: 'unidades', ub: 'un', c: 'Prendas',      e: '👕', s: ['ropa'] },
  { n: 'Pantalón',              u: 'unidades', ub: 'un', c: 'Prendas',      e: '👖', s: ['ropa'] },
  { n: 'Zapatos',               u: 'pares',  ub: 'par', c: 'Calzado',       e: '👟', s: ['ropa', 'calzado'] },
  { n: 'Mochila',               u: 'unidades', ub: 'un', c: 'Accesorios',   e: '🎒', s: ['ropa', 'calzado', 'papeleria'] },
  { n: 'Cartera',               u: 'unidades', ub: 'un', c: 'Accesorios',   e: '👛', s: ['ropa', 'calzado'] },
  { n: 'Medias',                u: 'pares',  ub: 'par', c: 'Prendas',       e: '🧦', s: ['ropa', 'calzado'] },
  // ---- Cosmética ----
  { n: 'Crema corporal',        u: 'frascos', ub: 'un', c: 'Cosméticos',    e: '🧴', s: ['cosmetica'] },
  { n: 'Desodorante',           u: 'unidades', ub: 'un', c: 'Cuidado personal', e: '🌸', s: ['cosmetica', 'minimercado'] },
  { n: 'Jabón líquido manos',   u: 'frascos', ub: 'un', c: 'Cuidado personal', e: '🧴', s: ['cosmetica', 'prod-limpieza', 'minimercado'] },
  // ---- Electrónica ----
  { n: 'Pilas AA',              u: 'paquetes', ub: 'un', c: 'Accesorios',   e: '🔋', s: ['electronica', 'minimercado'] },
  { n: 'Bombilla LED',          u: 'unidades', ub: 'un', c: 'Electrónica',  e: '💡', s: ['electronica', 'ferreteria'] },
  { n: 'Funda de celular',      u: 'unidades', ub: 'un', c: 'Accesorios',   e: '📱', s: ['electronica'] },
  { n: 'Cable de carga',        u: 'unidades', ub: 'un', c: 'Cables',       e: '🔌', s: ['electronica'] },
  // ---- Insumos de negocio gastronómico ----
  { n: 'Aceite para freír (bidón)', u: 'litros', ub: 'l', c: 'Insumos',    e: '🛢️', s: ['restaurante', 'comida-rapida', 'elaboracion'] },
  { n: ' Servilletas',          u: 'paquetes', ub: 'un', c: 'Empaques',    e: '🧻', s: ['restaurante', 'comida-rapida', 'panaderia', 'elaboracion'] },
  { n: 'Vasos desechables',     u: 'paquetes', ub: 'un', c: 'Empaques',    e: '🥤', s: ['cafeteria', 'restaurante', 'comida-rapida', 'elaboracion'] },
  // ---- General / varios ----
  { n: 'Bolsas de papel',       u: 'paquetes', ub: 'un', c: 'Empaques',    e: '🛍️', s: ['todos'] },
  { n: 'Etiquetas de precio',   u: 'paquetes', ub: 'un', c: 'Insumos',      e: '🏷️', s: ['todos'] },
  { n: 'Caja registradora (consumible)', u: 'rollos', ub: 'un', c: 'Insumos', e: '🧾', s: ['todos'] }
];

/* Catálogo filtrado por subcategoría del negocio (más 'todos'). */
MU.catalogoDe = function (idSub) {
  return MU_CATALOGO.filter(p => p.s === 'todos' || p.s.indexOf(idSub) >= 0);
};

/* Búsqueda simple en el catálogo (nombre o categoría). */
MU.buscarEnCatalogo = function (texto, idSub) {
  const q = MU.normTexto(texto);
  const base = MU.catalogoDe(idSub);
  if (!q) return base.slice(0, 30);
  return base.filter(p => MU.normTexto(p.n).indexOf(q) >= 0
    || MU.normTexto(p.c).indexOf(q) >= 0).slice(0, 30);
};

/* Detecta posibles duplicados contra los productos ya cargados del negocio. */
MU.duplicadosSimilares = function (nombre, unidad, lista) {
  const n = MU.normTexto(nombre);
  if (!n) return [];
  return (lista || []).filter(p => {
    const pn = MU.normTexto(p.nombre);
    return pn === n || (pn.length > 3 && n.length > 3 && (pn.indexOf(n) === 0 || n.indexOf(pn) === 0));
  });
};
