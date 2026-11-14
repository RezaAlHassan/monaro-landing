import { handleLegalPage } from './legal-pages.mjs';
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    const legal=handleLegalPage(request);
    if(legal) return legal;
    if(url.pathname!=='/api/waitlist') {
      if(url.pathname.startsWith('/api/')) return json({error:'Not found'},404);
      return env.ASSETS.fetch(request);
    }
    if(request.method!=='POST') return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});
    const origin=request.headers.get('Origin');
    if(origin && origin!==url.origin) return json({error:'Invalid request origin'},403);
    if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({error:'Send JSON'},415);
    // Bound streamed input as well as Content-Length, which clients can omit.
    if(Number(request.headers.get('content-length'))>4096) return json({error:'Request too large'},413);
    let data;
    try {
      const reader=request.body?.getReader();
      if(!reader) return json({error:'Invalid request'},400);
      const chunks=[];let length=0;
      while(true) {
        const {value,done}=await reader.read();if(done)break;
        length+=value.byteLength;
        if(length>4096){await reader.cancel();return json({error:'Request too large'},413);}
        chunks.push(value);
      }
      const bytes=new Uint8Array(length);let offset=0;
      for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      data=JSON.parse(new TextDecoder().decode(bytes));
    } catch {return json({error:'Invalid request'},400);}
    if(!data || typeof data!=='object' || Array.isArray(data)) return json({error:'Invalid request'},400);
    if(data.website) return json({ok:true});
    const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
    if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:'Enter a valid email address'},400);
    try {
      await env.WAITLIST.prepare('INSERT OR IGNORE INTO waitlist (email) VALUES (?)').bind(email).run();
      return json({ok:true});
    } catch {return json({error:'We could not save your email. Please try again.'},503);}
  },
};
