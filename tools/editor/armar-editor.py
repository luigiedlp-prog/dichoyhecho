# Arma dichoyhecho-editor.html: la app real (la misma de la página de prueba) + el editor visual, en un solo archivo.
# Uso:  python3 tools/editor/armar-editor.py [salida.html]
# Los cambios que hagas se descargan como ajustes-visuales.css y van en public/.
import base64,json,os,re,subprocess,sys,tempfile
Q=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(Q,'..','..'))
OUT=sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'..','dichoyhecho-editor.html')
tmp=tempfile.mktemp(suffix='.html')
subprocess.check_call([sys.executable,os.path.join(ROOT,'tools','prueba','armar.py'),tmp])
app=open(tmp,encoding='utf-8').read();os.remove(tmp)
app=re.sub(r'<style id="ajustes-visuales">.*?</style>','',app,flags=re.S)  # el editor aplica los ajustes por su cuenta
aj=os.path.join(ROOT,'public','ajustes-visuales.css')
prev=open(aj,encoding='utf-8').read() if os.path.exists(aj) else ''
tpl=open(os.path.join(Q,'editor.template.html'),encoding='utf-8').read()
out=tpl.replace('__APP__',base64.b64encode(app.encode('utf-8')).decode()).replace('__PREV__',json.dumps(prev).replace('</','<\\/'))
open(OUT,'w',encoding='utf-8').write(out)
print(len(out)//1024,'KB')
