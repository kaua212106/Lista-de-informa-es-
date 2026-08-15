const CACHE_NAME="minhas-anotacoes-v3";
const APP_SHELL=["./","./index.html","./manifest.json","./icone.png"];
const OPTIONAL=["https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await Promise.allSettled(OPTIONAL.map(url=>cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message",event=>{
  if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});

async function networkFirst(request,fallback){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request);
    if(response&&response.ok)cache.put(request,response.clone());
    return response;
  }catch{
    return (await cache.match(request))||(fallback?await cache.match(fallback):undefined)||Response.error();
  }
}

async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  const fresh=fetch(request).then(response=>{
    if(response&&(response.ok||response.type==="opaque"))cache.put(request,response.clone());
    return response;
  }).catch(()=>null);
  return cached||(await fresh)||Response.error();
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);

  if(request.mode==="navigate"){
    event.respondWith(networkFirst(request,"./index.html"));
    return;
  }

  if(url.origin===self.location.origin){
    if(url.pathname.endsWith("manifest.json")){event.respondWith(networkFirst(request));return}
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if(url.hostname==="cdn.jsdelivr.net"){
    event.respondWith(staleWhileRevalidate(request));
  }
});
