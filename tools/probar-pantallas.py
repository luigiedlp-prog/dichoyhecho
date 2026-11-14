#!/usr/bin/env python3
"""Pruebas de pantalla de Dicho y Hecho (corre la página de prueba en un navegador simulando un celular).

Uso:   python3 tools/probar-pantallas.py
Pide:  pip install playwright && playwright install chromium
No usa internet ni la D1: arma tools/prueba (app + servidor simulado) y la abre en Chromium.
Termina con código 1 si algo falla, así sirve también para revisar antes de subir a GitHub.
"""
import json, asyncio, os, subprocess, sys, tempfile, threading, functools, http.server
from playwright.async_api import async_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FALLAS = []

def chk(nombre, cond):
    print(('OK   ' if cond else 'FAIL ') + nombre)
    if not cond: FALLAS.append(nombre)

async def txt(pg): return await pg.inner_text('body')
async def saltar(pg):
    for _ in range(4):
        if await pg.get_by_text('Saltar').count():
            await pg.get_by_text('Saltar').first.click(); await pg.wait_for_timeout(400)

async def entrar(pg, url, tel, pin='123456'):
    await pg.evaluate("localStorage.removeItem('t')"); await pg.goto(url); await pg.wait_for_timeout(500)
    await pg.get_by_text('Ya tengo cuenta').click(); await pg.wait_for_timeout(300)
    await pg.fill('#tl', tel); await pg.fill('#pn', pin)
    await pg.get_by_role('button', name='Ingresar').click(); await pg.wait_for_timeout(900); await saltar(pg)

async def gestion(pg, url):
    await pg.goto(url + '#gestion'); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(500)
    if await pg.locator('input').count():  # si ya entró antes en esta sesión, no vuelve a pedir la clave
        await pg.locator('input').first.fill('clave')
        await pg.get_by_role('button').filter(has_text='Entrar').first.click(); await pg.wait_for_timeout(900)

async def abrir_detalles(pg):
    await pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")

async def main():
    tmp = tempfile.mkdtemp()
    html = os.path.join(tmp, 'prueba.html')
    subprocess.run([sys.executable, os.path.join(RAIZ, 'tools', 'prueba', 'armar.py'), html], check=True, stdout=subprocess.DEVNULL)
    URL = 'file://' + html
    # servidor local solo para probar el service worker (no funciona desde file://)
    class Callado(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a, **k): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Callado, directory=os.path.join(RAIZ, 'public')))
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    async with async_playwright() as p:
        b = await p.chromium.launch()

        print('--- app sin internet')
        c = await b.new_context(); pg = await c.new_page()
        await pg.goto('http://127.0.0.1:%d/' % srv.server_port); await pg.wait_for_timeout(1500)
        await pg.evaluate("navigator.serviceWorker.ready"); await pg.reload(); await pg.wait_for_timeout(1000)
        chk('el service worker guarda la app', len(await pg.evaluate("caches.keys()")) >= 1)
        await c.set_offline(True); await pg.reload(); await pg.wait_for_timeout(1200)
        chk('sin internet la app abre', 'Alguien lo necesita' in await txt(pg))
        await c.close()

        print('--- Gestión: confirmar teléfonos (v42)')
        c = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await c.new_page(); await pg.goto(URL); await pg.wait_for_timeout(500)
        t = await pg.evaluate("fetch('/api/admin/inicio',{headers:{'x-admin-key':'clave'}}).then(r=>r.json())"); chk('en una app nueva la confirmación viene apagada', t['tel_on'] == 0)
        await pg.evaluate("fetch('/api/admin/ajuste',{method:'POST',headers:{'x-admin-key':'clave','content-type':'application/json'},body:JSON.stringify({clave:'tel_on',valor:1})})"); await pg.wait_for_timeout(300)
        await pg.evaluate("fetch('/api/registro',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tipo:'trabajador',nombre:'Mario Pendiente',barrio:'Centro',telefono:'2477555777',pin:'123456',acepto:1,pregunta:'¿Cómo se llamaba tu primera mascota?',respuesta:'Rocky Balboa'})})")
        await gestion(pg, URL); await pg.wait_for_timeout(500)
        t = await txt(pg)
        chk('Gestión muestra a quien espera su código', 'Confirmar teléfonos por WhatsApp' in t and 'Mario Pendiente' in t and 'Código:' in t)
        h = await pg.evaluate("document.querySelector('a[href*=\"wa.me\"]')?.href||''")
        chk('el botón abre WhatsApp al número con el código escrito', 'wa.me/549' in h and '2477555777' in h and 'c%C3%B3digo' in h.lower().replace('ó', '%c3%b3') or 'wa.me/' in h and 'Dicho' in h)
        chk('Gestión ofrece activar los avisos en el celu', 'Avisos en este celu' in t and await pg.get_by_role('button', name='Activar').count() >= 1)
        chk('vence en 1 hora', 'vence en 59 min' in t or 'vence en 60 min' in t)
        await pg.get_by_role('button', name='Apagar').click(); await pg.wait_for_timeout(700)
        t = await txt(pg); chk('se apaga a gusto', 'Apagado' in t and 'Mario Pendiente' not in t)
        await pg.get_by_role('button', name='Prender').click(); await pg.wait_for_timeout(700)
        chk('y se vuelve a prender', 'Mario Pendiente' in await txt(pg))
        await c.close()

        print('--- encabezados de seguridad y vista previa (v39)')
        # servidor que aplica public/_headers como lo hace Cloudflare y completa {{ORIGEN}} como el Worker
        hd = open(os.path.join(RAIZ, 'public', '_headers'), encoding='utf-8').read()
        glob = {}
        for bloque in hd.split('\n\n'):
            ls = [l for l in bloque.split('\n') if l.strip()]
            if ls and ls[0].strip() == '/*':
                for l in ls[1:]:
                    k, v = l.strip().split(':', 1); glob[k.strip()] = v.strip()
        class ConHeaders(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a, **k): pass
            def end_headers(self):
                for k, v in glob.items(): self.send_header(k, v)
                super().end_headers()
            def do_GET(self):
                ruta = self.path.split('?')[0]
                if ruta in ('/', '/index.html'):
                    cuerpo = open(os.path.join(RAIZ, 'public', 'index.html'), encoding='utf-8').read().replace('{{ORIGEN}}', 'http://127.0.0.1:%d' % srv2.server_port).encode()
                    self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(cuerpo))); self.end_headers(); self.wfile.write(cuerpo)
                elif ruta.startswith('/api/'):
                    self.send_response(401); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(b'{"error":"x"}')
                else: super().do_GET()
        srv2 = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ConHeaders, directory=os.path.join(RAIZ, 'public')))
        threading.Thread(target=srv2.serve_forever, daemon=True).start()
        base = 'http://127.0.0.1:%d' % srv2.server_port
        chk('la CSP está en _headers', 'Content-Security-Policy' in glob)
        c = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await c.new_page()
        csp = []
        pg.on('console', lambda m: csp.append(m.text) if 'Content Security Policy' in m.text or 'Refused to' in m.text else None)
        pg.on('pageerror', lambda e: csp.append(str(e)))
        await pg.goto(base + '/'); await pg.wait_for_timeout(1200)
        chk('la portada se dibuja con la CSP puesta', 'Alguien lo necesita' in await txt(pg))
        chk("la CSP ya no deja correr scripts escritos dentro de la página", "script-src 'self';" in glob['Content-Security-Policy'])
        await pg.goto(base + '/legal.html'); await pg.wait_for_timeout(700)
        chk('el aviso legal también se ve con la CSP puesta', 'rivacidad' in await txt(pg) and 'rminos' in await txt(pg))
        await pg.goto(base + '/'); await pg.wait_for_timeout(900)
        await pg.get_by_text('Ya tengo cuenta').click(); await pg.wait_for_timeout(400)
        await pg.goto(base + '/legal.html'); await pg.wait_for_timeout(600)
        chk('legal.html se ve con la CSP puesta', 'legal' in (await txt(pg)).lower() or 'privacidad' in (await txt(pg)).lower())
        chk('sin violaciones de CSP en portada y legal', not csp)
        if csp: print('   ', csp[:3])
        await pg.goto(base + '/'); await pg.wait_for_timeout(500)
        og = await pg.evaluate("Object.fromEntries([...document.querySelectorAll('meta[property^=og],meta[name^=twitter]')].map(m=>[m.getAttribute('property')||m.name,m.content]))")
        chk('están og:title, og:description, og:type y og:locale', all(og.get(k) for k in ('og:title', 'og:description', 'og:type', 'og:locale')) and og.get('og:locale') == 'es_AR')
        chk('og:url y og:image son absolutas', og.get('og:url', '').startswith('http') and og.get('og:image', '').startswith('http') and '{{' not in json.dumps(og))
        chk('twitter:card summary_large_image', og.get('twitter:card') == 'summary_large_image')
        r = await pg.request.get(og.get('og:image'))
        chk('la imagen de vista previa existe y pesa menos de 300 KB', r.status == 200 and len(await r.body()) < 300 * 1024)
        r = await pg.request.get(base + '/robots.txt'); chk('robots.txt bloquea /api/', 'Disallow: /api/' in await r.text())
        chk('legal.html tiene meta description', 'name="description"' in open(os.path.join(RAIZ, 'public', 'legal.html'), encoding='utf-8').read())
        srv2.shutdown(); await c.close()

        print('--- actualización de la app (rápido y al día)')
        import shutil, re as _re
        cp = os.path.join(tmp, 'pub'); shutil.copytree(os.path.join(RAIZ, 'public'), cp)
        ap = os.path.join(cp, 'app', 'base.js'); base_js = open(ap, encoding='utf-8').read()
        open(ap, 'w', encoding='utf-8').write('window.__ver=1;\n' + base_js)
        class Sirve(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a, **k): pass
            def end_headers(self):
                self.send_header('Cache-Control', 'no-cache'); super().end_headers()
        srv3 = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Sirve, directory=cp))
        threading.Thread(target=srv3.serve_forever, daemon=True).start()
        u3 = 'http://127.0.0.1:%d/' % srv3.server_port
        c = await b.new_context(); pg = await c.new_page()
        await pg.goto(u3); await pg.wait_for_timeout(800); await pg.evaluate("navigator.serviceWorker.ready")
        await pg.reload(); await pg.wait_for_timeout(800)
        chk('primera versión cargada', await pg.evaluate("window.__ver") == 1)
        open(ap, 'w', encoding='utf-8').write('window.__ver=2;\n' + base_js)
        swp = os.path.join(cp, 'sw.js'); sw_t = open(swp, encoding='utf-8').read()
        open(swp, 'w', encoding='utf-8').write(_re.sub(r"const V\s*=\s*'ct-v\d+'", "const V = 'ct-v99'", sw_t, count=1))
        t0 = await pg.evaluate("performance.now()")
        await pg.reload(); await pg.wait_for_timeout(1500)
        # al subir el número de V el celu baja todo y, al pasar a segundo plano, la app se recarga sola
        await pg.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        await pg.wait_for_timeout(1500)
        chk('al subir V la app se recarga sola con la versión nueva', await pg.evaluate("window.__ver") == 2)
        claves = await pg.evaluate("caches.keys()")
        chk('la caché vieja se borra y queda solo la nueva', claves == ['ct-v99'])
        await c.close(); srv3.shutdown()

        print('--- registro')
        c = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await c.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?r=ABCDE2'); await pg.wait_for_timeout(600)
        await pg.get_by_text('Crear cuenta gratis').click(); await pg.wait_for_timeout(300)
        await pg.get_by_text('Busco quien me ayude').click(); await pg.wait_for_timeout(400)
        chk('el paso 2 pide nombre y apellido', 'Tu nombre y apellido' in await txt(pg))
        await pg.fill('#n', 'Solo'); await pg.select_option('#bb', index=1)
        await pg.get_by_role('button', name='Siguiente').click(); await pg.wait_for_timeout(400)
        t = await txt(pg); chk('sin apellido no avanza', 'tu apellido' in t.lower() and 'Paso 2' in t)
        await pg.fill('#n', 'Lucía Fernández')
        await pg.get_by_role('button', name='Siguiente').click(); await pg.wait_for_timeout(500)
        chk('el paso 3 es "Tu acceso" y la barra dice 3 de 4', 'Tu acceso' in await txt(pg) and 'Paso 3 de 4' in await txt(pg))
        chk('el paso 3 ya no pide pregunta ni mail', await pg.locator('#pq').count() == 0 and await pg.locator('#ml').count() == 0)
        chk('el teléfono ya no dice "sin 0 ni 15"', 'sin 0 ni 15' not in await pg.content())
        await pg.fill('#tl', '0 2477 15 555-001'); await pg.fill('#pn', '12345')
        chk('el PIN arranca oculto', await pg.get_attribute('#pn', 'type') == 'password')
        await pg.click('.pe'); chk('el ojito muestra el PIN', await pg.get_attribute('#pn', 'type') == 'text')
        await pg.click('.pe'); chk('el ojito vuelve a ocultarlo', await pg.get_attribute('#pn', 'type') == 'password')
        await pg.get_by_role('button', name='Siguiente').click(); await pg.wait_for_timeout(400)
        t = await txt(pg); chk('un PIN de 5 números no avanza', '6 números' in t and 'Paso 3' in t)
        await pg.fill('#pn', '12a 34b-56 78'); chk('el PIN solo acepta 6 números (aunque se pegue con espacios)', await pg.input_value('#pn') == '123456')
        await pg.fill('#tl', '0 2477 15 555-001'); await pg.press('#tl', 'Tab'); chk('el teléfono se limpia solo', await pg.input_value('#tl') == '2477555001')
        await pg.get_by_role('button', name='Siguiente').click(); await pg.wait_for_timeout(500)
        chk('el paso 4 se llama "Por si olvidás tu PIN"', 'Por si olvidás tu PIN' in await txt(pg) and 'Paso 4 de 4' in await txt(pg))
        chk('el paso 4 ofrece mail opcional', 'Mail (opcional)' in await pg.content())
        chk('avisa que viene de una invitación', 'alguien que te invitó' in await txt(pg))
        chk('la pregunta se elige de una lista', await pg.locator('select#pq option').count() >= 6)
        await pg.get_by_text('Atrás').first.click(); await pg.wait_for_timeout(400)
        chk('al volver al paso 3 se conservan teléfono y PIN', await pg.input_value('#tl') == '2477555001' and await pg.input_value('#pn') == '123456')
        await pg.get_by_role('button', name='Siguiente').click(); await pg.wait_for_timeout(500)
        await pg.fill('#ml', 'mal'); await pg.check('#ac')
        await pg.get_by_role('button', name='Crear cuenta').click(); await pg.wait_for_timeout(500)
        t = await txt(pg); chk('un mail inválido frena el registro', 'mail no es válido' in t.lower() and 'Paso 4' in t)
        await pg.fill('#ml', 'lucia@mail.com')
        await pg.get_by_role('button', name='Crear cuenta').click(); await pg.wait_for_timeout(500)
        t = await txt(pg); chk('sin elegir pregunta no se crea la cuenta', 'pregunta de seguridad' in t.lower() and 'Paso 4' in t)
        await pg.select_option('#pq', label='¿Cómo se llamaba tu escuela primaria?'); await pg.fill('#pr', 'abc1234'); await pg.get_by_role('button', name='Crear cuenta').click(); await pg.wait_for_timeout(500)
        t = await txt(pg); chk('una respuesta de menos de 8 letras no pasa', '8 letras' in t and 'Paso 4' in t)
        await pg.fill('#pr', 'Escuela Nueve')
        await pg.get_by_text('Atrás').first.click(); await pg.wait_for_timeout(400); await pg.get_by_role('button', name='Siguiente').click(); await pg.wait_for_timeout(500)
        chk('al ir y volver se conservan pregunta, respuesta, mail y términos', await pg.input_value('#pq') != '' and await pg.input_value('#pr') == 'Escuela Nueve' and await pg.input_value('#ml') == 'lucia@mail.com' and await pg.is_checked('#ac'))
        ci0 = await pg.evaluate("fetch('/api/admin/inicio',{headers:{'x-admin-key':'clave'}}).then(r=>r.json())")
        chk('la confirmación por WhatsApp viene apagada por defecto', ci0['tel_on'] == 0)
        await pg.evaluate("fetch('/api/admin/ajuste',{method:'POST',headers:{'x-admin-key':'clave','content-type':'application/json'},body:JSON.stringify({clave:'tel_on',valor:1})})"); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='Crear cuenta').click(); await pg.wait_for_timeout(700)
        chk('se crea la cuenta y ya no muestra ningún código para guardar', 'Guardá tu código' not in await txt(pg))
        await saltar(pg)
        t = await txt(pg); chk('antes de seguir pide confirmar el teléfono', 'Confirmá tu teléfono' in t and '2477555001' in t and 'WhatsApp' in t)
        await pg.fill('#tc', '12'); await pg.get_by_role('button', name='Confirmar').click(); await pg.wait_for_timeout(400)
        chk('un código incompleto no se manda', 'tiene 6 números' in await txt(pg) and 'Confirmá tu teléfono' in await txt(pg))
        ci = await pg.evaluate("fetch('/api/admin/inicio',{headers:{'x-admin-key':'clave'}}).then(r=>r.json())")
        cod = [x for x in ci['telpend'] if x['telefono'] == '2477555001'][0]['codigo']
        await pg.fill('#tc', '999999' if cod != '999999' else '999998'); await pg.get_by_role('button', name='Confirmar').click(); await pg.wait_for_timeout(500)
        chk('un código equivocado avisa y no deja pasar', 'no es correcto' in await txt(pg) and 'Confirmá tu teléfono' in await txt(pg))
        await pg.get_by_role('button', name='Pedir un código nuevo').click(); await pg.wait_for_timeout(500)
        ci = await pg.evaluate("fetch('/api/admin/inicio',{headers:{'x-admin-key':'clave'}}).then(r=>r.json())")
        cod = [x for x in ci['telpend'] if x['telefono'] == '2477555001'][0]['codigo']
        await pg.fill('#tc', cod); await pg.get_by_role('button', name='Confirmar').click(); await pg.wait_for_timeout(900); await saltar(pg)
        t = await txt(pg); chk('con el código bueno sigue al perfil', 'Completá tu perfil' in t and 'Nombre y apellido' in t)
        print('--- Olvidé mi PIN con la pregunta de seguridad')
        await pg.evaluate("auth('rec')"); await pg.wait_for_timeout(300)
        await pg.fill('#tl', '2477555001'); await pg.get_by_role('button', name='Continuar').click(); await pg.wait_for_timeout(500)
        t = await txt(pg); chk('muestra la pregunta que eligió', '¿Cómo se llamaba tu escuela primaria?' in t and 'Tu respuesta' in await pg.content())
        await pg.fill('#ra', 'otra cosa'); await pg.fill('#pn', '654321'); await pg.get_by_role('button', name='Cambiar PIN').click(); await pg.wait_for_timeout(500)
        chk('una respuesta equivocada avisa y sigue en la pantalla', 'no es correcta' in await txt(pg) and '¿Cómo se llamaba tu escuela primaria?' in await txt(pg))
        await pg.fill('#ra', '  ESCUELA nuéve! '); await pg.fill('#pn', '654321'); await pg.get_by_role('button', name='Cambiar PIN').click(); await pg.wait_for_timeout(900); await saltar(pg)
        t = await txt(pg); chk('con la respuesta buena cambia el PIN y entra', 'Confirmá tu teléfono' in t or 'Completá tu perfil' in t)

        print('--- invitaciones y potenciación gratis')
        await entrar(pg, URL, '2477000001')
        chk('entra con una cuenta de prueba', 'Mis pedidos' in await txt(pg))
        await pg.get_by_role('button', name='Perfil').click(); await pg.wait_for_timeout(700)
        t = await txt(pg); chk('el Perfil tiene Invitá y ganá', 'Invitá y ganá una potenciación' in t and '0 de 5 invitados' in t)
        chk('el Perfil ofrece cargar la pregunta de seguridad', 'Pregunta de seguridad' in t and 'Falta cargarla' in t)
        await pg.get_by_text('Invitá y ganá una potenciación').click(); await pg.wait_for_timeout(500)
        t = await txt(pg); chk('el link de invitación se ve', '?r=' in t and 'Copiar link' in t and 'hasta 3' in t)
        await pg.locator('#d_no').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='Mis pedidos').first.click(); await pg.wait_for_timeout(500)
        await abrir_detalles(pg)
        await pg.locator('[data-a="dest"]').first.click(); await pg.wait_for_timeout(500)
        t = await txt(pg); chk('la primera potenciación es gratis', 'Gratis' in t and 'Tu primera potenciación' in t and 'Activar gratis' in t and 'Pedir por WhatsApp' not in t)
        await pg.get_by_role('button', name='Activar gratis').click(); await pg.wait_for_timeout(800)
        chk('se activa al instante', 'Potenciación activada' in await txt(pg))
        await abrir_detalles(pg)
        if await pg.locator('[data-a="dest"]').count():
            await pg.locator('[data-a="dest"]').first.click(); await pg.wait_for_timeout(500)
            t = await txt(pg); chk('la segunda ya no se paga: avisa que no hay potenciaciones', 'no tenés potenciaciones disponibles' in t.lower() and 'Pedir por WhatsApp' not in t and 'Activar gratis' not in t)
            await pg.locator('#d_no').click(); await pg.wait_for_timeout(300)

        print('--- Gestión')
        await gestion(pg, URL)
        chk('Gestión abre con la clave', 'Usuarios' in await txt(pg))
        for tab in ['Usuarios', 'Trabajadores', 'Clientes']:
            if await pg.get_by_role('button', name=tab, exact=True).count():
                await pg.get_by_role('button', name=tab, exact=True).click(); await pg.wait_for_timeout(600)
        chk('las listas de usuarios se dibujan', 'Cambiar PIN' in await txt(pg))
        await pg.get_by_role('button', name='Potenciaciones', exact=True).click(); await pg.wait_for_timeout(800)
        chk('Gestión tiene Primera potenciación gratis y ya no tiene precios ni promo', 'Primera potenciación gratis' in await txt(pg) and 'Promo hasta' not in await txt(pg) and 'Precio del destacado' not in await txt(pg))
        await pg.get_by_text('Primera potenciación gratis').locator('xpath=following-sibling::button').click(); await pg.wait_for_timeout(700)
        t = await txt(pg); i = t.find('Primera potenciación gratis'); chk('se apaga la primera gratis', 'Apagada' in t[i:i + 90])

        print('--- errores de la app')
        await pg.evaluate("window.dispatchEvent(new ErrorEvent('error',{message:'prueba de error de pantalla',filename:'app.js',lineno:7}))")
        await pg.wait_for_timeout(400)
        await gestion(pg, URL)
        await pg.get_by_role('button', name='Ajustes y logs').click(); await pg.wait_for_timeout(800)
        t = await txt(pg); chk('Gestión muestra los errores de la app', 'Errores de la app' in t and 'prueba de error de pantalla' in t)
        await pg.get_by_role('button', name='Borrar errores').click(); await pg.wait_for_timeout(800)
        chk('se pueden borrar', 'Sin errores registrados' in await txt(pg))

        print('--- eliminar cuenta')
        await entrar(pg, URL, '2477000001')
        await pg.get_by_role('button', name='Perfil').click(); await pg.wait_for_timeout(700)
        await pg.get_by_text('Eliminar mi cuenta').click(); await pg.wait_for_timeout(500)
        chk('pide el PIN y avisa que no se deshace', 'No se puede deshacer' in await txt(pg))
        await pg.fill('#d_pin', '999999'); await pg.get_by_role('button', name='Eliminar para siempre').click(); await pg.wait_for_timeout(700)
        chk('con un PIN incorrecto no se elimina y el mensaje queda en el diálogo', 'PIN no es correcto' in await txt(pg) and await pg.locator('#d_pin').count() == 1)
        await pg.fill('#d_pin', '123456'); await pg.get_by_role('button', name='Eliminar para siempre').click(); await pg.wait_for_timeout(1000)
        chk('con el PIN correcto vuelve a la portada', 'Crear cuenta gratis' in await txt(pg))
        await pg.get_by_text('Ya tengo cuenta').click(); await pg.wait_for_timeout(300)
        await pg.fill('#tl', '2477000001'); await pg.fill('#pn', '123456')
        await pg.get_by_role('button', name='Ingresar').click(); await pg.wait_for_timeout(700)
        chk('esa cuenta ya no entra', 'incorrectos' in await txt(pg))

        chk('sin errores de JavaScript en toda la corrida', not errs)
        if errs: print('   ', errs[:3])
        await b.close()
    srv.shutdown()
    print('\n%d fallas' % len(FALLAS) if FALLAS else '\nTodo OK')
    sys.exit(1 if FALLAS else 0)

asyncio.run(main())
