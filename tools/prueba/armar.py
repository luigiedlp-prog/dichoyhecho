# Arma dichoyhecho-prueba.html: la app real + un servidor simulado (mock.js) en un solo archivo, para probar sin subir nada.
# Uso:  python3 tools/prueba/armar.py [salida.html]
import base64,json,re,sys,os
Q=os.path.dirname(os.path.abspath(__file__))  # tools/prueba
ROOT=os.path.abspath(os.path.join(Q,'..','..'))  # raíz del proyecto
OUT=sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'..','dichoyhecho-prueba.html')
R=os.path.join(ROOT,'public')+os.sep
rd=lambda p:open(p,encoding='utf-8').read()
d=lambda f:'data:image/png;base64,'+base64.b64encode(open(R+f,'rb').read()).decode()
ix=rd(R+'index.html')
ix=re.sub(r'<link rel="(manifest|apple-touch-icon|preload)"[^>]*>','',ix)
# la página de prueba es un solo archivo: los scripts chicos van adentro
ix=ix.replace('<script src="tema.js"></script>','<script>'+rd(R+'tema.js')+'</script>')
fnt=lambda s:re.sub(r'url\(fonts/([\w-]+\.woff)\)',lambda m:'url(data:font/woff;base64,'+base64.b64encode(open(R+'fonts/'+m.group(1),'rb').read()).decode()+')',s)
ix=ix.replace('<link rel="icon" href="favicon.png">','<link rel="icon" href="'+d('favicon.png')+'">')
ix=ix.replace('<link rel="stylesheet" href="app.css">','<style>'+fnt(rd(R+'app.css'))+'</style>')
aj=R+'ajustes-visuales.css'
ix=ix.replace('<link rel="stylesheet" href="ajustes-visuales.css">','<style id="ajustes-visuales">'+(rd(aj) if os.path.exists(aj) else '')+'</style>')
ix=ix.replace('<link rel="stylesheet" href="responsive.css">','<style id="responsive">'+rd(R+'responsive.css')+'</style>')
ix=ix.replace('<link rel="stylesheet" href="escritorio.css">','<style id="escritorio">'+rd(R+'escritorio.css')+'</style>')
ix=ix.replace('<img src="favicon.png"','<img src="'+d('favicon.png')+'"')
ix=ix.replace('<img src="icon-192.png"','<img src="'+d('icon-192.png')+'"')
app_files=re.findall(r'<script src="(app/[^"]+)"></script>',ix)  # mismo orden que index.html
assert app_files,'index.html no carga app/*.js'
app='\n'.join(rd(R+f) for f in app_files)
# la página de prueba no registra el service worker (no anda desde file://); tolera que el código esté formateado
sw=re.compile(r"if\s*\(\s*'serviceWorker' in navigator\s*\)\s*navigator\.serviceWorker\.register\('sw\.js'\)\.catch\(\(\)\s*=>\s*\{\s*\}\);")
assert sw.search(app),'no encontré el registro del service worker en app.js'; app=sw.sub('',app,count=1)
app=app.replace('src="favicon.png"','src="'+d('favicon.png')+'"')
dw=lambda f:'data:image/webp;base64,'+base64.b64encode(open(R+f,'rb').read()).decode()
for f in ('img/hero-iglesia.webp','img/trabajador.webp'): app=app.replace(f,dw(f))
assert 'icon-192.png' in app; app=app.replace('icon-192.png',d('icon-192.png'))
scripts=rd(R+'config.js')
lh=rd(R+'legal.html')
for f in ('legal-tema.js','legal.js'):lh=lh.replace('<script src="'+f+'"></script>','<script>'+rd(R+f)+'</script>')
leg=json.dumps(fnt(lh)).replace('</','<\\/')
js='<script>'+rd(R+'config.js')+'</script><script>'+rd(R+'datos.js')+'</script><script>'+rd(R+'qr.js')+'</script><script>'+rd(R+'reglas.js')+'</script><script>window.__LEGAL__='+leg+'</script><script>'+rd(os.path.join(Q,'mock.js'))+'</script><script>'+app+'</script>'
tag='<script src="config.js"></script><script src="datos.js"></script><script src="qr.js"></script><script src="reglas.js"></script>'+''.join('<script src="%s"></script>'%f for f in app_files)
assert tag in ix; ix=ix.replace(tag,js)
ix=ix.replace('<title>','<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap"><title>Prueba · ',1)
open(OUT,'w',encoding='utf-8').write(ix)
print(len(ix)//1024,'KB')
