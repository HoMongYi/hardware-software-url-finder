import http from 'node:http';
import crypto from 'node:crypto';
export function createHttpServer(engine,{token,allowResearch=false,maxBytes=1_048_576,maxConcurrent=2}={}){
  let running=0;
  return http.createServer(async(req,res)=>{
    const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
    if(req.headers.origin){send(403,{error:'ORIGIN_NOT_ALLOWED'});return;}
    if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host||'')&&!token){send(403,{error:'HOST_NOT_ALLOWED'});return;}
    if(token){const expected=Buffer.from('Bearer '+token),actual=Buffer.from(req.headers.authorization||'');if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected)){send(401,{error:'UNAUTHORIZED'});return;}}
    if(running>=maxConcurrent){send(429,{error:'BUSY'});return;}running++;
    try{
      const u=new URL(req.url,'http://localhost');
      if(req.method==='GET'&&u.pathname==='/health'){send(200,{status:'ok',version:'0.1.0',mode:allowResearch?'research-enabled':'offline'});return;}
      if(req.method==='GET'&&u.pathname.startsWith('/v1/vendors/')){const v=engine.registry.vendors.find(v=>v.id===u.pathname.slice('/v1/vendors/'.length));send(v?200:404,v||{error:'NOT_FOUND'});return;}
      if(req.method==='GET'&&u.pathname.startsWith('/v1/ecosystems/')){const e=engine.registry.vendors.flatMap(v=>v.ecosystems).find(e=>e.id===u.pathname.slice('/v1/ecosystems/'.length));send(e?200:404,e||{error:'NOT_FOUND'});return;}
      if(req.method!=='POST'){send(404,{error:'NOT_FOUND'});return;}
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){send(415,{error:'JSON_REQUIRED'});return;}
      let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>maxBytes){send(413,{error:'BODY_TOO_LARGE'});return;}chunks.push(chunk);}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(400,{error:'INVALID_JSON'});return;}
      if(u.pathname==='/v1/resolve'){send(200,await engine.resolve(body,{offline:true}));return;}
      if(u.pathname==='/v1/resolve/batch'){if(!body||Object.keys(body).some(k=>k!=='items'))throw new Error('INVALID_BATCH');send(200,{results:await engine.batch(body.items,{offline:true})});return;}
      if(u.pathname==='/v1/audit'){if(!body||typeof body.url!=='string'||Object.keys(body).some(k=>!['url','product'].includes(k)))throw new Error('INVALID_AUDIT');send(200,engine.audit(body.url,body.product));return;}
      if(u.pathname==='/v1/research'&&allowResearch){send(200,await engine.resolve(body,{offline:false}));return;}
      send(404,{error:'NOT_FOUND'});
    }catch{if(!res.writableEnded)send(400,{error:'INVALID_REQUEST'});}finally{running--;}
  });
}
