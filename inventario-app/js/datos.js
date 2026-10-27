/* ============================================================
   Inventario Boliviano — datos iniciales (catálogo precargado)
   Cada producto tiene:
   - nombre, emoji, unidad, stock actual, categoría y
   - minimo: cantidad mínima recomendada (avisa cuando el stock baje de ahí)
   ============================================================ */

const SECCIONES = {
  alimentos: {
    titulo: 'Existencia de Alimentos',
    corto: 'Alimentos',
    emoji: '🍚',
    clave: 'inventarioAlimentos',
    categorias: [
      { id: 'granos',      nombre: 'Granos y cereales',    emoji: '🌾' },
      { id: 'endulzantes', nombre: 'Endulzantes',          emoji: '🍬' },
      { id: 'aceites',     nombre: 'Aceites y grasas',     emoji: '🫒' },
      { id: 'lacteos',     nombre: 'Lácteos y huevos',     emoji: '🥛' },
      { id: 'verduras',    nombre: 'Verduras',             emoji: '🥬' },
      { id: 'carnes',      nombre: 'Carnes y proteínas',   emoji: '🍖' },
      { id: 'bebidas',     nombre: 'Bebidas e infusiones', emoji: '☕' },
      { id: 'otros',       nombre: 'Otros',                emoji: '📦' }
    ],
    productos: [
      { nombre: 'Arroz',             emoji: '🍚', unidad: 'kg',       stock: 5,  categoria: 'granos',      minimo: 3 },
      { nombre: 'Fideos',            emoji: '🍝', unidad: 'paquetes', stock: 8,  categoria: 'granos',      minimo: 4 },
      { nombre: 'Avena',             emoji: '🥣', unidad: 'kg',       stock: 2,  categoria: 'granos',      minimo: 1 },
      { nombre: 'Harina',            emoji: '🌾', unidad: 'kg',       stock: 4,  categoria: 'granos',      minimo: 2 },
      { nombre: 'Frijol',            emoji: '🫘', unidad: 'kg',       stock: 2,  categoria: 'granos',      minimo: 1 },
      { nombre: 'Lenteja',           emoji: '🫘', unidad: 'kg',       stock: 2,  categoria: 'granos',      minimo: 1 },
      { nombre: 'Quinua',            emoji: '🌾', unidad: 'kg',       stock: 1,  categoria: 'granos',      minimo: 1 },
      { nombre: 'Azúcar',            emoji: '🍬', unidad: 'kg',       stock: 3,  categoria: 'endulzantes', minimo: 2 },
      { nombre: 'Mantequilla',       emoji: '🧈', unidad: 'kg',       stock: 1,  categoria: 'endulzantes', minimo: 1 },
      { nombre: 'Miel',              emoji: '🍯', unidad: 'frascos',  stock: 1,  categoria: 'endulzantes', minimo: 1 },
      { nombre: 'Aceite',            emoji: '🫒', unidad: 'litros',   stock: 4,  categoria: 'aceites',     minimo: 2 },
      { nombre: 'Manteca',           emoji: '🥓', unidad: 'kg',       stock: 1,  categoria: 'aceites',     minimo: 1 },
      { nombre: 'Leche',             emoji: '🥛', unidad: 'litros',   stock: 6,  categoria: 'lacteos',     minimo: 3 },
      { nombre: 'Huevos',            emoji: '🥚', unidad: 'docenas',  stock: 3,  categoria: 'lacteos',     minimo: 1 },
      { nombre: 'Queso',             emoji: '🧀', unidad: 'kg',       stock: 1,  categoria: 'lacteos',     minimo: 1 },
      { nombre: 'Yogurt',            emoji: '🥛', unidad: 'frascos',  stock: 4,  categoria: 'lacteos',     minimo: 2 },
      { nombre: 'Papa',              emoji: '🥔', unidad: 'kg',       stock: 10, categoria: 'verduras',    minimo: 5 },
      { nombre: 'Cebolla',           emoji: '🧅', unidad: 'kg',       stock: 3,  categoria: 'verduras',    minimo: 2 },
      { nombre: 'Tomate',            emoji: '🍅', unidad: 'kg',       stock: 2,  categoria: 'verduras',    minimo: 1 },
      { nombre: 'Zanahoria',         emoji: '🥕', unidad: 'kg',       stock: 2,  categoria: 'verduras',    minimo: 1 },
      { nombre: 'Lechuga',           emoji: '🥬', unidad: 'unidades', stock: 2,  categoria: 'verduras',    minimo: 1 },
      { nombre: 'Locoto',            emoji: '🌶️', unidad: 'kg',       stock: 1,  categoria: 'verduras',    minimo: 1 },
      { nombre: 'Pollo',             emoji: '🍗', unidad: 'kg',       stock: 2,  categoria: 'carnes',      minimo: 1 },
      { nombre: 'Carne de res',      emoji: '🥩', unidad: 'kg',       stock: 3,  categoria: 'carnes',      minimo: 1 },
      { nombre: 'Pescado',           emoji: '🐟', unidad: 'kg',       stock: 1,  categoria: 'carnes',      minimo: 1 },
      { nombre: 'Sal',               emoji: '🧂', unidad: 'kg',       stock: 1,  categoria: 'otros',       minimo: 1 },
      { nombre: 'Pan',               emoji: '🍞', unidad: 'unidades', stock: 6,  categoria: 'otros',       minimo: 3 },
      { nombre: 'Café',              emoji: '☕', unidad: 'paquetes', stock: 2,  categoria: 'bebidas',     minimo: 1 },
      { nombre: 'Té',                emoji: '🍵', unidad: 'cajas',    stock: 1,  categoria: 'bebidas',     minimo: 1 },
      { nombre: 'Refresco en polvo', emoji: '🥤', unidad: 'sobres',   stock: 6,  categoria: 'bebidas',     minimo: 3 }
    ]
  },

  limpieza: {
    titulo: 'Insumos de Limpieza',
    corto: 'Limpieza',
    emoji: '🧹',
    clave: 'inventarioLimpieza',
    categorias: [
      { id: 'lavado',       nombre: 'Lavado y vajilla',  emoji: '🧼' },
      { id: 'desinfeccion', nombre: 'Desinfección',      emoji: '🧴' },
      { id: 'cuidado',      nombre: 'Cuidado personal',  emoji: '🧻' },
      { id: 'utensilios',   nombre: 'Utensilios',        emoji: '🧽' },
      { id: 'otros',        nombre: 'Otros',             emoji: '📦' }
    ],
    productos: [
      { nombre: 'Detergente en polvo', emoji: '🧺', unidad: 'kg',       stock: 2, categoria: 'lavado',       minimo: 1 },
      { nombre: 'Lavavajilla líquido', emoji: '🧴', unidad: 'litros',   stock: 2, categoria: 'lavado',       minimo: 1 },
      { nombre: 'Jabón en barra',      emoji: '🧼', unidad: 'unidades', stock: 4, categoria: 'lavado',       minimo: 2 },
      { nombre: 'Cloro',               emoji: '🧪', unidad: 'litros',   stock: 1, categoria: 'desinfeccion', minimo: 1 },
      { nombre: 'Desinfectante',       emoji: '💧', unidad: 'litros',   stock: 1, categoria: 'desinfeccion', minimo: 1 },
      { nombre: 'Limpiavidrios',       emoji: '🪟', unidad: 'litros',   stock: 1, categoria: 'desinfeccion', minimo: 1 },
      { nombre: 'Papel higiénico',     emoji: '🧻', unidad: 'paquetes', stock: 4, categoria: 'cuidado',      minimo: 2 },
      { nombre: 'Shampoo',             emoji: '🧴', unidad: 'frascos',  stock: 2, categoria: 'cuidado',      minimo: 1 },
      { nombre: 'Pasta dental',        emoji: '🦷', unidad: 'unidades', stock: 3, categoria: 'cuidado',      minimo: 1 },
      { nombre: 'Jabón líquido manos', emoji: '🤲', unidad: 'frascos',  stock: 2, categoria: 'cuidado',      minimo: 1 },
      { nombre: 'Escoba',              emoji: '🧹', unidad: 'unidades', stock: 1, categoria: 'utensilios',   minimo: 1 },
      { nombre: 'Trapos',              emoji: '🧺', unidad: 'unidades', stock: 5, categoria: 'utensilios',   minimo: 2 },
      { nombre: 'Esponja',             emoji: '🧽', unidad: 'unidades', stock: 3, categoria: 'utensilios',   minimo: 1 },
      { nombre: 'Bolsas de basura',    emoji: '🗑️', unidad: 'paquetes', stock: 2, categoria: 'utensilios',   minimo: 1 }
    ]
  }
};

/* Migración de datos de la versión anterior (productos sin categoría ni mínimo) */
const MAPA_CATEGORIAS = {
  arroz: 'granos', fideo: 'granos', avena: 'granos', harina: 'granos',
  frijol: 'granos', lenteja: 'granos', quinua: 'granos', maíz: 'granos',
  azúcar: 'endulzantes', mantequilla: 'endulzantes', miel: 'endulzantes',
  aceite: 'aceites', manteca: 'aceites',
  leche: 'lacteos', huevo: 'lacteos', queso: 'lacteos', yogurt: 'lacteos',
  papa: 'verduras', cebolla: 'verduras', tomate: 'verduras', zanahoria: 'verduras',
  lechuga: 'verduras', locoto: 'verduras',
  pollo: 'carnes', carne: 'carnes', pescado: 'carnes', res: 'carnes',
  sal: 'otros', pan: 'otros', café: 'bebidas', té: 'bebidas', refresco: 'bebidas',
  detergente: 'lavado', lavavajilla: 'lavado', jabón: 'lavado', cloro: 'desinfeccion',
  desinfectante: 'desinfeccion', limpiavidrios: 'desinfeccion', papel: 'cuidado',
  shampoo: 'cuidado', pasta: 'cuidado', escoba: 'utensilios', trapo: 'utensilios',
  esponja: 'utensilios', bolsa: 'utensilios'
};

const MINIMO_POR_DEFECTO = 2;

/* Mapeo catálogo → nombres exactos de la tabla "Índice a nivel Productos"
   del INE (IPC base 2016=100, descargada por scraper.py).
   Los productos sin equivalente oficial quedan fuera del panel INE. */
const MAPA_INE = {
  // ---- Alimentos ----
  'arroz': 'arroz',
  'fideos': 'fideo',
  'avena': 'avena procesada',
  'harina': 'harina de trigo',
  'frijol': 'frejol/poroto',
  'lenteja': 'lenteja',
  'quinua': 'quinua',
  'azúcar': 'azúcar',
  'mantequilla': 'mantequilla y margarina',
  'aceite': 'aceite comestible/aceite a granel',
  'leche': 'leche pasteurizada',
  'huevos': 'huevos',
  'queso': 'quesos',
  'yogurt': 'yogurt',
  'papa': 'papa',
  'cebolla': 'cebolla',
  'tomate': 'tomate',
  'zanahoria': 'zanahoria',
  'lechuga': 'lechuga',
  'locoto': 'locoto',
  'pollo': 'carne de pollo',
  'carne de res': 'carne de res sin hueso',
  'pescado': 'pescados frescos',
  'sal': 'sal',
  'pan': 'pan corriente',
  'café': 'café',
  'té': 'té',
  'refresco en polvo': 'polvos para preparar refrescos o jugos',
  // ---- Limpieza ----
  'detergente en polvo': 'detergente para lavar ropa',
  'lavavajilla líquido': 'detergentes para lavar vidrio, porcelana, vajilla',
  'jabón en barra': 'jabón',
  'desinfectante': 'desinfectantes',
  'papel higiénico': 'papel higiénico',
  'shampoo': 'shampoo en frasco',
  'pasta dental': 'pasta dental',
  'escoba': 'escoba',
  'esponja': 'esponjas para lavar vajilla',
  'bolsas de basura': 'bolsas para basura, bolsas plásticas'
};
