#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor local de Inventario Multiuso.

  python3 iniciar.py            →  http://localhost:8000

Además de servir la página (necesario para que el navegador pueda leer
los archivos .js/.json y para "Actualizar datos INE"), expone:

  GET /api/ine/ipc              → últimos datos del INE (con caché de 1 h)
  GET /api/ine/ipc?refresh=1    → re-descarga en el momento desde el INE

Solo usa librería estándar de Python.
"""
import json
import os
import re
import sys
import threading
import time
import urllib.parse
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
ARCHIVO_JSON = os.path.join(BASE, 'datos', 'ine_ipc.json')
TTL_API = 3600  # como mucho, una descarga por hora salvo refresh explícito
PUERTO_INICIAL = 8000

_lock = threading.Lock()
_memo = {'datos': None, 'ts': 0.0, 'aviso': None}


def _leer_json_local():
    if not os.path.exists(ARCHIVO_JSON):
        return None
    try:
        with open(ARCHIVO_JSON, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def datos_ine(refrescar=False, forzar_descarga=False):
    """Datos del INE con caché en memoria + disco. Nunca lanza hacia el cliente."""
    with _lock:
        ahora = time.time()
        fresco = _memo['datos'] and (ahora - _memo['ts'] < TTL_API) and not refrescar
        if fresco:
            return _memo['datos']
        local = _leer_json_local()
        necesita_scrapear = forzar_descarga or refrescar or local is None or \
            (ahora - _memo['ts'] >= TTL_API and _memo['datos'] is None)
        if not necesita_scrapear and local is not None:
            _memo['datos'] = local
            _memo['ts'] = ahora
            return local
        try:
            import scraper
            datos = scraper.construir_datos(forzar=forzar_descarga)
            if not datos.get('productos'):
                raise RuntimeError('respuesta incompleta del INE')
            scraper.guardar(datos)
            _memo.update({'datos': datos, 'ts': ahora, 'aviso': None})
            return datos
        except Exception as e:
            # Sin conexión o INE no disponible: sirvo lo último conocido
            if local is not None:
                local = dict(local)
                local['aviso'] = f'No se pudo actualizar en vivo ({e}); mostrando última descarga guardada.'
                _memo['datos'] = local
                _memo['ts'] = ahora
                return local
            return {'error': f'No hay datos del INE disponibles ({e}).', 'ejecutar': 'python3 scraper.py'}


class Manejador(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/ine/ipc':
            self._api_ine(parsed.query)
            return
        super().do_GET()

    def _api_ine(self, query):
        q = urllib.parse.parse_qs(query)
        refresh = q.get('refresh', ['0'])[0] in ('1', 'true', 'si', 'sí')
        datos = datos_ine(refrescar=refresh, forzar_descarga=refresh)
        cuerpo = json.dumps(datos, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(cuerpo)))
        # CORS habilitado para que el HTML abierto por file:// también pueda actualizar
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(cuerpo)

    def log_message(self, fmt, *args):
        if '/api/ine' in (args[0] if args else ''):
            print(f'[INE] {datetime.now():%H:%M:%S} ' + (fmt % args))


def main():
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass
    puerto = PUERTO_INICIAL
    for intento in range(12):
        try:
            servidor = ThreadingHTTPServer(('0.0.0.0', puerto), Manejador)
            break
        except OSError:
            puerto += 1
    else:
        print('❌ No hay puertos libres entre 8000 y 8011.', file=sys.stderr)
        return 1

    print('🛒 Inventario Multiuso')
    print(f'   Abre en tu navegador:  http://localhost:{puerto}')
    print('   (en el celular de la misma red:  http://<IP-de-esta-pc>:%d)' % puerto)
    print('   API INE:  /api/ine/ipc  ·  forzar refresco:  /api/ine/ipc?refresh=1')
    print('   Ctrl+C para detener.')
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print('\n👋 Servidor detenido.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
