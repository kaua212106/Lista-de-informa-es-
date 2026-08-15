const CACHE_NAME="minha-biblioteca-v4";
const SHELL=["./","./index.html","./manifest.json","./icone.png"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)))
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(req.mode==="navigate"){
    event.respondWith(fetch(req,{cache:"no-store"}).then(res=>{
      const copy=res.clone();
      caches.open(CACHE_NAME).then(c=>c.put("./index.html",copy)).catch(()=>{});
      return res
    }).catch(()=>caches.match("./index.html")));
    return
  }

  event.respondWith(fetch(req,{cache:"no-store"}).then(res=>{
    const copy=res.clone();
    caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});
    return res
  }).catch(()=>caches.match(req)))
});
