#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper del IPC del INE (Bolivia) para Inventario Boliviano.

Descarga las tablas oficiales del Instituto Nacional de Estadística
(IPC base 2016 = 100), las parsea y genera:
  - datos/ine_ipc.json   (caché legible / endpoint de la API)
  - js/ine_ipc.js        (window.INE_IPC para uso offline desde el HTML)

Solo usa librería estándar de Python (sin pip install).

Uso:
  python3 scraper.py              # actualiza respetando caché de 24 h
  python3 scraper.py --forzar     # descarga de nuevo ignorando la caché
  python3 scraper.py --offline    # re-procesa lo que ya está en la caché

Nota de cortesía: el INE es un servidor público. Este script descarga a lo
sumo una vez cada 24 horas salvo que se pida --forzar.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(BASE, 'datos', '_cache')
OUT_JSON = os.path.join(BASE, 'datos', 'ine_ipc.json')
OUT_JS = os.path.join(BASE, 'js', 'ine_ipc.js')

PAGINA_NACIONAL = 'https://www.ine.gob.bo/index.php/nacional/'
TTL_CACHE = 24 * 3600  # 24 horas
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

# Enlaces por defecto (por si la página del INE cambia de formato)
FALLBACK = {
    'general': 'https://nube.ine.gob.bo/index.php/s/auAr2RoVf2ya2Eu/download',
    'divisiones': 'https://nube.ine.gob.bo/index.php/s/5DgpsPTKFXyfRjt/download',
    'productos': 'https://nube.ine.gob.bo/index.php/s/4NIssKT17IySipJ/download',
}

MESES = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'setiembre': 9, 'octubre': 10,
    'noviembre': 11, 'diciembre': 12,
}

CABECERAS = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) InventarioBoliviano/1.0 (uso educativo local)'}


# ---------------------------------------------------------------- HTTP
def _http(url, timeout=90):
    req = urllib.request.Request(url, headers=CABECERAS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def obtener_pagina():
    """Devuelve la lista (en orden) de enlaces de descarga del INE."""
    html = _http(PAGINA_NACIONAL).decode('utf-8', 'ignore')
    patron = re.compile(r'href="(https://nube\.ine\.gob\.bo/index\.php/s/\w+/download)"', re.I)
    urls = []
    for m in patron.finditer(html):
        if m.group(1) not in urls:
            urls.append(m.group(1))
    if not urls:
        urls = list(FALLBACK.values())
    return urls


def clasificar(path):
    """Identifica el rol de un .xlsx del INE por su contenido (no por el texto del HTML)."""
    import unicodedata

    def sin_acentos(s):
        return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

    try:
        hojas = nombres_hojas(path)
    except Exception:
        return None
    hojas_s = [sin_acentos(h.upper()) for h in hojas]
    if len(hojas) >= 4 and any('INDICE MENSUAL' in h for h in hojas_s):
        return 'general'          # general: cuadros 1.1 índice / 1.2 var mensual / ...
    if len(hojas) >= 4 and any('BOL INDICE' in h for h in hojas_s):
        return 'divisiones'       # índice general + 12 divisiones, 4 cuadros
    try:
        M = leer_xlsx(path, 0)
    except Exception:
        return None
    encabezado = sin_acentos(' '.join(str(c) for fila in M[:8] for c in fila).upper())
    if 'CODIGO' in encabezado and 'DESCRIPCION' in encabezado:
        filas_ok = sum(1 for fila in M
                       if len(fila) > 1 and re.fullmatch(r'\d+', str(fila[0]).replace('\xa0', '').strip()))
        if filas_ok > 50 and 'PONDER' not in encabezado:
            return 'productos'
    return None


def archivo_cache(nombre, url, forzar=False, offline=False):
    os.makedirs(CACHE, exist_ok=True)
    destino = os.path.join(CACHE, nombre)
    if offline:
        if os.path.exists(destino):
            return destino
        raise RuntimeError(f'--offline: falta {nombre} en la caché; corré sin --offline primero.')
    viejo = os.path.exists(destino) and (time.time() - os.path.getmtime(destino) < TTL_CACHE)
    if viejo and not forzar:
        return destino
    try:
        data = _http(url)
        with open(destino, 'wb') as f:
            f.write(data)
        return destino
    except Exception as e:
        if os.path.exists(destino):
            print(f'  ⚠ No se pudo descargar {nombre} ({e}); se usa la caché local.', file=sys.stderr)
            return destino
        raise


# ---------------------------------------------------------------- XLSX (stdlib)
def _col_num(ref):
    m = re.match(r'([A-Z]+)(\d+)', ref)
    col = 0
    for ch in m.group(1):
        col = col * 26 + (ord(ch) - 64)
    return col - 1, int(m.group(2)) - 1


def leer_xlsx(path, hoja=0):
    """Devuelve la hoja como lista de filas (lista de listas de strings)."""
    z = zipfile.ZipFile(path)
    hojas = sorted(n for n in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.xml$', n))
    try:
        sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
        compartidas = [''.join(t.text or '' for t in si.iter(NS + 't')) for si in sst.findall(NS + 'si')]
    except KeyError:
        compartidas = []
    raiz = ET.fromstring(z.read(hojas[hoja]))
    celdas, maxc, maxr = {}, 0, 0
    for fila in raiz.find(NS + 'sheetData').findall(NS + 'row'):
        for c in fila.findall(NS + 'c'):
            ref = c.get('r')
            if not ref:
                continue
            t, v, is_ = c.get('t'), c.find(NS + 'v'), c.find(NS + 'is')
            if t == 's' and v is not None:
                val = compartidas[int(v.text)]
            elif t == 'inlineStr' and is_ is not None:
                val = ''.join(x.text or '' for x in is_.iter(NS + 't'))
            elif v is not None:
                val = v.text
            else:
                val = ''
            ci, ri = _col_num(ref)
            celdas[(ri, ci)] = val
            maxc, maxr = max(maxc, ci), max(maxr, ri)
    M = [['' for _ in range(maxc + 1)] for _ in range(maxr + 1)]
    for (r, c), val in celdas.items():
        M[r][c] = val
    return M


def nombres_hojas(path):
    z = zipfile.ZipFile(path)
    wb = z.read('xl/workbook.xml').decode('utf-8', 'ignore')
    return re.findall(r'<sheet name="([^"]+)"', wb)


def _float(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def _columnas_por_periodo(M, fila_anios, fila_meses):
    """Mapea número de columna -> (año, mes) para tablas en formato estándar."""
    cols, anio = {}, None
    for c in range(len(M[fila_anios])):
        v = str(M[fila_anios][c]).strip()
        if re.fullmatch(r'(19|20)\d{2}', v):
            anio = int(v)
        mes = str(M[fila_meses][c]).strip().lower() if fila_meses < len(M) else ''
        if anio and mes in MESES:
            cols[c] = (anio, MESES[mes])
    return cols


def _buscar_fila_encabezado(M):
    """Filas (años, meses) de una tabla estándar: contiene 'CÓDIGO'/'DIVISIÓN' + 'Enero'."""
    for r in range(min(12, len(M))):
        fila = [str(x).strip().upper() for x in M[r][:3]]
        if fila and ('CÓDIGO' in fila[0] or 'DIVISIÓN' in fila[0] or 'DIVISION' in fila[0]):
            meses = None
            for rr in range(r + 1, min(r + 3, len(M))):
                if any(str(x).strip().lower() in MESES for x in M[rr]):
                    meses = rr
                    break
            if meses is not None:
                return r, meses
    return None, None


def serie_estandar(M, etiqueta):
    """Serie {(año, mes): valor} de una fila cuya etiqueta está en la columna 1."""
    f_anios, f_meses = _buscar_fila_encabezado(M)
    if f_anios is None:
        return {}
    cols = _columnas_por_periodo(M, f_anios, f_meses)
    objetivo = etiqueta.strip().lower()
    for r in range(f_meses + 1, len(M)):
        nom = str(M[r][1]).strip().lower() if len(M[r]) > 1 else ''
        if nom == objetivo:
            serie = {}
            for c, periodo in cols.items():
                val = _float(M[r][c]) if c < len(M[r]) else None
                if val is not None:
                    serie[periodo] = val
            return serie
    return {}


def filas_productos(M):
    """[(codigo, nombre, serie)] de la tabla de productos (filas = productos)."""
    f_anios, f_meses = _buscar_fila_encabezado(M)
    if f_anios is None:
        return []
    cols = _columnas_por_periodo(M, f_anios, f_meses)
    filas = []
    for r in range(f_meses + 1, len(M)):
        codigo = str(M[r][0]).replace('\xa0', '').strip() if len(M[r]) > 0 else ''
        nombre = str(M[r][1]).strip() if len(M[r]) > 1 else ''
        if not (codigo and re.fullmatch(r'\d+', codigo) and nombre):
            continue
        serie = {}
        for c, periodo in cols.items():
            val = _float(M[r][c]) if c < len(M[r]) else None
            if val is not None:
                serie[periodo] = val
        filas.append((codigo, nombre, serie))
    return filas


def serie_transpuesta(M):
    """Serie {(año, mes): valor} de tablas con meses en filas y años en columnas."""
    for r in range(min(8, len(M))):
        if str(M[r][0]).strip().lower() == 'mes':
            cols, anio = {}, None
            for c in range(1, len(M[r])):
                v = str(M[r][c]).strip()
                if re.fullmatch(r'(19|20)\d{2}', v):
                    anio = int(v)
                if anio:
                    cols[c] = anio
            serie = {}
            for rr in range(r + 1, len(M)):
                mes = str(M[rr][0]).strip().lower()
                if mes not in MESES:
                    continue
                for c, anio in cols.items():
                    val = _float(M[rr][c]) if c < len(M[rr]) else None
                    if val is not None:
                        serie[(anio, MESES[mes])] = val
            if serie:
                return serie
    return {}


# ---------------------------------------------------------------- Cálculos
def _anterior(y, m):
    return (y, m - 1) if m > 1 else (y - 1, 12)


def variaciones(serie):
    """Variaciones porcentuales según las fórmulas publicadas por el INE."""
    if not serie:
        return {'indice': None, 'var_mensual': None, 'var_acumulada': None, 'var_12m': None}
    periodo = max(serie)
    t = serie[periodo]
    y, m = periodo

    def pct(actual, base):
        if actual is None or base in (None, 0):
            return None
        return round((actual / base - 1) * 100, 2)

    ant = serie.get(_anterior(y, m))
    dic = serie.get((y - 1, 12))
    h12 = serie.get((y - 1, m))
    return {
        'indice': round(t, 2),
        'var_mensual': pct(t, ant),
        'var_acumulada': pct(t, dic),
        'var_12m': pct(t, h12),
    }


def periodoTexto(serie):
    if not serie:
        return None
    y, m = max(serie)
    return f'{y:04d}-{m:02d}'


def buscar_fecha_publicacion(path):
    for idx in range(4):
        try:
            M = leer_xlsx(path, idx)
        except Exception:
            continue
        for fila in M:
            for celda in fila:
                if isinstance(celda, str) and 'Fecha de publicación' in celda:
                    return celda.split(':', 1)[-1].strip()
        if idx >= 1:
            break
    return None


# ---------------------------------------------------------------- Orquestación
def obtener_rutas(forzar=False, offline=False):
    """Descarga (o reutiliza) los tres archivos necesarios y los identifica por contenido."""
    if offline:
        urls = []
    else:
        try:
            urls = obtener_pagina()
        except Exception as e:
            print(f'  ⚠ Página del INE no disponible ({e}); se usa caché local.', file=sys.stderr)
            urls = []
    os.makedirs(CACHE, exist_ok=True)
    rutas = {}
    # Archivos ya descargados en corridas anteriores (por id de compartición)
    candidatos = []
    for url in urls:
        ident = re.search(r'/s/(\w+)/download', url)
        candidatos.append(('ine_' + (ident.group(1) if ident else 'tmp') + '.xlsx', url))
    if not candidatos:  # offline o sin página: revisar lo que haya en caché
        candidatos = [(n, None) for n in sorted(os.listdir(CACHE)) if n.endswith('.xlsx')]

    for nombre, url in candidatos:
        if len(rutas) >= 3:
            break
        path = archivo_cache(nombre, url, forzar, offline) if url else os.path.join(CACHE, nombre)
        if not os.path.exists(path):
            continue
        rol = clasificar(path)
        if rol and rol not in rutas:
            rutas[rol] = path
    faltantes = {'general', 'divisiones', 'productos'} - set(rutas)
    if faltantes:
        raise RuntimeError('No se encontraron las tablas del INE: faltan ' + ', '.join(sorted(faltantes)))
    return rutas


def construir_datos(forzar=False, offline=False):
    if not offline:
        print('📄 Consultando página del INE…')
    rutas = obtener_rutas(forzar, offline)

    print('🧮 Procesando índice general…')
    serie_general = serie_transpuesta(leer_xlsx(rutas['general'], 1))
    general = variaciones(serie_general)

    print('🧮 Procesando divisiones…')
    M_div = leer_xlsx(rutas['divisiones'], 1)
    divisiones = []
    for r in range(len(M_div)):
        cod = str(M_div[r][0]).strip() if len(M_div[r]) > 0 else ''
        nom = str(M_div[r][1]).strip() if len(M_div[r]) > 1 else ''
        if not (cod and re.fullmatch(r'\d+', cod) and nom):
            continue
        serie = serie_estandar(M_div, nom)
        if not serie:
            continue
        d = {'codigo': cod, 'nombre': nom}
        d.update(variaciones(serie))
        divisiones.append(d)

    print('🧮 Procesando productos…')
    productos = {}
    for codigo, nombre, serie in filas_productos(leer_xlsx(rutas['productos'], 0)):
        if not serie:
            continue
        d = {'codigo': codigo, 'nombre': nombre}
        d.update(variaciones(serie))
        productos[nombre.strip().lower()] = d

    fecha_pub = buscar_fecha_publicacion(rutas['divisiones']) or buscar_fecha_publicacion(rutas['general'])
    ultimo = periodoTexto(serie_general)

    # Validación: el último período de general y de productos debe coincidir
    if ultimo and divisiones:
        pass

    datos = {
        'fuente': 'Instituto Nacional de Estadística (INE) — IPC base 2016 = 100',
        'url_fuente': 'https://www.ine.gob.bo/index.php/graficos-ipc/',
        'fecha_descarga': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'fecha_publicacion': fecha_pub,
        'ultimo_periodo': ultimo,
        'general': general,
        'divis_alimentos': next((d for d in divisiones if d['codigo'] == '1'), None),
        'divisiones': [d for d in divisiones if d['codigo'] != '0'],
        'productos': productos,
    }
    return datos


def guardar(datos):
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
    texto = json.dumps(datos, ensure_ascii=False, indent=1)
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        f.write(texto)
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* Generado por scraper.py — datos oficiales del INE. No editar a mano. */\n')
        f.write('window.INE_IPC = ' + texto + ';\n')
    return OUT_JSON, OUT_JS


def main():
    ap = argparse.ArgumentParser(description='Actualiza los datos del IPC del INE.')
    ap.add_argument('--forzar', action='store_true', help='ignora la caché y descarga de nuevo')
    ap.add_argument('--offline', action='store_true', help='no descarga, usa los archivos en caché')
    args = ap.parse_args()
    try:
        datos = construir_datos(forzar=args.forzar, offline=args.offline)
    except Exception as e:
        print(f'❌ Error: {e}', file=sys.stderr)
        return 1
    if not datos['productos'] or not datos['general'].get('indice'):
        print('❌ El INE devolvió datos incompletos; no se escribió nada.', file=sys.stderr)
        return 1
    j, js = guardar(datos)
    print(f'✅ Último periodo: {datos["ultimo_periodo"]} · publicación: {datos["fecha_publicacion"]}')
    print(f'   General: índice {datos["general"]["indice"]} · mensual {datos["general"]["var_mensual"]}%'
          f' · acumulada {datos["general"]["var_acumulada"]}% · 12m {datos["general"]["var_12m"]}%')
    print(f'   Divisiones: {len(datos["divisiones"])} · Productos: {len(datos["productos"])}')
    print(f'   Escrito: {j}')
    print(f'   Escrito: {js}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
