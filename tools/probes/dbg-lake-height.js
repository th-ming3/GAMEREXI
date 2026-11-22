const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',args:['--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--use-angle=swiftshader'],defaultViewport:{width:900,height:600}});
 const p=await b.newPage();await p.goto('file:///home/user/game.html',{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,7000));
 console.log(JSON.stringify(await p.evaluate(()=>{
  const V=THREE.Vector3,L=window.__lakeInfo,w=window.__garden.localToWorld(new V(L.x,0,L.z)),sf=window.__lakeSurf.position,near=[];
  window.__garden.children.forEach(g=>{if(g.userData&&g.userData.cx!==undefined){g.children.slice(0,1).forEach(o=>{if(!o.geometry)return;const a=o.geometry.attributes.position;let best=1e9,by=0,bx=0,bz=0;for(let i=0;i<a.count;i++){let d=(a.getX(i)-L.x)**2+(a.getZ(i)-L.z)**2;if(d<best){best=d;bx=a.getX(i);bz=a.getZ(i);by=a.getY(i)}}if(best<25)near.push({chunk:[g.userData.cx,g.userData.cz],p:[bx,bz,by],d:+Math.sqrt(best).toFixed(2)})})}});
  return {lake:L,rootRot:window.__garden.rotation.y,waterLocal:[sf.x,sf.y,sf.z],waterWorld:window.__lakeSurf.getWorldPosition(new V()).toArray(),hLocal:window.__hillY(L.x,L.z),hWorld:window.__hillY(w.x,w.z),centerW:w.toArray(),near};
 }),null,2)); await b.close();
})();
