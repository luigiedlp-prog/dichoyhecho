#!/usr/bin/env python3
"""Pantallas del registro en 3 pasos, pantalla de notificaciones, aviso de rubro y cambio de rol (Chromium en tamaño celular).
Uso: python3 tools/probar-registro.py   (pide: pip install playwright && playwright install chromium)
Capturas en /tmp/shots. Termina con código 1 si algo falla."""
import asyncio, os, subprocess, sys, tempfile, threading, functools, http.server
from playwright.async_api import async_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FALLAS = []
def chk(n, c):
    print(('OK   ' if c else 'FAIL ') + n)
    if not c: FALLAS.append(n)
async def txt(pg): return await pg.inner_text('body')

async def main():
    d = tempfile.mkdtemp(); os.makedirs('/tmp/shots', exist_ok=True)
    subprocess.check_call([sys.executable, os.path.join(RAIZ, 'tools/prueba/armar.py'), os.path.join(d, 'index.html')])
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=d))
    srv.RequestHandlerClass.log_message = lambda *a: None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    URL = 'http://127.0.0.1:%d/index.html' % srv.server_port
    async with async_playwright() as p:
        b = await p.chromium.launch()
        c = await b.new_context(viewport={'width': 390, 'height': 844})
        # Chromium headless trae el permiso en "denied": se simula uno sin decidir, y se espía quién pide el permiso y cuándo
        await c.add_init_script("""Object.defineProperty(Notification,'permission',{get:()=>window.__perm||'default'});
        Notification.requestPermission=async()=>{window.__asked=(window.__asked||0)+1;window.__perm='denied';return 'denied'};""")
        pg = await c.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(700)
        await pg.get_by_text('Crear cuenta gratis').click(); await pg.wait_for_timeout(300)

        print('--- paso 1')
        chk('arranca sin nada seleccionado', await pg.locator('.rol.on').count() == 0)
        chk('Continuar está deshabilitado', await pg.is_disabled('#rnx'))
        t = await txt(pg)
        chk('dice Paso 1 de 3', 'Paso 1 de 3' in t)
        chk('frases de las tarjetas', 'Publicás un pedido y recibís propuestas' in t and 'Te postulás a trabajos cerca tuyo' in t and 'Necesito contratar a alguien' in t and 'Soy trabajador y quiero conseguir pedidos' in t)
        await pg.screenshot(path='/tmp/shots/1-paso1.png')
        await pg.click('.rol.trabajador'); await pg.wait_for_timeout(200)
        chk('tocar una tarjeta la marca y habilita Continuar', await pg.locator('.rol.trabajador.on').count() == 1 and not await pg.is_disabled('#rnx'))
        await pg.screenshot(path='/tmp/shots/1b-elegido.png')
        await pg.click('#rnx'); await pg.wait_for_timeout(300)

        print('--- paso 2 (trabajador)')
        t = await txt(pg)
        chk('dice Paso 2 de 3 y el recordatorio de rol', 'Paso 2 de 3' in t and 'Te registrás como: Trabajador' in t)
        chk('pide a qué se dedica con chips y Otros al final', 'A qué te dedicás' in t and await pg.locator('.rrubs label').count() >= 5 and (await pg.locator('.rrubs label').last.inner_text()).strip().endswith('Otros'))
        chk('el campo de Otros arranca oculto', not await pg.is_visible('#rro'))
        await pg.fill('#n', 'Pablo Pintor'); await pg.fill('#tl', '2477 412345')
        await pg.click('#rst .btn.full'); await pg.wait_for_timeout(300)
        chk('sin rubro no avanza', 'Elegí a qué te dedicás' in await txt(pg) and 'Paso 2 de 3' in await txt(pg))
        await pg.locator('.rrubs label', has_text='Otros').click(); await pg.wait_for_timeout(200)
        chk('al elegir Otros aparece el campo', await pg.is_visible('#rro'))
        await pg.screenshot(path='/tmp/shots/2-paso2-otros.png')
        await pg.click('#rst .btn.full'); await pg.wait_for_timeout(300)
        chk('Otros sin texto no avanza', 'Escribí a qué te dedicás' in await txt(pg) and 'Paso 2 de 3' in await txt(pg))
        await pg.fill('#rro', 'Reparación de bicicletas')
        await pg.click('#rst .btn.full'); await pg.wait_for_timeout(300)

        print('--- paso 3 y navegación')
        t = await txt(pg)
        chk('dice Paso 3 de 3 y el botón final trae el rol', 'Paso 3 de 3' in t and 'Crear cuenta de trabajador' in t)
        await pg.screenshot(path='/tmp/shots/3-paso3.png')
        await pg.fill('#pn', '123456')
        await pg.get_by_text('Atrás').first.click(); await pg.wait_for_timeout(300)
        chk('Atrás conserva los datos (nombre, teléfono, rubro y texto de Otros)', await pg.input_value('#n') == 'Pablo Pintor' and '412345' in await pg.input_value('#tl') and await pg.input_value('#rro') == 'Reparación de bicicletas')
        await pg.get_by_text('Cambiar').first.click(); await pg.wait_for_timeout(300)
        chk('Cambiar vuelve al paso 1 con el rol marcado', 'Paso 1 de 3' in await txt(pg) and await pg.locator('.rol.trabajador.on').count() == 1)
        await pg.click('.rol.cliente'); await pg.click('#rnx'); await pg.wait_for_timeout(300)
        chk('como cliente no se pide rubro y se conservan los datos', await pg.locator('.rrubs').count() == 0 and await pg.input_value('#n') == 'Pablo Pintor')
        await pg.fill('#n', 'Carla Cliente'); await pg.fill('#tl', '2477 555001')
        await pg.click('#rst .btn.full'); await pg.wait_for_timeout(300)
        chk('el botón final de cliente dice Crear cuenta para pedir trabajos', 'Crear cuenta para pedir trabajos' in await txt(pg))
        await pg.fill('#pn', '123456'); await pg.select_option('#pq', index=1); await pg.fill('#pr', 'Escuela Nueve'); await pg.check('#ac')
        await pg.get_by_role('button', name='Crear cuenta para pedir trabajos').click(); await pg.wait_for_timeout(1200)

        print('--- notificaciones')
        t = await txt(pg)
        chk('pantalla final con el botón de activar', 'Activá las notificaciones para enterarte de pedidos y propuestas' in t and 'Ahora no' in t)
        await pg.screenshot(path='/tmp/shots/4-notif.png')
        chk('al cargar no se pidió el permiso solo', not await pg.evaluate("window.__asked||0"))
        await pg.get_by_text('Ahora no').click(); await pg.wait_for_timeout(600)
        chk('"Ahora no" lo posterga y sigue', await pg.evaluate("!!localStorage.getItem('xnt')"))
        for _ in range(4):
            if await pg.get_by_text('Saltar').count():
                await pg.get_by_text('Saltar').first.click(); await pg.wait_for_timeout(300)
        chk('postergado no muestra la franja', not await pg.is_visible('#ntf'))
        await pg.evaluate("localStorage.removeItem('xnt'); me.push_n=0; avisoApp()"); await pg.wait_for_timeout(200)
        chk('sin postergar y sin activar, la franja aparece', await pg.is_visible('#ntf') and 'Activá las notificaciones' in await pg.inner_text('#ntf'))
        await pg.screenshot(path='/tmp/shots/5-franja-notif.png')
        await pg.click('#ntf .ntf-x'); await pg.wait_for_timeout(200)
        chk('la × la cierra', not await pg.is_visible('#ntf'))

        await pg.evaluate("localStorage.removeItem('xnt'); window.__perm='default'; notifPaso()"); await pg.wait_for_timeout(300)
        await pg.get_by_text('Activá las notificaciones para enterarte').click(); await pg.wait_for_timeout(600)
        chk('el permiso se pide con el toque del botón', await pg.evaluate("window.__asked") == 1)
        await pg.evaluate("me.push_n=0; avisoApp()")
        chk('bloqueado: la franja no vuelve a pedirlo', not await pg.is_visible('#ntf'))
        for _ in range(4):
            if await pg.get_by_text('Saltar').count():
                await pg.get_by_text('Saltar').first.click(); await pg.wait_for_timeout(300)

        print('--- cambio de rol desde el perfil')
        await pg.evaluate("tab='perfil'; home()"); await pg.wait_for_timeout(500)
        chk('el perfil ofrece cambiar de rol', 'Cambiar mi rol' in await txt(pg) and 'Pasar a trabajador' in await txt(pg))
        await pg.get_by_text('Cambiar mi rol').click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/shots/6-dialogo-rol.png')
        await pg.select_option('#d_ru', 'Pintura'); await pg.fill('#d_pin', '000000')
        await pg.get_by_role('button', name='Pasar a trabajador', exact=True).click(); await pg.wait_for_timeout(500)
        chk('con PIN incorrecto no cambia y avisa', 'PIN no es correcto' in await txt(pg) and await pg.evaluate("me.tipo") == 'cliente')
        await pg.fill('#d_pin', '123456')
        await pg.get_by_role('button', name='Pasar a trabajador', exact=True).click(); await pg.wait_for_timeout(900)
        chk('con el PIN correcto pasa a trabajador', await pg.evaluate("me.tipo") == 'trabajador' and 'Pasar a cliente' in await txt(pg))

        print('--- aviso de rubro (Otros sin especificar)')
        await pg.evaluate("me.rubros='[\"Otros\"]'; me.rubro_otro=''; avisoApp()"); await pg.wait_for_timeout(200)
        chk('aparece "Elegí tu rubro"', await pg.is_visible('#ntf') and 'Elegí tu rubro' in await pg.inner_text('#ntf'))
        await pg.screenshot(path='/tmp/shots/7-franja-rubro.png')
        await pg.click('#ntf [data-a=rubroaviso]'); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='Guardar').click(); await pg.wait_for_timeout(300)
        chk('sin elegir rubro no guarda', 'Elegí tu rubro' in await txt(pg))
        await pg.select_option('#d_ru', 'Plomería')
        await pg.get_by_role('button', name='Guardar').click(); await pg.wait_for_timeout(900)
        chk('guarda el rubro elegido (conserva los que ya tenía)', 'Plomería' in await pg.evaluate("me.rubros"))
        chk('y la franja desaparece', not await pg.is_visible('#ntf'))
        chk('sin errores de JS', not errs)
        if errs: print(errs)
        await b.close()
    srv.shutdown()
    print('\n%s' % ('%d FALLAS' % len(FALLAS) if FALLAS else 'Todo bien')); sys.exit(1 if FALLAS else 0)
asyncio.run(main())
