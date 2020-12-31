/*  Service Worker by DrSnuggles
  https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker
  https://developers.google.com/web/fundamentals/primers/service-workers/high-performance-loading
  https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

  Complete different type of service worker approach
  This is more reading from a packed zip then from single files
  And it does not cache

*/

//
// vars
//
const staticCacheName = 'Xmas20'
const filesToCache = []
const blacklist = []
let zip = [] // variables keep their value
let useDir = true // use ZIP Directory or zipped file

//
// UZIP decompressor packed
//
for(_='_copyOut\\++/_bits@32768Br.D=nQre^t^e``,j5,q);~ode$makeC$s#inflateHUZIP.GGF.K},KJ,2Ne[M){Y<<X>>>W^turnVYV(MrW3]|M1+(rW3)]X8|M2+(rW3)]X16)W(7&r)`:[],if(]=var ;v.,afunction=0;new :e((Df(e,+=mapc&&(r=K_check(r,b+r[br[b/-z]Uint8Array0,	Gbin.^ad.length,1),r~rfor((o~arUZIP={};Gparse=Yt=Ushort,n=Uint=	f={},o=(ei=o-4;101010256!Q(o,i~)i--a=i;a44d=t2;t2UQ4vQ4=v;cc<d;c/Yn4444;n4UQ4lQ4u=t(oI=t(o+2P=t(o+4~a68ZQ4u+I+P,G_^adLocal(o,Z,f,U,l,r)}V f},G_^adLocal=,t,n,fYo=Ushort,i=Uint;i4;o2;o2d=o2;i4;i4,r8U=o2v=o2c=UTF8r,U~rU,rv,f)V void(t[c{size:a,csize:n})l=(e.buffer,r~0==d)t[c(l.buffeDslice(r,r+n)~else{8!=d)throw"unknown comp^ssion method: "+du=(a~GHRaw(l,ut[cu}},GHRaw=YV KHr)},Gbin={^adUshort:YV Mr]|Mr+1]X8},^adUint:YV 16777216*Mr+3]+(Mr+2]X16|Mr+1]X8|Mr])},pad:(eYV e<2?"0"+e:e},^adUTF8:,tYn="",ff<t;f/)a"%"+Gbin.pad(Mr+f].toString(16)~try{n=dec$URIComponent(a)}catch(nYV ASCIIr,t)}V n}},GF={JH=Yt=;3==M0]&&0==M1])V r||t(0)n=GFQ.@F,fQ.@E,oQ._dec$Tiny,iQ.#,dQ.c$s2,UQ._get17,vQ.U,cQull==r;c&&(r=t(eW2X3)~l,u,I=	P=	Z=	s=	F=	p=	w=	b=	m0==I;)I=amP=am+1Nm3,0!=PY(1X17))1==P&&(l=fl,u=fd,p=511,w=312==PYZ=fm,5)+257,s=fm+q5)+1,F=fm+1	4)+4,m14;__<38;_2)it^M_	it^M_+1]h=1,__<F;_/Yy=fm+3*_,3~it^M1+(ordr[_]X1)y,y>h&&(h=y)}m3*F,i(ijhd(ijh,il=l,u=d,m=o(i,(1Xh)-1,Z+s,e,m,t`)gQ.\\(tj	Z,l`~p=(1Xg)-1kQ.\\(tjZ,s,d`~w=(1Xk)-1,i(ljgd(ljg,li(djkd(djk,u)};;YC=l[Um)&p];m15&CA=CW4;AW8==0)r[b/A;else{256==A)b^akx=b+A-254;A>264YO=ldef[A-257];x=b+(OW3)+fm,7&Om7&O}T=u[Um)&w];m15&TE=TW4,R=ddef[E],z=(RW4)+am5&R~m15&R,(1X17))~b<x;),,,;b=x}}}else{0!=(7&m)&&(m8-(7&m))L=4+(mW3S=ML-4]|ML-3]X8;S)Dset(t(e.buffer,e.byteOffset+L,Sbm=L+SX3,bS}V r==b?r:Dslice(	b)J_dec$Tiny=,t,n,fYo=K@E,i=K_get17,dd<t;YU=Mi(n)&r];a15&Uv=UW4;v<=15)f[dv,d/;else{c=	l16==v?(l=3+o(nNa2,c=f[d-1]):17==v?(l=3+o(n,3a3):18==v&&(l=11+o(n,7a7~u=d+l;d<u;)f[dc,d/}}V aJ\\=,t,nYa=	f=	oQW1;f<t;Yi=Mf+r];n[fX1	n[1+(fX1)i,i>a&&(a=if/};f<o;)n[fX1	n[1+(fX1)	f/;V aJ#=Yt,n,f,o,i=KU,d=e,U=i.bl_count,ff<=r;f/)U[f]f=1;f<d;f2)U[Mf]]/v=i.next_c$;t=	U[0	n=1;n<=r;n/)t=t+U[n-1]X1,v[nt;aa<d;a2)0!=(o=Ma+1])&&(Mav[o],v[o]/)Jc$s2=,tYn=e=KU,f=a.^v1qoo<n;o2)0!=Mo+1])i=o>>1,d=Mo+1],U=iX4|d,v=r-d,c=Mo]Xv,l=c+(1Xv~c!=l;Yu=f[c]W15-r;t[uU,c/}J^vC$s=Yt=KU.^v1qn=15-ra<e;a2Yf=Ma]Xr-Ma+1];Mat[f]Wn}J@E=,t)W(7&r)&(1Xt)-1J@F=,t&(1Xt)-1J_get17=JU=(Ye=Uint16Array,r=Uint32Array;V{next_c$16bl_count16ordr:[1678,	8,7,9,6	51,42,33N45],of0:[3,4,q6,7,8,9013579N3N7,31,3q43,51,59,67,83,9915316395N27N58,999,999,999],exb:[							0NNNN,3,3,3,3,4,4,4,4,qqqq			0],ldef32df0:[1N,3,4,q7,937Nq33,49,6q972993N57,38q513,769025537N049,3073,4097,614q819322896385N4577,6553q65535],dxb:[			0NN,3,3,4,4,qq6,6,7,7,8,8,9,900112233,	0],ddef:r(32fl512flfd32fdlBltdBdi512i^v15Blhst:r(286dhst:r(30ihst:r(19lits:r(15e3strt65536p^vB)}}((Y er,tY;0!=r--;)e.push(	t)}r=KU,tt<B;t/Yn=t;n=(2863311530&n)W1|(1431655765&n)X1,n=(3435973836&n)W2|(858993459&n)X2,n=(4042322160&n)W4|(252645135&n)X4,n=(4278255360&n)W8|(16711935&n)X8,D^v15[t(nW16|nX16)W17}tt<32;t/)Dldef[tDof0[t]X3|Dexb[t],Dddef[tDdf0[t]X4|Ddxb[t];el`44,8el`12,9el`N4,7elj8,8K#lj9Kc$s2lj9,DflK^vC$slj9edj32,5K#dj5Kc$s2djqDfdK^vC$sdj5e(Di`9,0e(Dl`N86,0e(Ddj3	0e(Dtj32	0)}(~';G=/[-V-YMNJKGH#$~qj`^QDB@/\\]/.exec(_);)with(_.split(G))_=join(shift());eval(_)

//
// load pack.zip
//
function loadPack() {
  let cnt = Object.keys(zip).length
  //console.log('loadPack', cnt)

  // dont double fetch
  if (cnt > 0) return
  zip = {a:[]}

  fetch('pack.zip')
  .then(res => res.arrayBuffer())
  .then(buf => UZIP.parse(buf))
  .then(z => {
    zip = z
    console.log('Pack loaded')
    return true
  })
  .catch(e => console.error('Error while loading pack.zip', e))
}
function ab2str(buf) {
  //return String.fromCharCode.apply(null, new Uint8Array(buf))
  return new TextDecoder('utf-8').decode(buf)
}

//
// install
//
self.addEventListener('install', event => {
  console.log('Attempting to install service worker and cache static assets')
  loadPack()
  return true
})

//
// activate
//
self.addEventListener('activate', event => {
  console.log('Activating new service worker...')
  loadPack()
  return true
})

//
// message
//
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/message_event
self.addEventListener('message', event => {
  let j = event.data
  loadPack()

  switch (j.type) {
    case 'msg':
      event.source.postMessage({type:'msg', txt:'Hi client'})
      break
    case 'init': // send typical files during startup
      event.source.postMessage({type:'init', a:ab2str(zip['js/app.js']), b:ab2str(zip['js/b-min.js']), c:ab2str(zip['css/style.css']), d:ab2str(zip['index.html'])})
      break
    case 'getFile': // why not simply fetch
      break
    default:
      console.error(`Client sent unknown message type: ${j.type}`)
  }

})

//
// fetch = access zip
//

// https://samdutton.github.io/samples/service-worker/prefetch-video/
// ^^ ToDo: mp3/mp4 files are cached different. range...
// all from cache, not found in cache then online. if not online....
self.addEventListener('fetch', event => {
  if (!event.request.referrer) return
  let url = event.request.url.replace(event.request.referrer, '')
  //console.log('Fetch event for', url)

  // the first time this is called via loader.js which is not is ZIP but loads it
  if (url === 'loader.js') {
    loadPack()
    return
  }

  let file = zip[url]
  let ext = url.split('.')
  ext = ext[ext.length-1].toLowerCase()
  //console.log(file, ext)
  if (['html', 'js', 'svg'].includes(ext)) {
    // convert to string
    file = ab2str(file)
    let res = new Response(file)
    event.respondWith(res)
    return
  } else if (['mod', 'woff2'].includes(ext)) {
    // keep arraybuffer
    let res = new Response(file)
    event.respondWith(res)
    return
  }

  console.log('Still here', url)
  return

})
