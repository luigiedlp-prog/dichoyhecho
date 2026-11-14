// Generador de QR propio (JS puro, sin librerías). Modo byte, corrección M, versiones 1 a 6 (hasta 106 caracteres).
(function(g){
const GE=new Array(512),GL=new Array(256);let x=1;
for(let i=0;i<255;i++){GE[i]=x;GL[x]=i;x<<=1;if(x&256)x^=285}
for(let i=255;i<512;i++)GE[i]=GE[i-255];
const mul=(a,b)=>a&&b?GE[GL[a]+GL[b]]:0;
function rs(data,n){let p=[1];for(let i=0;i<n;i++){const t=new Array(p.length+1).fill(0);for(let j=0;j<p.length;j++){t[j]^=p[j];t[j+1]^=mul(p[j],GE[i])}p=t}
  const r=new Array(n).fill(0);for(const d of data){const f=d^r.shift();r.push(0);for(let j=0;j<n;j++)r[j]^=mul(p[j+1],f)}return r}
const T=[[1,16,10],[1,28,16],[1,44,26],[2,32,18],[2,43,24],[4,27,16]]; // bloques, datos por bloque, corrección por bloque
const AL=[[],[6,18],[6,22],[6,26],[6,30],[6,34]];
function QR(texto){
  const by=[...new TextEncoder().encode(texto)];let v=0;
  while(v<6&&T[v][0]*T[v][1]*8<12+8*by.length)v++;
  if(v>=6)throw new Error('Texto muy largo para el QR');
  const [nb,dc,ec]=T[v],size=21+4*v,bits=[];
  const put=(val,n)=>{for(let i=n-1;i>=0;i--)bits.push((val>>i)&1)};
  put(4,4);put(by.length,8);by.forEach(b=>put(b,8));
  const cap=nb*dc*8;for(let i=0;i<4&&bits.length<cap;i++)bits.push(0);
  while(bits.length%8)bits.push(0);
  for(let pd=0xEC;bits.length<cap;pd^=0xEC^0x11)put(pd,8);
  const cw=[];for(let i=0;i<bits.length;i+=8)cw.push(parseInt(bits.slice(i,i+8).join(''),2));
  const dat=[],ecs=[];
  for(let b=0;b<nb;b++){const d=cw.slice(b*dc,(b+1)*dc);dat.push(d);ecs.push(rs(d,ec))}
  const fin=[];for(let i=0;i<dc;i++)dat.forEach(d=>fin.push(d[i]));for(let i=0;i<ec;i++)ecs.forEach(e=>fin.push(e[i]));
  const fb=[];fin.forEach(c=>put2(c));function put2(c){for(let i=7;i>=0;i--)fb.push((c>>i)&1)}
  const m=[],fn=[];for(let i=0;i<size;i++){m.push(new Array(size).fill(0));fn.push(new Array(size).fill(0))}
  const sf=(x,y,val)=>{if(x>=0&&y>=0&&x<size&&y<size){m[y][x]=val?1:0;fn[y][x]=1}};
  for(let i=0;i<size;i++){sf(6,i,i%2===0);sf(i,6,i%2===0)}
  [[3,3],[size-4,3],[3,size-4]].forEach(([cx,cy])=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy));sf(cx+dx,cy+dy,d!==2&&d!==4)}});
  const a=AL[v];a.forEach((cy,i)=>a.forEach((cx,j)=>{if((i===0&&j===0)||(i===0&&j===a.length-1)||(i===a.length-1&&j===0))return;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)sf(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}));
  const fmt=mk=>{let r=mk;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=((mk<<10)|r)^0x5412,gb=i=>(b>>>i)&1;
    for(let i=0;i<=5;i++)sf(8,i,gb(i));sf(8,7,gb(6));sf(8,8,gb(7));sf(7,8,gb(8));for(let i=9;i<15;i++)sf(14-i,8,gb(i));
    for(let i=0;i<8;i++)sf(size-1-i,8,gb(i));for(let i=8;i<15;i++)sf(8,size-15+i,gb(i));sf(8,size-8,1)};
  fmt(0);
  let i=0,up=true;
  for(let c=size-1;c>0;c-=2){if(c===6)c--;for(let k=0;k<size;k++){const r=up?size-1-k:k;for(let d=0;d<2;d++){const cc=c-d;if(!fn[r][cc])m[r][cc]=i<fb.length?fb[i++]:0}}up=!up}
  const MK=[(r,c)=>(r+c)%2===0,(r,c)=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,(r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,(r,c)=>(r*c)%2+(r*c)%3===0,(r,c)=>((r*c)%2+(r*c)%3)%2===0,(r,c)=>((r+c)%2+(r*c)%3)%2===0];
  const pen=q=>{let p=0;const n=size;
    for(let t=0;t<2;t++)for(let a=0;a<n;a++){let run=1;for(let b=1;b<n;b++){const x1=t?q[b][a]:q[a][b],x0=t?q[b-1][a]:q[a][b-1];if(x1===x0){run++;if(run===5)p+=3;else if(run>5)p++}else run=1}}
    for(let r=0;r<n-1;r++)for(let c=0;c<n-1;c++){const s=q[r][c];if(s===q[r][c+1]&&s===q[r+1][c]&&s===q[r+1][c+1])p+=3}
    const pt=[1,0,1,1,1,0,1,0,0,0,0],pr=[...pt].reverse();
    for(let t=0;t<2;t++)for(let a=0;a<n;a++)for(let b=0;b<=n-11;b++){let h1=1,h2=1;for(let k=0;k<11;k++){const x=t?q[b+k][a]:q[a][b+k];if(x!==pt[k])h1=0;if(x!==pr[k])h2=0}if(h1||h2)p+=40}
    let d=0;q.forEach(r=>r.forEach(x=>d+=x));p+=Math.floor(Math.abs(d*20-n*n*10)/(n*n))*10;return p};
  let best=null,bp=1e9;
  for(let k=0;k<8;k++){const q=m.map(r=>r.slice());for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(!fn[r][c]&&MK[k](r,c))q[r][c]^=1;
    // el formato depende de la máscara: se vuelve a escribir sobre la copia
    const save=[m,fn];const mm=q,ff=fn;
    const sf2=(x,y,val)=>{mm[y][x]=val?1:0};
    let r2=k;for(let j=0;j<10;j++)r2=(r2<<1)^((r2>>>9)*0x537);const b=((k<<10)|r2)^0x5412,gb=j=>(b>>>j)&1;
    for(let j=0;j<=5;j++)sf2(8,j,gb(j));sf2(8,7,gb(6));sf2(8,8,gb(7));sf2(7,8,gb(8));for(let j=9;j<15;j++)sf2(14-j,8,gb(j));
    for(let j=0;j<8;j++)sf2(size-1-j,8,gb(j));for(let j=8;j<15;j++)sf2(8,size-15+j,gb(j));sf2(8,size-8,1);
    const p=pen(q);if(p<bp){bp=p;best=q}}
  return best;
}
// SVG listo para mostrar o imprimir (borde de 4 módulos)
function QRSVG(texto,px){const q=QR(texto),n=q.length+8;let d='';q.forEach((r,y)=>r.forEach((v,x)=>{if(v)d+='M'+(x+4)+' '+(y+4)+'h1v1h-1z'}));
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+n+' '+n+'" width="'+(px||240)+'" height="'+(px||240)+'" shape-rendering="crispEdges"><rect width="'+n+'" height="'+n+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>'}
g.QR=QR;g.QRSVG=QRSVG;
if(typeof module!=='undefined')module.exports={QR,QRSVG};
})(typeof window!=='undefined'?window:globalThis);
