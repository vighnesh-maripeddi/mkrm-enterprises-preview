import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { extname, join, normalize, basename } from 'node:path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const DATA = join(ROOT, 'data');
const UPLOADS = join(DATA, 'uploads');
const DB_PATH = join(DATA, 'db.json');
const ADMIN_AUTH_PATH = join(DATA, 'admin-auth.json');
const PORT = Number(process.env.PORT || 8080);
const PUBLIC_BASE_URL = String(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
const COOKIE_SECURE = PUBLIC_BASE_URL.startsWith('https://') ? '; Secure' : '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const sessions = new Map();
const attempts = new Map();
const passwordResetTokens = new Map();
let adminAuth = null;

function createPasswordRecord(password) {
  const salt = randomBytes(16).toString('hex');
  return { salt, passwordHash: scryptSync(String(password), salt, 64).toString('hex') };
}
function passwordMatches(password, record) {
  if (!record?.salt || !record?.passwordHash) return false;
  try {
    const actual = Buffer.from(scryptSync(String(password), record.salt, 64).toString('hex'), 'hex');
    const expected = Buffer.from(record.passwordHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
async function loadAdminAuth() {
  await mkdir(DATA, {recursive:true});
  try {
    adminAuth = JSON.parse(await readFile(ADMIN_AUTH_PATH, 'utf8'));
    if (!adminAuth.email || !adminAuth.salt || !adminAuth.passwordHash) throw new Error('Invalid admin credential file');
  } catch (error) {
    if (error.code !== 'ENOENT' && error.message !== 'Invalid admin credential file') throw error;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) { adminAuth = null; return; }
    adminAuth = { email: ADMIN_EMAIL, ...createPasswordRecord(ADMIN_PASSWORD) };
    await writeFile(ADMIN_AUTH_PATH, JSON.stringify(adminAuth, null, 2), {mode:0o600});
  }
}
async function saveAdminAuth(record) {
  await writeFile(ADMIN_AUTH_PATH, JSON.stringify(record, null, 2), {mode:0o600});
  adminAuth = record;
}
function passwordPolicy(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 256;
}

const image = (file) => `/images/${file}`;
const defaultDb = () => ({
  settings: {
    companyName: 'MKRM ENTERPRISES', shortName: 'MKRM', logoUrl: '',
    email: 'mkrmenterprizes@gmail.com', phones: ['9975162278', '7875298066'], whatsapp: '9975162278',
    cityState: 'Virār, Maharashtra, India', address: '', workingHours: '', businessId: '',
    heroTitle: 'Metal Supply. Built Around Your Requirements.',
    heroText: 'Source copper, copper scrap and other industrial metals through a requirement-led supply process. Share your specifications, quantity and delivery location to receive a tailored quotation.',
    aboutText: 'MKRM ENTERPRISES is an India-based metals sourcing and trading business focused on connecting industrial material requirements with suitable supply options. Our approach emphasizes clear specifications, responsive commercial communication and order-specific sourcing.',
    socials: { linkedin: '', instagram: '' }, legalReviewed: false
  },
  categories: [
    { id:'copper', name:'Copper Products', label:'Copper', image:image('copper-cathodes.png'), description:'Refined and processed copper forms for industrial requirements.', active:true },
    { id:'copper-scrap', name:'Copper Scrap', label:'Copper Scrap', image:image('copper-cathodes.png'), description:'Copper-bearing and sorted scrap categories for specification-led enquiries.', active:true },
    { id:'aluminium', name:'Aluminium Products', label:'Aluminium', image:image('aluminium-ingots.png'), description:'Aluminium forms for manufacturing and processing requirements.', active:true },
    { id:'aluminium-scrap', name:'Aluminium Scrap', label:'Aluminium Scrap', image:image('aluminium-ingots.png'), description:'Aluminium scrap requirements reviewed by condition and grade.', active:true },
    { id:'steel', name:'Steel', label:'Steel', image:image('steel-coils.png'), description:'Steel products and scrap for industrial sourcing enquiries.', active:true },
    { id:'other', name:'Other Metals', label:'Other Metals', image:image('steel-coils.png'), description:'Brass, zinc, lead, bronze, nickel and other materials subject to capability.', active:true }
  ],
  products: [
    {id:'copper-cathodes', categoryId:'copper', name:'Copper Cathodes', form:'Refined product', application:'Electrical & metal processing', description:'Cathode requirements reviewed against requested grade, quantity, documentation and delivery terms.', image:image('copper-cathodes.png'), featured:true, active:true, standards:'Grade / standard to be confirmed per enquiry', specs:'Material form: cathodes. Dimensions, packing and inspection requirements can be specified.', type:'refined'},
    {id:'copper-wire-rods', categoryId:'copper', name:'Copper Wire Rods', form:'Processed product', application:'Cable & electrical manufacturing', description:'Copper wire rod sourcing for buyer-specified applications and dimensions.', image:image('copper-wire-rod.png'), featured:true, active:true, standards:'Grade / standard to be confirmed per enquiry', specs:'Material form: wire rod. Coil weight, dimensions and packaging to be agreed.', type:'processed'},
    {id:'copper-coils', categoryId:'copper', name:'Copper Coils', form:'Processed product', application:'Fabrication & manufacturing', description:'Copper coil enquiries assessed against thickness, width, temper and grade needs.', image:image('copper-cathodes.png'), featured:false, active:true, standards:'Grade / standard to be confirmed per enquiry', specs:'Material form: coil. Dimensions and surface requirements to be specified.', type:'processed'},
    {id:'bare-bright-copper', categoryId:'copper-scrap', name:'Bare Bright Copper Wire', form:'Scrap', application:'Recycling & secondary metals', description:'Sorted bare bright copper wire enquiries requiring condition, contamination and loading details.', image:image('bare-bright-copper-scrap.png'), featured:true, active:true, standards:'Scrap trade description; composition and condition confirmed per enquiry', specs:'Specify estimated weight, insulation, moisture, foreign material, packing and photographs.', type:'scrap'},
    {id:'copper-tubing-scrap', categoryId:'copper-scrap', name:'Copper Tubing Scrap', form:'Scrap', application:'Recycling & secondary metals', description:'Copper tubing scrap requirements assessed by sort, attachment, contamination and quantity.', image:image('copper-cathodes.png'), featured:false, active:true, standards:'Scrap trade description; actual material to be verified', specs:'Provide sorted / mixed condition, attachment details, photos, estimated weight and packing.', type:'scrap'},
    {id:'aluminium-ingots', categoryId:'aluminium', name:'Aluminium Ingots', form:'Refined product', application:'Foundry & manufacturing', description:'Aluminium ingot sourcing based on requested alloy, quantity and documentation.', image:image('aluminium-ingots.png'), featured:true, active:true, standards:'Alloy / standard to be confirmed per enquiry', specs:'Material form: ingots. Alloy, weight, packing and inspection requirements to be agreed.', type:'refined'},
    {id:'aluminium-sheets', categoryId:'aluminium', name:'Aluminium Sheets', form:'Processed product', application:'Fabrication & industrial manufacturing', description:'Sheet requirements assessed by alloy, temper, dimensions and finish.', image:image('aluminium-ingots.png'), featured:false, active:true, standards:'Alloy / standard to be confirmed per enquiry', specs:'Material form: sheets. Specify thickness, width, length, finish and packaging.', type:'processed'},
    {id:'clean-aluminium-extrusion', categoryId:'aluminium-scrap', name:'Clean Aluminium Extrusion Scrap', form:'Scrap', application:'Recycling & secondary metals', description:'Enquiries reviewed with grade, cleanliness, coating and loading condition.', image:image('aluminium-extrusion-scrap.png'), featured:true, active:true, standards:'Scrap trade description; material condition to be verified', specs:'Provide attachment / coating details, contamination, photos, weight and load condition.', type:'scrap'},
    {id:'aluminium-ubc', categoryId:'aluminium-scrap', name:'Aluminium UBC Scrap', form:'Scrap', application:'Recycling & secondary metals', description:'Used beverage can scrap enquiries requiring baling and contamination details.', image:image('aluminium-ingots.png'), featured:false, active:true, standards:'Scrap trade description; condition to be verified', specs:'Specify bale condition, moisture, foreign materials, quantity and photographs.', type:'scrap'},
    {id:'hot-rolled-coils', categoryId:'steel', name:'Hot-Rolled Coils', form:'Processed product', application:'Engineering & fabrication', description:'Steel coil sourcing based on grade, dimensions, finish and delivery requirement.', image:image('steel-coils.png'), featured:true, active:true, standards:'Grade / standard to be confirmed per enquiry', specs:'Material form: coils. Specify thickness, width, coil weight, grade and packing.', type:'processed'},
    {id:'stainless-steel-sheets', categoryId:'steel', name:'Stainless Steel Sheets', form:'Processed product', application:'Fabrication & industrial manufacturing', description:'Stainless steel sheet enquiries reviewed against grade, finish and dimensions.', image:image('steel-coils.png'), featured:true, active:true, standards:'Grade / standard to be confirmed per enquiry', specs:'Specify alloy / grade, thickness, dimensions, finish and packaging.', type:'processed'},
    {id:'heavy-melting-scrap', categoryId:'steel', name:'Heavy Melting Scrap', form:'Scrap', application:'Recycling & metal processing', description:'Steel scrap enquiries reviewed by grade, density, contamination and delivery structure.', image:image('steel-coils.png'), featured:false, active:true, standards:'Scrap trade description; actual material to be verified', specs:'Specify grade, loose/baled condition, contamination, weight, photos and loading.', type:'scrap'},
    {id:'brass-products-scrap', categoryId:'other', name:'Brass Products & Scrap', form:'Enquiry category', application:'Manufacturing & recycling', description:'Brass product and scrap requirements, subject to future business capability.', image:image('copper-cathodes.png'), featured:false, active:true, standards:'Grade / condition to be confirmed per enquiry', specs:'Share requested product form, composition if known, dimensions or scrap condition.', type:'other'},
    {id:'zinc-ingots-scrap', categoryId:'other', name:'Zinc Ingots & Scrap', form:'Enquiry category', application:'Galvanizing & metal processing', description:'Zinc requirements, subject to product specification and sourcing capability.', image:image('steel-coils.png'), featured:false, active:true, standards:'Grade / condition to be confirmed per enquiry', specs:'Share desired form, grade, estimated weight and documentation needs.', type:'other'}
  ],
  rfqs: [], supplierEnquiries: [], supplierQuotes: [], buyerQuotations: [], audit: []
});

async function bootstrap() { await mkdir(UPLOADS, {recursive:true}); try { await stat(DB_PATH); } catch { await save(defaultDb()); } }
async function db() { const data=JSON.parse(await readFile(DB_PATH, 'utf8')); data.supplierQuotes ||= []; data.buyerQuotations ||= []; data.rfqs ||= []; data.supplierEnquiries ||= []; data.audit ||= []; return data; }
async function save(data) { await mkdir(DATA,{recursive:true}); await writeFile(DB_PATH, JSON.stringify(data, null, 2)); }
const publicSettings = (s) => ({companyName:s.companyName,shortName:s.shortName,logoUrl:s.logoUrl,email:s.email,phones:s.phones,whatsapp:s.whatsapp,cityState:s.cityState,address:s.address,workingHours:s.workingHours,heroTitle:s.heroTitle,heroText:s.heroText,aboutText:s.aboutText,socials:s.socials,legalReviewed:s.legalReviewed});
const sanitize = (v, max=5000) => String(v ?? '').trim().replace(/[<>]/g,'').slice(0,max);
const id = (prefix) => `${prefix}-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomBytes(3).toString('hex').toUpperCase()}`;
const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
function cookieMap(req) { return Object.fromEntries((req.headers.cookie||'').split(';').map(v=>v.trim().split('=').map(decodeURIComponent)).filter(v=>v.length===2)); }
function currentSession(req) { const raw=cookieMap(req).mkrm_session; if(!raw) return null; const [token, signature] = raw.split('.'); if(!token||!signature||signature!==hash(`${token}.${SESSION_SECRET}`)) return null; const s=sessions.get(token); if(!s||s.expires<Date.now()) { sessions.delete(token); return null; } return s; }
function admin(req) { return currentSession(req)?.role === 'admin'; }
function writeJson(res, code, data, headers={}) { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}); res.end(JSON.stringify(data)); }
async function body(req, limit=1_300_000) { let bytes=0, chunks=[]; for await (const chunk of req) { bytes+=chunk.length; if(bytes>limit) throw new Error('Payload too large'); chunks.push(chunk); } try { return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); } catch { throw new Error('Invalid request data'); } }
function rate(req, group, max=8, ms=60_000) { const key=`${group}:${req.socket.remoteAddress}`; const item=attempts.get(key)||{count:0,until:Date.now()+ms}; if(item.until<Date.now()) { item.count=0;item.until=Date.now()+ms; } item.count++; attempts.set(key,item); return item.count<=max; }
function addAudit(data, action, ref, actor='admin') { data.audit.unshift({id:id('AUD'),action,ref,actor,at:new Date().toISOString()}); data.audit=data.audit.slice(0,500); }
function safeProduct(p) { return {id:p.id,categoryId:p.categoryId,name:p.name,form:p.form,application:p.application,description:p.description,image:p.image,featured:!!p.featured,active:!!p.active,standards:p.standards,specs:p.specs,type:p.type}; }

const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.json':'application/json; charset=utf-8'};
async function staticFile(req,res,path) { let clean=normalize(decodeURIComponent(path)).replace(/^([.][.][/\\])+/, ''); if(clean==='/'||clean==='') clean='/index.html'; let file=join(PUBLIC,clean); try { const s=await stat(file); if(s.isDirectory()) file=join(file,'index.html'); const data=await readFile(file); res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=86400'});res.end(data); } catch { const data=await readFile(join(PUBLIC,'index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(data); } }

async function route(req,res) {
  const url=new URL(req.url, `http://${req.headers.host}`); const p=url.pathname; const method=req.method;
  if(p==='/robots.txt') { res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600'}); return res.end('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\n# Sitemap is generated from public catalogue records.\nSitemap: /sitemap.xml\n'); }
  if(p==='/sitemap.xml') { const d=await db(); const host=String(req.headers.host||'localhost').replace(/[^A-Za-z0-9.:-]/g,''); const origin=`https://${host}`; const paths=['/','/metals','/how-we-work','/industries','/quality','/international','/about','/contact','/request-quote','/supplier','/faq','/privacy','/terms','/disclaimer',...d.products.filter(x=>x.active).map(x=>`/product/${encodeURIComponent(x.id)}`)]; const date=new Date().toISOString().slice(0,10); const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(x=>`<url><loc>${origin}${x}</loc><lastmod>${date}</lastmod></url>`).join('')}</urlset>`; res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600'}); return res.end(xml); }
  if(p==='/api/health') return writeJson(res,200,{ok:true,adminConfigured:Boolean(adminAuth?.email&&adminAuth?.passwordHash)});
  if(p==='/api/public/bootstrap' && method==='GET') { const d=await db(); return writeJson(res,200,{settings:publicSettings(d.settings),categories:d.categories.filter(c=>c.active),products:d.products.filter(x=>x.active).map(safeProduct)}); }
  if(p==='/api/rfqs' && method==='POST') {
    if(!rate(req,'rfq',5)) return writeJson(res,429,{error:'Too many submissions. Please wait and try again.'});
    try { const b=await body(req); const required=['fullName','company','email','phone','country','city']; for(const k of required) if(!sanitize(b[k],150)) return writeJson(res,400,{error:`Please enter your ${k.replace(/([A-Z])/g,' $1').toLowerCase()}.`});
      if(!/^\S+@\S+\.\S+$/.test(String(b.email))) return writeJson(res,400,{error:'Please enter a valid business email.'});
      const items=Array.isArray(b.items)?b.items.slice(0,10):[]; if(!items.length || !items.every(x=>sanitize(x.productId,100)&&Number(x.quantity)>0&&sanitize(x.unit,30))) return writeJson(res,400,{error:'Add at least one material with a valid quantity and unit.'});
      const d=await db(); const ref=id('RFQ'); const record={id:ref,status:'New',priority:'Normal',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),contact:{fullName:sanitize(b.fullName,150),company:sanitize(b.company,180),email:sanitize(b.email,180),phone:sanitize(b.phone,60),whatsapp:sanitize(b.whatsapp,60),country:sanitize(b.country,100),state:sanitize(b.state,100),city:sanitize(b.city,100),address:sanitize(b.address,500),businessId:sanitize(b.businessId,100)},commercial:{transaction:sanitize(b.transaction,40),destination:sanitize(b.destination,250),currency:sanitize(b.currency,20),incoterm:sanitize(b.incoterm,40),deliveryDate:sanitize(b.deliveryDate,50),frequency:sanitize(b.frequency,50),targetPrice:sanitize(b.targetPrice,80),unloading:sanitize(b.unloading,500)},technical:{grade:sanitize(b.grade,250),standard:sanitize(b.standard,250),composition:sanitize(b.composition,500),dimensions:sanitize(b.dimensions,500),condition:sanitize(b.condition,300),contamination:sanitize(b.contamination,500),packaging:sanitize(b.packaging,500),inspection:sanitize(b.inspection,500),documentation:sanitize(b.documentation,500),notes:sanitize(b.notes,3000)},items:items.map(x=>({productId:sanitize(x.productId,100),productName:sanitize(x.productName,200),quantity:Number(x.quantity),unit:sanitize(x.unit,30)})),attachments:Array.isArray(b.attachments)?b.attachments.slice(0,5).map(x=>sanitize(x,120)):[],notes:[],history:[{at:new Date().toISOString(),status:'New',by:'System'}]};
      d.rfqs.unshift(record); await save(d); return writeJson(res,201,{reference:ref,message:'Your enquiry has been received. We will review the requirements and contact you using the details provided.',emailConfigured:false});
    } catch(e) { return writeJson(res,e.message==='Payload too large'?413:400,{error:e.message||'Unable to submit enquiry.'}); }
  }
  if(p==='/api/supplier-enquiries' && method==='POST') {
    if(!rate(req,'supplier',5)) return writeJson(res,429,{error:'Too many submissions. Please wait and try again.'});
    try { const b=await body(req); const required=['supplierName','company','email','phone','country','material','quantity']; for(const k of required) if(!sanitize(b[k],150)) return writeJson(res,400,{error:`Please enter your ${k.replace(/([A-Z])/g,' $1').toLowerCase()}.`}); if(!/^\S+@\S+\.\S+$/.test(String(b.email))) return writeJson(res,400,{error:'Please enter a valid business email.'});
      const d=await db(), ref=id('SUP'); d.supplierEnquiries.unshift({id:ref,status:'New',createdAt:new Date().toISOString(),supplierName:sanitize(b.supplierName,150),company:sanitize(b.company,180),email:sanitize(b.email,180),phone:sanitize(b.phone,60),country:sanitize(b.country,100),location:sanitize(b.location,200),material:sanitize(b.material,200),productType:sanitize(b.productType,200),quantity:sanitize(b.quantity,100),grade:sanitize(b.grade,500),askingPrice:sanitize(b.askingPrice,100),currency:sanitize(b.currency,20),loadingLocation:sanitize(b.loadingLocation,250),readiness:sanitize(b.readiness,100),availability:sanitize(b.availability,100),registration:sanitize(b.registration,200),comments:sanitize(b.comments,3000),attachments:Array.isArray(b.attachments)?b.attachments.slice(0,5).map(x=>sanitize(x,120)):[],notes:[]}); await save(d); return writeJson(res,201,{reference:ref,message:'Your material offer has been received for administrative review. Submission does not constitute supplier approval or a purchase commitment.'});
    } catch(e) { return writeJson(res,e.message==='Payload too large'?413:400,{error:e.message||'Unable to submit supplier enquiry.'}); }
  }
  if(p==='/api/upload' && method==='POST') {
    if(!rate(req,'upload',5)) return writeJson(res,429,{error:'Too many upload attempts. Please wait and try again.'});
    try { const b=await body(req,7_000_000); const allowed={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}; if(!allowed[b.mime]||typeof b.data!=='string') return writeJson(res,400,{error:'Only PDF, JPG, PNG and WEBP files are accepted.'}); const raw=Buffer.from(b.data,'base64'); if(!raw.length||raw.length>5*1024*1024) return writeJson(res,400,{error:'Files must be no larger than 5 MB.'}); const name=`${Date.now()}-${randomBytes(8).toString('hex')}.${allowed[b.mime]}`; await writeFile(join(UPLOADS,name),raw,{flag:'wx'}); return writeJson(res,201,{token:name,originalName:sanitize(b.name,120)});
    } catch(e) { return writeJson(res,400,{error:e.message||'Unable to upload file.'}); }
  }
  if(p==='/api/admin/login' && method==='POST') {
    if(!rate(req,'login',7,15*60_000)) return writeJson(res,429,{error:'Too many sign-in attempts. Please wait before trying again.'}); if(!adminAuth) return writeJson(res,503,{error:'Administrator setup is required on this deployment.'});
    try { const b=await body(req,50_000); const email=sanitize(b.email,200); const ok=email.toLowerCase()===adminAuth.email.toLowerCase() && passwordMatches(String(b.password||''),adminAuth); if(!ok) return writeJson(res,401,{error:'Email or password is incorrect.'}); const token=randomBytes(32).toString('hex'), csrf=randomBytes(24).toString('hex'); sessions.set(token,{role:'admin',email:adminAuth.email,csrf,expires:Date.now()+8*60*60*1000}); const cookie=`mkrm_session=${encodeURIComponent(token+'.'+hash(`${token}.${SESSION_SECRET}`))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${COOKIE_SECURE}`; return writeJson(res,200,{ok:true,email:adminAuth.email,csrf},{'Set-Cookie':cookie});
    } catch { return writeJson(res,400,{error:'Unable to sign in.'}); }
  }
  if(p==='/api/admin/request-password-reset' && method==='POST') {
    if(!rate(req,'password-reset',3,15*60_000)) return writeJson(res,429,{error:'Too many recovery attempts. Wait 15 minutes and try again.'});
    try {
      const b=await body(req,20_000), email=sanitize(b.email,200).toLowerCase();
      if(adminAuth && email===adminAuth.email.toLowerCase()) {
        for (const [token, item] of passwordResetTokens) if (item.email.toLowerCase()===email) passwordResetTokens.delete(token);
        const token=randomBytes(32).toString('hex');
        passwordResetTokens.set(token,{email:adminAuth.email,expires:Date.now()+15*60_000});
        const recoveryBase = PUBLIC_BASE_URL || `http://localhost:${PORT}`;
        console.log(`\n[MKRM PASSWORD RECOVERY] One-time reset link (expires in 15 minutes):\n${recoveryBase}/#/admin-reset?token=${token}\n`);
      }
      return writeJson(res,200,{ok:true,message:PUBLIC_BASE_URL ? 'If the address matches the configured administrator account, a one-time recovery link has been written to the private hosting logs. No email is sent by this version.' : 'If the address matches the configured administrator account, a one-time recovery link has been printed in the local server terminal. No email is sent by this version.'});
    } catch { return writeJson(res,400,{error:'Unable to process the recovery request.'}); }
  }
  if(p==='/api/admin/reset-password' && method==='POST') {
    if(!rate(req,'password-reset-submit',5,15*60_000)) return writeJson(res,429,{error:'Too many reset attempts. Wait and try again.'});
    try {
      const b=await body(req,30_000), token=String(b.token||''), item=passwordResetTokens.get(token), newPassword=String(b.newPassword||'');
      if(!item || item.expires<Date.now()) { passwordResetTokens.delete(token); return writeJson(res,400,{error:'This recovery link is invalid or expired. Request a new one.'}); }
      if(!passwordPolicy(newPassword)) return writeJson(res,400,{error:'Use a password between 12 and 256 characters.'});
      if(passwordMatches(newPassword,adminAuth)) return writeJson(res,400,{error:'Choose a password different from your current password.'});
      await saveAdminAuth({email:adminAuth.email,...createPasswordRecord(newPassword)});
      passwordResetTokens.clear(); sessions.clear();
      return writeJson(res,200,{ok:true,message:'Password reset successfully. Sign in with your new password.'},{'Set-Cookie':`mkrm_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${COOKIE_SECURE}`});
    } catch { return writeJson(res,400,{error:'Unable to reset password.'}); }
  }
  if(p==='/api/admin/logout' && method==='POST') { const s=currentSession(req); if(s) { for(const [key,value] of sessions) if(value===s) sessions.delete(key); } return writeJson(res,200,{ok:true},{'Set-Cookie':`mkrm_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${COOKIE_SECURE}`}); }
  if(p==='/api/admin/session' && method==='GET') { const s=currentSession(req); return writeJson(res,200,{authenticated:!!s,email:s?.email||null,csrf:s?.csrf||null}); }
  if(p.startsWith('/api/admin/')) {
    const s=currentSession(req); if(!admin(req)) return writeJson(res,401,{error:'Administrator sign-in required.'}); if(['POST','PUT','PATCH','DELETE'].includes(method) && req.headers['x-csrf-token']!==s.csrf) return writeJson(res,403,{error:'Security check failed. Refresh and sign in again.'});
    if(p==='/api/admin/change-password' && method==='POST') {
      try {
        const b=await body(req,30_000), currentPassword=String(b.currentPassword||''), newPassword=String(b.newPassword||'');
        if(!passwordMatches(currentPassword,adminAuth)) return writeJson(res,400,{error:'Current password is incorrect.'});
        if(!passwordPolicy(newPassword)) return writeJson(res,400,{error:'Use a password between 12 and 256 characters.'});
        if(passwordMatches(newPassword,adminAuth)) return writeJson(res,400,{error:'Choose a password different from your current password.'});
        await saveAdminAuth({email:adminAuth.email,...createPasswordRecord(newPassword)});
        for(const [key,value] of sessions) if(value!==s) sessions.delete(key);
        const d=await db(); addAudit(d,'Changed administrator password','ADMIN_AUTH'); await save(d);
        return writeJson(res,200,{ok:true,message:'Password updated successfully.'});
      } catch(e) { return writeJson(res,400,{error:e.message||'Unable to change password.'}); }
    }
    if(p==='/api/admin/overview' && method==='GET') { const d=await db(); const active=d.rfqs.filter(x=>!['Completed','Cancelled'].includes(x.status)); const count=(status)=>d.rfqs.filter(x=>x.status===status).length; return writeJson(res,200,{metrics:{newBuyer:count('New'),openSourcing:count('Sourcing'),supplierEnquiries:d.supplierEnquiries.filter(x=>x.status==='New').length,quotesPending:d.buyerQuotations.filter(x=>x.status==='Draft').length,quotesSent:d.buyerQuotations.filter(x=>x.status==='Sent').length,confirmed:count('Order Confirmed'),followUps:active.filter(x=>x.followUpDate&&new Date(x.followUpDate)<=new Date()).length},rfqs:d.rfqs,suppliers:d.supplierEnquiries,supplierQuotes:d.supplierQuotes,buyerQuotations:d.buyerQuotations,audit:d.audit.slice(0,12),settings:d.settings,categories:d.categories,products:d.products}); }
    if(p==='/api/admin/settings' && method==='PUT') { const b=await body(req); const d=await db(); const allowed=['companyName','shortName','logoUrl','email','whatsapp','cityState','address','workingHours','businessId','heroTitle','heroText','aboutText']; for(const key of allowed) if(key in b) d.settings[key]=sanitize(b[key],key==='aboutText'?2500:800); if(Array.isArray(b.phones)) d.settings.phones=b.phones.slice(0,3).map(x=>sanitize(x,60)).filter(Boolean); if(b.socials&&typeof b.socials==='object') d.settings.socials={linkedin:sanitize(b.socials.linkedin,300),instagram:sanitize(b.socials.instagram,300)}; addAudit(d,'Updated site settings','SETTINGS'); await save(d); return writeJson(res,200,{settings:d.settings}); }
    if(p==='/api/admin/categories' && method==='POST') { const b=await body(req); const d=await db(); const c={id:sanitize(b.id||b.label.toLowerCase().replace(/[^a-z0-9]+/g,'-'),80),name:sanitize(b.name,120),label:sanitize(b.label,80),image:sanitize(b.image,500),description:sanitize(b.description,500),active:b.active!==false}; if(!c.id||!c.name||!c.label||d.categories.some(x=>x.id===c.id)) return writeJson(res,400,{error:'A unique category identifier, category name and label are required.'}); d.categories.push(c); addAudit(d,'Created material category',c.id); await save(d); return writeJson(res,201,{category:c}); }
    const categoryMatch=p.match(/^\/api\/admin\/categories\/([a-zA-Z0-9-]+)$/); if(categoryMatch && method==='PUT') { const b=await body(req); const d=await db(), c=d.categories.find(x=>x.id===categoryMatch[1]); if(!c) return writeJson(res,404,{error:'Category not found.'}); for(const f of ['name','label','image','description']) if(f in b)c[f]=sanitize(b[f],f==='description'?500:500); if('active' in b)c.active=!!b.active; addAudit(d,'Updated material category',c.id); await save(d); return writeJson(res,200,{category:c}); }
    if(p==='/api/admin/supplier-quotes' && method==='POST') { const b=await body(req); const d=await db(); const required=['supplier','material','quantity','currency','unitPrice']; if(required.some(x=>!sanitize(b[x],160)))return writeJson(res,400,{error:'Supplier, material, quantity, currency and unit price are required.'}); const quote={id:id('SQ'),createdAt:new Date().toISOString(),supplier:sanitize(b.supplier,180),material:sanitize(b.material,250),grade:sanitize(b.grade,250),quantity:sanitize(b.quantity,100),currency:sanitize(b.currency,20),unitPrice:sanitize(b.unitPrice,100),freightTerms:sanitize(b.freightTerms,250),taxes:sanitize(b.taxes,250),leadTime:sanitize(b.leadTime,100),validUntil:sanitize(b.validUntil,40),documentation:sanitize(b.documentation,500),notes:sanitize(b.notes,1500)};d.supplierQuotes.unshift(quote);addAudit(d,'Added confidential supplier quote',quote.id);await save(d);return writeJson(res,201,{quote}); }
    if(p==='/api/admin/buyer-quotations' && method==='POST') { const b=await body(req); const d=await db(),rfq=d.rfqs.find(x=>x.id===sanitize(b.rfqId,40)); if(!rfq)return writeJson(res,400,{error:'Choose a valid buyer enquiry reference.'}); const required=['material','quantity','currency','unitPrice','validUntil'];if(required.some(x=>!sanitize(b[x],250)))return writeJson(res,400,{error:'Material, quantity, currency, unit price and validity are required.'}); const quote={id:id('QT'),createdAt:new Date().toISOString(),status:'Draft',rfqId:rfq.id,buyer:rfq.contact.company,material:sanitize(b.material,500),specifications:sanitize(b.specifications,1000),quantity:sanitize(b.quantity,100),currency:sanitize(b.currency,20),unitPrice:sanitize(b.unitPrice,100),freightTax:sanitize(b.freightTax,400),deliveryTerms:sanitize(b.deliveryTerms,500),paymentTerms:sanitize(b.paymentTerms,500),validUntil:sanitize(b.validUntil,40),conditions:sanitize(b.conditions,1500)};d.buyerQuotations.unshift(quote);addAudit(d,'Prepared buyer quotation draft',quote.id);await save(d);return writeJson(res,201,{quote}); }
    const buyerQuoteMatch=p.match(/^\/api\/admin\/buyer-quotations\/([A-Z0-9-]+)$/); if(buyerQuoteMatch && method==='PUT') { const b=await body(req),d=await db(),q=d.buyerQuotations.find(x=>x.id===buyerQuoteMatch[1]);if(!q)return writeJson(res,404,{error:'Quotation not found.'});if(['Draft','Sent','Accepted','Expired','Cancelled'].includes(b.status))q.status=b.status;addAudit(d,'Updated buyer quotation status',q.id);await save(d);return writeJson(res,200,{quote:q}); }
    if(p==='/api/admin/products' && method==='POST') { const b=await body(req); const d=await db(); const product={id:sanitize(b.id||b.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),90),categoryId:sanitize(b.categoryId,80),name:sanitize(b.name,180),form:sanitize(b.form,80),application:sanitize(b.application,250),description:sanitize(b.description,800),image:sanitize(b.image,500),featured:!!b.featured,active:b.active!==false,standards:sanitize(b.standards,500),specs:sanitize(b.specs,1200),type:sanitize(b.type,50)}; if(!product.name||!product.categoryId||d.products.some(x=>x.id===product.id)) return writeJson(res,400,{error:'A name, category and unique product identifier are required.'}); d.products.push(product); addAudit(d,'Created catalogue product',product.id); await save(d); return writeJson(res,201,{product}); }
    const prodMatch=p.match(/^\/api\/admin\/products\/([a-zA-Z0-9-]+)$/); if(prodMatch && method==='PUT') { const b=await body(req); const d=await db(), product=d.products.find(x=>x.id===prodMatch[1]); if(!product) return writeJson(res,404,{error:'Product not found.'}); const fields=['categoryId','name','form','application','description','image','standards','specs','type']; for(const f of fields) if(f in b) product[f]=sanitize(b[f],f==='specs'?1200:800); if('active'in b) product.active=!!b.active; if('featured'in b) product.featured=!!b.featured; addAudit(d,'Updated catalogue product',product.id); await save(d); return writeJson(res,200,{product}); }
    const rfqMatch=p.match(/^\/api\/admin\/rfqs\/([A-Z0-9-]+)$/); if(rfqMatch && method==='PUT') { const b=await body(req); const d=await db(), r=d.rfqs.find(x=>x.id===rfqMatch[1]); if(!r) return writeJson(res,404,{error:'Enquiry not found.'}); const allowedStatuses=['New','Under Review','Sourcing','Awaiting Supplier Quote','Quotation Prepared','Quotation Sent','Negotiation','Order Confirmed','Dispatch Coordination','Completed','Cancelled']; if(b.status&&allowedStatuses.includes(b.status)&&r.status!==b.status) {r.status=b.status;r.history.push({at:new Date().toISOString(),status:b.status,by:'Admin'});} if(b.priority&&['Low','Normal','High'].includes(b.priority)) r.priority=b.priority; if('followUpDate'in b) r.followUpDate=sanitize(b.followUpDate,30); r.updatedAt=new Date().toISOString(); addAudit(d,'Updated buyer enquiry',r.id); await save(d); return writeJson(res,200,{rfq:r}); }
    const noteMatch=p.match(/^\/api\/admin\/rfqs\/([A-Z0-9-]+)\/notes$/); if(noteMatch&&method==='POST') { const b=await body(req); const d=await db(), r=d.rfqs.find(x=>x.id===noteMatch[1]), text=sanitize(b.text,3000); if(!r||!text)return writeJson(res,400,{error:'A valid enquiry and note are required.'});r.notes.unshift({id:id('NOTE'),text,at:new Date().toISOString(),by:'Admin'});addAudit(d,'Added private enquiry note',r.id);await save(d);return writeJson(res,201,{note:r.notes[0]}); }
    const suppMatch=p.match(/^\/api\/admin\/supplier-enquiries\/([A-Z0-9-]+)$/); if(suppMatch && method==='PUT') { const b=await body(req); const d=await db(), r=d.supplierEnquiries.find(x=>x.id===suppMatch[1]); if(!r)return writeJson(res,404,{error:'Supplier enquiry not found.'}); if(['New','Under Review','Approved','Not Proceeding'].includes(b.status))r.status=b.status; addAudit(d,'Updated supplier enquiry',r.id);await save(d);return writeJson(res,200,{supplier:r}); }
    const fileMatch=p.match(/^\/api\/admin\/files\/([a-zA-Z0-9.-]+)$/); if(fileMatch&&method==='GET') { const f=basename(fileMatch[1]);try {const raw=await readFile(join(UPLOADS,f));res.writeHead(200,{'Content-Type':MIME[extname(f)]||'application/octet-stream','Content-Disposition':`attachment; filename="${f}"`,'X-Content-Type-Options':'nosniff'});return res.end(raw);}catch{return writeJson(res,404,{error:'File not found.'});} }
    return writeJson(res,404,{error:'Administrative endpoint not found.'});
  }
  return staticFile(req,res,p);
}

await bootstrap();
await loadAdminAuth();
const server=http.createServer(async(req,res)=>{ try { res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: https:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"); await route(req,res); } catch(e) { console.error(e); if(!res.headersSent) writeJson(res,500,{error:'An unexpected server error occurred.'}); } });
server.listen(PORT,'0.0.0.0',()=>console.log(`MKRM platform listening on 0.0.0.0:${PORT}`));
