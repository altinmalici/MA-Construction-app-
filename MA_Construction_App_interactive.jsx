import React, { useState, useRef, useEffect } from 'react';
import { Clock, Building2, FileText, Users, Plus, ArrowLeft, Camera, Check, ChevronRight, LogOut, MapPin, Phone, User, Save, Trash2, Edit3, Download, AlertTriangle, Search, Calendar, Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, PenTool, Eye, UserPlus, Briefcase, X, ChevronLeft, Bell, Paperclip, AlertCircle, CheckCircle, ClipboardList, FileUp, Package, Printer, TrendingUp, TrendingDown, Receipt, BarChart3, Filter } from 'lucide-react';

const initialData = {
  users: [
    { id: 1, name: 'Altin Malici', role: 'chef', pin: '1998' },
  ],
  subunternehmer: [],
  baustellen: [],
  stundeneintraege: [],
  kalender: [],
  maengel: [],
  bautagebuch: [],
  dokumente: [],
  benachrichtigungen: [],
  kosten: [],
};

// Helpers
const bStd = (b,e,p) => { const [bH,bM]=b.split(':').map(Number); const [eH,eM]=e.split(':').map(Number); return ((eH*60+eM-bH*60-bM-p)/60).toFixed(1); };
const fDat = d => new Date(d).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
const fK = d => new Date(d).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
const nid = a => Math.max(0,...a.map(x=>x.id))+1;
const fE = v => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
const G = 'linear-gradient(to right, #8E3A9E, #A04878)'; // NUR für Logo
const BTN = G; // Buttons & aktive Elemente (purple gradient)
const ACC = '#A04878'; // Akzentfarbe (purple)
const IC = "w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-gray-400 text-sm";

const WI = ({w,className:c,style:s}) => {const p={className:c,style:s}; return w==='sonnig'?<Sun {...p}/>:w==='bewölkt'?<Cloud {...p}/>:w==='regen'?<CloudRain {...p}/>:w==='schnee'?<CloudSnow {...p}/>:w==='wind'?<Wind {...p}/>:<Sun {...p}/>;};

// Shared UI
const Toast = ({message,type='success',onDone}) => {
  useEffect(()=>{const t=setTimeout(onDone,1800);return()=>clearTimeout(t);},[onDone]);
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg flex items-center gap-2" style={{background:type==='success'?'#22c55e':'#ef4444'}}>{type==='success'?<Check size={18}/>:<AlertTriangle size={18}/>}{message}</div>;
};
const Hdr = ({title,onBack,right}) => <div className="bg-white border-b border-gray-200 shadow-sm p-4"><div className="flex items-center gap-3">{onBack&&<button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-700"><ArrowLeft size={20}/></button>}<h1 className="text-gray-900 font-medium flex-1 truncate text-sm">{title}</h1>{right}</div></div>;
const Empty = ({icon:I,text}) => <div className="text-center py-12"><I className="mx-auto text-gray-400 mb-3" size={48}/><p className="text-gray-400 text-sm">{text}</p></div>;
const Bdg = ({text,color='#A04878'}) => <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{background:`${color}22`,color}}>{text}</span>;
const PBar = ({value,small,color}) => <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${small?'h-1.5':'h-2.5'}`}><div className="h-full rounded-full transition-all" style={{width:`${value}%`,background:color||G}}/></div>;

const PhotoGrid = ({fotos,onAdd,onRemove}) => <div className="flex gap-2 flex-wrap">
  {fotos.map((f,i)=><div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300 group"><img src={f} className="w-full h-full object-cover"/>{onRemove&&<button onClick={()=>onRemove(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5 opacity-0 group-hover:opacity-100"><X size={10}/></button>}</div>)}
  {onAdd&&<button onClick={onAdd} className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-purple-300 hover:text-gray-600"><Camera size={16}/><span className="text-xs">Foto</span></button>}
</div>;

const SigPad = ({onSave,onClear,sig}) => {
  const ref=useRef(null); const [dr,setDr]=useState(false); const [hd,setHd]=useState(!!sig);
  useEffect(()=>{const c=ref.current;if(!c)return;const x=c.getContext('2d');c.width=c.offsetWidth*2;c.height=c.offsetHeight*2;x.scale(2,2);x.strokeStyle='#374151';x.lineWidth=2;x.lineCap='round';if(sig){const img=new window.Image();img.onload=()=>x.drawImage(img,0,0,c.offsetWidth,c.offsetHeight);img.src=sig;}},[]);
  const gp=e=>{const r=ref.current.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};};
  const sd=e=>{e.preventDefault();const x=ref.current.getContext('2d');const p=gp(e);x.beginPath();x.moveTo(p.x,p.y);setDr(true);setHd(true);};
  const mv=e=>{if(!dr)return;e.preventDefault();const x=ref.current.getContext('2d');const p=gp(e);x.lineTo(p.x,p.y);x.stroke();};
  const ed=()=>{setDr(false);if(hd&&onSave)onSave(ref.current.toDataURL());};
  const cl=()=>{const c=ref.current;c.getContext('2d').clearRect(0,0,c.width,c.height);setHd(false);if(onClear)onClear();};
  return <div><div className="relative border-2 border-dashed rounded-lg overflow-hidden" style={{borderColor:hd?'#A04878':'#d1d5db'}}><canvas ref={ref} className="w-full bg-white cursor-crosshair" style={{height:80,touchAction:'none'}} onMouseDown={sd} onMouseMove={mv} onMouseUp={ed} onMouseLeave={ed} onTouchStart={sd} onTouchMove={mv} onTouchEnd={ed}/>{!hd&&!sig&&<div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400"><PenTool size={16}/><span className="text-xs ml-2">Unterschreiben</span></div>}</div>{(hd||sig)&&<button onClick={cl} className="mt-1 text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><Trash2 size={10}/>Löschen</button>}</div>;
};

export default function MAConstructionApp() {
  const [data, setData] = useState(() => {
    try { const saved = localStorage.getItem('ma_construction_data'); return saved ? JSON.parse(saved) : initialData; }
    catch { return initialData; }
  });
  const [cu, setCu] = useState(() => {
    try { const saved = localStorage.getItem('ma_construction_user'); return saved ? JSON.parse(saved) : null; }
    catch { return null; }
  });
  const [v, setV] = useState(() => {
    try { const saved = localStorage.getItem('ma_construction_view'); return saved || 'login'; }
    catch { return 'login'; }
  });
  const [sb, setSb] = useState(null); // selected baustelle
  const [em, setEm] = useState(false); // edit mode
  const [sq, setSq] = useState(''); // search
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const [photoCb, setPhotoCb] = useState(null);

  // Persist data
  useEffect(() => { try { localStorage.setItem('ma_construction_data', JSON.stringify(data)); } catch {} }, [data]);
  useEffect(() => { try { localStorage.setItem('ma_construction_user', cu ? JSON.stringify(cu) : ''); } catch {} }, [cu]);
  useEffect(() => { try { localStorage.setItem('ma_construction_view', v); } catch {} }, [v]);
  // Safety: if user in storage but not in data, reset to login
  useEffect(() => { if(cu && !data.users.find(u=>u.id===cu.id)){setCu(null);setV('login');} if(!cu && v!=='login')setV('login'); }, []);

  const show = (m,t='success') => setToast({message:m,type:t});
  const chef = cu?.role === 'chef';
  const resetAll = () => { if(confirm('Alle Daten löschen? Das kann nicht rückgängig gemacht werden!')){localStorage.clear();setData(initialData);setCu(null);setV('login');show('Daten zurückgesetzt');} };
  const unread = data.benachrichtigungen.filter(n=>!n.gelesen).length;
  const addN = (typ,text,bid) => setData(p=>({...p,benachrichtigungen:[{id:nid(p.benachrichtigungen),typ,text,baustelleId:bid,datum:new Date().toISOString(),gelesen:false},...p.benachrichtigungen]}));
  const trigPhoto = cb => { setPhotoCb(()=>cb); fileRef.current?.click(); };
  const onFile = e => { const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{if(photoCb)photoCb(ev.target.result);}; r.readAsDataURL(f); e.target.value=''; };
  const eName = (e) => {if(e.personTyp==='sub'){const s=data.subunternehmer.find(x=>x.id===e.subId);return s?s.name:'Sub';}if(e.personTyp==='sonstige')return e.personName||'Sonstige';const u=data.users.find(x=>x.id===e.mitarbeiterId);return u?.name||'?';};

  // ==================== LOGIN ====================
  const Login = () => {
    const [pin,setPin]=useState(''); const [err,setErr]=useState('');
    const go=(p)=>{const code=p||pin;if(code.length!==4)return;const u=data.users.find(x=>x.pin===code);if(u){setCu(u);setV('dash');}else{setErr('Falscher PIN');setPin('');}};
    const tap=(n)=>{if(n==='del'){setPin(p=>p.slice(0,-1));setErr('');}else if(pin.length<4){const np=pin+n;setPin(np);setErr('');if(np.length===4)setTimeout(()=>go(np),150);}};
    return <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-6"><div className="w-full max-w-sm">
      <div className="text-center mb-8"><div className="inline-flex items-center justify-center mb-3 w-16 h-16 rounded-2xl" style={{background:G}}><span className="text-white text-2xl font-bold">MA</span></div><h1 className="text-xl font-bold text-gray-900">MA Construction</h1><p className="text-gray-400 text-xs mt-1">PIN eingeben</p></div>
      <div className="space-y-4">
        <div className="flex justify-center gap-3 my-3">{[0,1,2,3].map(i=><div key={i} className="w-3 h-3 rounded-full transition-all" style={{backgroundColor:pin.length>i?'#6b7280':'#d1d5db'}}/>)}</div>
        {err&&<p className="text-red-400 text-center text-xs">{err}</p>}
        <div className="grid grid-cols-3 gap-2">{[1,2,3,4,5,6,7,8,9,'',0,'del'].map((n,i)=><button key={i} onClick={()=>tap(n)} disabled={n===''} className={`h-11 rounded-xl text-lg ${n===''?'bg-transparent':n==='del'?'text-gray-500 hover:bg-gray-200':'bg-gray-100 text-gray-900 hover:bg-gray-200 active:scale-95'}`}>{n==='del'?'←':n}</button>)}</div>
      </div>
    </div><button onClick={resetAll} className="mt-6 text-gray-400 text-xs hover:text-red-400">Daten zurücksetzen</button></div>;
  };

  // ==================== DASHBOARD ====================
  const Dash = () => {
    const mb = chef ? data.baustellen : data.baustellen.filter(b=>b.mitarbeiter.includes(cu.id));
    const [showMore,setShowMore]=useState(false);
    const items = [
      {k:'bst',i:Building2,l:'Baustellen',s:`${mb.length} ${chef?'gesamt':'zugewiesen'}`,a:true},
      {k:'ste',i:Clock,l:'Stunden eintragen',s:'Arbeitszeit erfassen',a:true},
      {k:'mst',i:FileText,l:'Meine Stunden',s:`${data.stundeneintraege.filter(e=>e.mitarbeiterId===cu.id).length} Einträge`},
      ...(!chef?[
        {k:'mng',i:AlertCircle,l:'Mängel melden',s:'Problem auf Baustelle melden'},
      ]:[]),
      {k:'kal',i:Calendar,l:'Kalender',s:'Termine & Planung'},
      ...(chef?[{k:'reg',i:FileText,l:'Regieberichte',s:'Auto-generiert'}]:[]),
    ];
    const moreItems = chef?[
      {k:'tag',i:Eye,l:'Tagesübersicht',s:'Alle Einträge'},
      {k:'mng',i:AlertCircle,l:'Mängelmanagement',s:`${data.maengel.filter(m=>m.status!=='erledigt').length} offen`},
      {k:'btb',i:ClipboardList,l:'Bautagebuch',s:'Tagesberichte'},
      {k:'kos',i:Receipt,l:'Kostenübersicht',s:'Budget & Abrechnung'},
      {k:'mat',i:Package,l:'Materialübersicht',s:'Verbrauch'},
      {k:'mit',i:Users,l:'Handwerker',s:`${data.users.filter(u=>u.role==='mitarbeiter').length} Personen`},
      {k:'sub',i:Briefcase,l:'Subunternehmer',s:`${data.subunternehmer.length} Firmen`},
    ]:[];
    const renderItem=({k,i:I,l,s,a})=><button key={k} onClick={()=>setV(k)} className={`w-full p-3 rounded-xl border text-left group transition-all ${a?'':'bg-white border-gray-200 shadow-sm hover:border-purple-300'}`} style={a?{background:'rgba(142,58,158,0.08)',borderColor:'rgba(160,72,120,0.2)'}:{}}>
      <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={a?{background:'rgba(160,72,120,0.12)'}:{background:'#f3f4f6'}}><I size={18} style={{color:a?'#A04878':'#9ca3af'}}/></div><div className="flex-1"><p className="text-gray-900 text-sm">{l}</p><p className="text-gray-400 text-xs">{s}</p></div><ChevronRight className="text-gray-300 group-hover:text-gray-700" size={16}/></div>
    </button>;
    return <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm p-4"><div className="flex items-center justify-between">
        <div><p className="text-gray-900 text-sm font-medium">{chef?'MA Construction':cu.name}</p><p className="text-gray-400 text-xs">{new Date().toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</p></div>
        <div className="flex items-center gap-3">
          {chef&&<button onClick={()=>setV('notif')} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-700 relative"><Bell size={18}/>{unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{unread}</span>}</button>}
          <button onClick={()=>setV('profil')} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-700"><User size={18}/></button>
        </div>
      </div></div>
      <div className="p-4 space-y-2">
        {items.map(renderItem)}
        {moreItems.length>0&&<>
          <button onClick={()=>setShowMore(!showMore)} className="w-full text-left py-2 mt-2 pl-3"><span className="text-sm font-bold" style={{color:'#6b7280'}}>{showMore?'Weniger':'Mehr'}</span></button>
          {showMore&&<div className="space-y-2">{moreItems.map(renderItem)}</div>}
        </>}
      </div>
    </div>;
  };

  // ==================== BAUSTELLEN LISTE ====================
  const BstList = () => {
    const [fl,setFl]=useState('alle');
    let ls = chef?data.baustellen:data.baustellen.filter(b=>b.mitarbeiter.includes(cu.id));
    if(sq) ls=ls.filter(b=>(b.kunde+b.adresse).toLowerCase().includes(sq.toLowerCase()));
    if(fl!=='alle') ls=ls.filter(b=>b.status===fl);
    const sc={geplant:'#3b82f6',aktiv:'#22c55e',fertig:'#6b7280',abgerechnet:'#A04878'};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Baustellen" onBack={()=>{setV('dash');setSq('');}} right={chef&&<button onClick={()=>{setSb(null);setEm(false);setV('bsf');}} className="p-2 rounded-lg text-white" style={{background:BTN}}><Plus size={18}/></button>}/>
      <div className="p-4 pb-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input value={sq} onChange={e=>setSq(e.target.value)} placeholder="Suchen..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none"/></div></div>
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">{['alle','geplant','aktiv','fertig','abgerechnet'].map(s=><button key={s} onClick={()=>setFl(s)} className={`px-4 py-2 rounded-full text-xs whitespace-nowrap ${fl===s?'text-white':'bg-gray-100 text-gray-500'}`} style={fl===s?{background:BTN}:{}}>{s==='alle'?'Alle':s.charAt(0).toUpperCase()+s.slice(1)}</button>)}</div>
      <div className="p-4 pt-2 space-y-2">{ls.length===0?<Empty icon={Building2} text="Keine Baustellen"/>:ls.map(b=><button key={b.id} onClick={()=>{setSb(b);setV('bsd');}} className="w-full p-3 rounded-xl bg-white border border-gray-200 shadow-sm text-left hover:border-purple-300">
        <div className="flex items-start justify-between mb-1"><p className="text-gray-900 text-sm font-medium">{b.kunde}</p><Bdg text={b.status} color={sc[b.status]}/></div>
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-2"><MapPin size={11}/>{b.adresse}</div>
        <div className="flex items-center gap-2"><PBar value={b.fortschritt||0} small/><span className="text-xs text-gray-400 w-8">{b.fortschritt||0}%</span></div>
      </button>)}</div>
    </div>;
  };

  // ==================== BAUSTELLE DETAIL ====================
  const BstDet = () => {
    const b=sb; if(!b)return null; const fr=data.baustellen.find(x=>x.id===b.id)||b;
    const ei=data.stundeneintraege.filter(e=>e.baustelleId===b.id);
    const mg=data.maengel.filter(m=>m.baustelleId===b.id);
    const del=()=>{if(confirm('Löschen?')){setData(p=>({...p,baustellen:p.baustellen.filter(x=>x.id!==b.id),stundeneintraege:p.stundeneintraege.filter(x=>x.baustelleId!==b.id),kalender:p.kalender.filter(x=>x.baustelleId!==b.id),maengel:p.maengel.filter(x=>x.baustelleId!==b.id),bautagebuch:p.bautagebuch.filter(x=>x.baustelleId!==b.id),dokumente:p.dokumente.filter(x=>x.baustelleId!==b.id)}));show('Gelöscht');setV('bst');}};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title={fr.kunde} onBack={()=>setV('bst')} right={chef&&<div className="flex gap-3"><button onClick={()=>{setEm(true);setV('bsf');}} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-700"><Edit3 size={18}/></button><button onClick={del} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-red-500"><Trash2 size={18}/></button></div>}/>
      <div className="p-4 space-y-3">
        {/* Fortschritt */}
        <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-200">
          <div className="flex justify-between items-center mb-2"><span className="text-gray-400 text-xs">Baufortschritt</span><span className="text-gray-900 text-sm font-bold">{fr.fortschritt||0}%</span></div>
          <PBar value={fr.fortschritt||0}/>
          {chef&&<input type="range" min="0" max="100" value={fr.fortschritt||0} className="w-full mt-2" style={{accentColor:'#A04878'}} onChange={e=>setData(p=>({...p,baustellen:p.baustellen.map(x=>x.id===b.id?{...x,fortschritt:Number(e.target.value)}:x)}))}/>}
        </div>
        {/* Info */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl shadow-sm p-2 border border-gray-200"><p className="text-gray-400 text-xs mb-0.5">Kontakt</p><p className="text-gray-700 text-xs">{fr.ansprechpartner||'-'}</p><p className="text-xs" style={{color:ACC}}>{fr.telefon||'-'}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-2 border border-gray-200"><p className="text-gray-400 text-xs mb-0.5">Zugang</p><p className="text-gray-700 text-xs">{fr.zugang||'-'}</p></div>
        </div>
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">{[
          {i:Clock,l:'Stunden',a:()=>setV('ste')},
          {i:AlertCircle,l:'Mängel',a:()=>setV('mng'),c:mg.filter(m=>m.status!=='erledigt').length},
          {i:Paperclip,l:'Doku',a:()=>setV('dok')},
          {i:ClipboardList,l:'Tagebuch',a:()=>setV('btb')},
        ].map(({i:I,l,a,c})=><button key={l} onClick={a} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col items-center gap-1 hover:border-purple-300 relative"><I size={16} className="text-gray-500"/><span className="text-gray-400 text-xs">{l}</span>{c>0&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{c}</span>}</button>)}</div>
        {/* Details */}
        <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-200 text-xs space-y-1">
          <p className="text-gray-900 text-sm font-medium mb-1">Details</p>
          {[['Räume',fr.details?.raeume],['Fläche',fr.details?.flaeche],['Zeitraum',`${fr.startdatum?fK(fr.startdatum):'?'} – ${fr.enddatum?fK(fr.enddatum):'?'}`]].map(([l,vl])=><div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-gray-900">{vl||'-'}</span></div>)}
          <p className="text-gray-400 pt-1 border-t border-gray-200">Arbeiten: <span className="text-gray-900">{fr.details?.arbeiten||'-'}</span></p>
        </div>
        {/* Team */}
        <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-200">
          <p className="text-gray-900 text-sm font-medium mb-2">Team</p>
          <div className="flex flex-wrap gap-1">
            {(fr.mitarbeiter||[]).map(id=>{const u=data.users.find(x=>x.id===id);return u?<Bdg key={id} text={u.name}/>:null;})}
            {(fr.subunternehmer||[]).map(id=>{const s=data.subunternehmer.find(x=>x.id===id);return s?<Bdg key={id} text={s.name} color="#3b82f6"/>:null;})}
          </div>
        </div>
        {/* Einträge */}
        <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-200">
          <p className="text-gray-900 text-sm font-medium mb-2">Einträge ({ei.length})</p>
          {ei.length===0?<p className="text-gray-400 text-xs">Keine</p>:ei.slice(-3).reverse().map(e=><div key={e.id} className="p-2 rounded-lg bg-gray-50 mb-1 text-xs"><div className="flex justify-between"><span className="text-gray-900">{eName(e)}{e.personTyp==='sub'&&<span className="text-blue-400 ml-1">(Sub)</span>}{e.personTyp==='sonstige'&&<span className="text-yellow-400 ml-1">(Sonstige)</span>}</span><span className="text-gray-400">{fK(e.datum)}</span></div><p className="text-gray-500">{e.arbeit}</p><p style={{color:ACC}}>{bStd(e.beginn,e.ende,e.pause)}h</p></div>)}
        </div>
        <button onClick={()=>setV('ste')} className="w-full py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{background:BTN}}><Clock size={20}/>Stunden eintragen</button>
      </div>
    </div>;
  };

  // ==================== BAUSTELLE FORM ====================
  const BstForm = () => {
    const ex=em&&sb?data.baustellen.find(b=>b.id===sb.id):null;
    const [f,sF]=useState({kunde:ex?.kunde||'',adresse:ex?.adresse||'',status:ex?.status||'geplant',fortschritt:ex?.fortschritt||0,ansprechpartner:ex?.ansprechpartner||'',telefon:ex?.telefon||'',zugang:ex?.zugang||'',startdatum:ex?.startdatum||'',enddatum:ex?.enddatum||'',raeume:ex?.details?.raeume||'',flaeche:ex?.details?.flaeche||'',arbeiten:ex?.details?.arbeiten||'',bauleiter:ex?.details?.bauleiter||'',budget:ex?.budget||'',mitarbeiter:ex?.mitarbeiter||[],subunternehmer:ex?.subunternehmer||[]});
    const tg=(k,id)=>sF(p=>({...p,[k]:p[k].includes(id)?p[k].filter(x=>x!==id):[...p[k],id]}));
    const save=()=>{if(!f.kunde.trim()){show('Name nötig','error');return;}const bd={id:ex?.id||nid(data.baustellen),...f,budget:f.budget?Number(f.budget):0,details:{raeume:f.raeume,flaeche:f.flaeche,arbeiten:f.arbeiten,bauleiter:f.bauleiter}};setData(p=>({...p,baustellen:ex?p.baustellen.map(b=>b.id===ex.id?bd:b):[...p.baustellen,bd]}));setSb(bd);setEm(false);show(ex?'Aktualisiert':'Angelegt');setV('bsd');};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title={ex?'Bearbeiten':'Neue Baustelle'} onBack={()=>{setEm(false);setV(ex?'bsd':'bst');}}/>
      <div className="p-4 space-y-3">
        <div><label className="text-gray-400 text-xs mb-1 block">Kunde *</label><input value={f.kunde} onChange={e=>sF({...f,kunde:e.target.value})} className={IC}/></div>
        <div><label className="text-gray-400 text-xs mb-1 block">Adresse</label><input value={f.adresse} onChange={e=>sF({...f,adresse:e.target.value})} className={IC}/></div>
        <div><label className="text-gray-400 text-xs mb-1 block">Status</label><div className="flex gap-2">{['geplant','aktiv','fertig','abgerechnet'].map(s=><button key={s} onClick={()=>sF({...f,status:s})} className={`flex-1 py-3 rounded-lg text-xs ${f.status===s?'text-white':'bg-gray-100 text-gray-500 border border-gray-200'}`} style={f.status===s?{background:BTN}:{}}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="text-gray-400 text-xs mb-1 block">Kontakt</label><input value={f.ansprechpartner} onChange={e=>sF({...f,ansprechpartner:e.target.value})} className={IC}/></div><div><label className="text-gray-400 text-xs mb-1 block">Telefon</label><input value={f.telefon} onChange={e=>sF({...f,telefon:e.target.value})} className={IC}/></div></div>
        <div><label className="text-gray-400 text-xs mb-1 block">Zugang</label><input value={f.zugang} onChange={e=>sF({...f,zugang:e.target.value})} className={IC}/></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="text-gray-400 text-xs mb-1 block">Start</label><input type="date" value={f.startdatum} onChange={e=>sF({...f,startdatum:e.target.value})} className={IC}/></div><div><label className="text-gray-400 text-xs mb-1 block">Ende</label><input type="date" value={f.enddatum} onChange={e=>sF({...f,enddatum:e.target.value})} className={IC}/></div></div>
        <div><label className="text-gray-400 text-xs mb-1 block">Budget (€)</label><input type="number" value={f.budget} onChange={e=>sF({...f,budget:e.target.value})} placeholder="z.B. 50000" className={IC}/></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="text-gray-400 text-xs mb-1 block">Räume</label><input value={f.raeume} onChange={e=>sF({...f,raeume:e.target.value})} className={IC}/></div><div><label className="text-gray-400 text-xs mb-1 block">Fläche</label><input value={f.flaeche} onChange={e=>sF({...f,flaeche:e.target.value})} className={IC}/></div></div>
        <div><label className="text-gray-400 text-xs mb-1 block">Arbeiten</label><textarea value={f.arbeiten} onChange={e=>sF({...f,arbeiten:e.target.value})} rows={2} className={IC+" resize-none"}/></div>
        <div className="border-t border-gray-200 pt-3"><p className="text-gray-900 text-sm mb-2">Handwerker</p>{data.users.filter(u=>u.role==='mitarbeiter').length===0?<p className="text-gray-400 text-xs">Noch keine Handwerker angelegt. <button onClick={()=>setV('mitf')} className="underline" style={{color:ACC}}>Jetzt anlegen →</button></p>:<div className="flex flex-wrap gap-2">{data.users.filter(u=>u.role==='mitarbeiter').map(u=><button key={u.id} onClick={()=>tg('mitarbeiter',u.id)} className={`px-3 py-2 rounded-lg text-xs ${f.mitarbeiter.includes(u.id)?'text-white':'bg-gray-100 text-gray-500 border border-gray-200'}`} style={f.mitarbeiter.includes(u.id)?{background:BTN}:{}}>{f.mitarbeiter.includes(u.id)&&<Check size={12} className="inline mr-1"/>}{u.name}</button>)}</div>}</div>
        <div className="border-t border-gray-200 pt-3"><p className="text-gray-900 text-sm mb-2">Subunternehmer</p>{data.subunternehmer.length===0?<p className="text-gray-400 text-xs">Noch keine Subunternehmer angelegt. <button onClick={()=>setV('sub')} className="underline" style={{color:ACC}}>Jetzt anlegen →</button></p>:<div className="flex flex-wrap gap-2">{data.subunternehmer.map(s=><button key={s.id} onClick={()=>tg('subunternehmer',s.id)} className={`px-3 py-2 rounded-lg text-xs ${f.subunternehmer.includes(s.id)?'text-white bg-blue-600':'bg-gray-100 text-gray-500 border border-gray-200'}`}>{f.subunternehmer.includes(s.id)&&<Check size={12} className="inline mr-1"/>}{s.name}</button>)}</div>}</div>
        <button onClick={save} className="w-full py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{background:BTN}}><Save size={18}/>{ex?'Speichern':'Anlegen'}</button>
      </div>
    </div>;
  };

  // ==================== STUNDEN EINTRAGEN ====================
  const SteView = () => {
    const [editId,setEditId]=useState(null);
    const initFd={baustelleId:sb?.id||'',datum:new Date().toISOString().split('T')[0],beginn:'07:00',ende:'16:00',pause:30,fahrtzeit:30,arbeit:'',material:'',fotos:[],personTyp:'mitarbeiter',mitarbeiterId:chef?'':cu.id,subId:'',personName:''};
    const [fd,sFd]=useState(initFd);
    const [saved,setSaved]=useState(false);
    const [showList,setShowList]=useState(false);
    const mb=chef?data.baustellen:data.baustellen.filter(b=>b.mitarbeiter.includes(cu.id));

    const startEdit=(e)=>{setEditId(e.id);sFd({baustelleId:String(e.baustelleId),datum:e.datum,beginn:e.beginn,ende:e.ende,pause:e.pause,fahrtzeit:e.fahrtzeit||0,arbeit:e.arbeit,material:e.material||'',fotos:e.fotos||[],personTyp:e.personTyp||'mitarbeiter',mitarbeiterId:e.mitarbeiterId||'',subId:e.subId||'',personName:e.personName||''});setShowList(false);};

    const save=()=>{
      if(!fd.baustelleId||!fd.arbeit.trim()){show('Baustelle & Arbeit nötig','error');return;}
      if(fd.personTyp==='mitarbeiter'&&!fd.mitarbeiterId){show('Mitarbeiter wählen','error');return;}
      if(fd.personTyp==='sub'&&!fd.subId){show('Subunternehmer wählen','error');return;}
      if(fd.personTyp==='sonstige'&&!fd.personName.trim()){show('Name eingeben','error');return;}
      const entry={...fd,baustelleId:Number(fd.baustelleId),mitarbeiterId:fd.personTyp==='mitarbeiter'?Number(fd.mitarbeiterId):null,subId:fd.personTyp==='sub'?Number(fd.subId):null,personName:fd.personTyp==='sonstige'?fd.personName.trim():''};
      if(editId){setData(p=>({...p,stundeneintraege:p.stundeneintraege.map(e=>e.id===editId?{...entry,id:editId}:e)}));show('Aktualisiert');setEditId(null);}
      else{setData(p=>({...p,stundeneintraege:[...p.stundeneintraege,{id:nid(p.stundeneintraege),...entry}]}));const pn=fd.personTyp==='mitarbeiter'?data.users.find(u=>u.id===Number(fd.mitarbeiterId))?.name:fd.personTyp==='sub'?data.subunternehmer.find(s=>s.id===Number(fd.subId))?.name:fd.personName;addN('stunden',`${pn||cu.name}: Stunden eingetragen`,Number(fd.baustelleId));}
      setSaved(true);setTimeout(()=>{sFd(initFd);setSaved(false);if(!chef)setV(sb?'bsd':'dash');},1200);
    };

    const delEntry=(id)=>{if(confirm('Eintrag löschen?')){setData(p=>({...p,stundeneintraege:p.stundeneintraege.filter(e=>e.id!==id)}));show('Gelöscht');}};

    // Einträge für gewählte Baustelle
    const bsEintraege=fd.baustelleId?data.stundeneintraege.filter(e=>e.baustelleId===Number(fd.baustelleId)):[];

    if(saved) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3"><Check className="text-green-400" size={28}/></div><p className="text-gray-900">{editId?'Aktualisiert!':'Gespeichert!'}</p></div></div>;
    return <div className="min-h-screen bg-gray-50">
      <Hdr title={editId?'Stunden bearbeiten':'Stunden eintragen'} onBack={()=>{setEditId(null);setV(sb?'bsd':'dash');}} right={chef&&bsEintraege.length>0&&<button onClick={()=>setShowList(!showList)} className="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-700 bg-gray-100">{showList?'Formular':'Einträge ('+bsEintraege.length+')'}</button>}/>

      {/* Einträge-Liste (Chef) */}
      {showList&&chef?<div className="p-4 space-y-2">{[...bsEintraege].reverse().map(e=>{const bs=data.baustellen.find(b=>b.id===e.baustelleId);return <div key={e.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-1"><div><p className="text-gray-900 text-sm">{eName(e)}{e.personTyp==='sub'&&<span className="text-blue-400 text-xs ml-1">(Sub)</span>}{e.personTyp==='sonstige'&&<span className="text-yellow-400 text-xs ml-1">(Sonstige)</span>}</p><p className="text-gray-400 text-xs">{fDat(e.datum)} · {e.beginn}–{e.ende}</p></div><span className="font-medium text-sm" style={{color:'#A04878'}}>{bStd(e.beginn,e.ende,e.pause)}h</span></div>
        <p className="text-gray-400 text-xs">{e.arbeit}</p>
        {e.material&&<p className="text-gray-400 text-xs">Material: {e.material}</p>}
        <div className="flex gap-3 mt-2"><button onClick={()=>startEdit(e)} className="px-3 py-2 rounded text-xs bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center gap-1"><Edit3 size={12}/>Bearbeiten</button><button onClick={()=>delEntry(e.id)} className="px-3 py-2 rounded text-xs bg-gray-200 text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 size={12}/>Löschen</button></div>
      </div>;})}</div>

      /* Formular */
      :<div className="p-4 space-y-3">
        <select value={fd.baustelleId} onChange={e=>sFd({...fd,baustelleId:e.target.value})} className={IC}><option value="">Baustelle...</option>{mb.map(b=><option key={b.id} value={b.id}>{b.kunde}</option>)}</select>

        {/* Person auswählen (Chef) */}
        {chef&&<div className="space-y-2">
          <label className="text-gray-400 text-xs block">Stunden für:</label>
          <div className="flex gap-2">{[{id:'mitarbeiter',l:'Handwerker'},{id:'sub',l:'Subunternehmer'},{id:'sonstige',l:'Sonstige'}].map(({id,l})=><button key={id} onClick={()=>sFd({...fd,personTyp:id,mitarbeiterId:id==='mitarbeiter'?'':fd.mitarbeiterId,subId:id==='sub'?'':fd.subId})} className={`flex-1 py-3 rounded-lg text-xs ${fd.personTyp===id?'text-white':'bg-gray-100 text-gray-500 border border-gray-200'}`} style={fd.personTyp===id?{background:BTN}:{}}>{l}</button>)}</div>
          {fd.personTyp==='mitarbeiter'&&<select value={fd.mitarbeiterId} onChange={e=>sFd({...fd,mitarbeiterId:e.target.value})} className={IC}><option value="">Handwerker wählen...</option>{data.users.filter(u=>u.role==='mitarbeiter').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}<option value={cu.id}>{cu.name} (ich)</option></select>}
          {fd.personTyp==='sub'&&<select value={fd.subId} onChange={e=>sFd({...fd,subId:e.target.value})} className={IC}><option value="">Subunternehmer wählen...</option>{data.subunternehmer.map(s=><option key={s.id} value={s.id}>{s.name}{s.gewerk?` (${s.gewerk})`:''}</option>)}</select>}
          {fd.personTyp==='sonstige'&&<input value={fd.personName} onChange={e=>sFd({...fd,personName:e.target.value})} placeholder="Name (z.B. Probearbeiter, Aushilfe...)" className={IC}/>}
        </div>}

        <input type="date" value={fd.datum} onChange={e=>sFd({...fd,datum:e.target.value})} className={IC}/>
        <div className="grid grid-cols-2 gap-2"><div><label className="text-gray-400 text-xs mb-1 block">Beginn</label><input type="time" value={fd.beginn} onChange={e=>sFd({...fd,beginn:e.target.value})} className={IC}/></div><div><label className="text-gray-400 text-xs mb-1 block">Ende</label><input type="time" value={fd.ende} onChange={e=>sFd({...fd,ende:e.target.value})} className={IC}/></div></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="text-gray-400 text-xs mb-1 block">Pause (Min)</label><input type="number" value={fd.pause} onChange={e=>sFd({...fd,pause:Number(e.target.value)})} className={IC}/></div><div><label className="text-gray-400 text-xs mb-1 block">Fahrtzeit</label><input type="number" value={fd.fahrtzeit} onChange={e=>sFd({...fd,fahrtzeit:Number(e.target.value)})} className={IC}/></div></div>
        <textarea value={fd.arbeit} onChange={e=>sFd({...fd,arbeit:e.target.value})} placeholder="Was wurde gemacht? *" rows={2} className={IC+" resize-none"}/>
        <input value={fd.material} onChange={e=>sFd({...fd,material:e.target.value})} placeholder="Material verbraucht..." className={IC}/>
        <div><label className="text-gray-400 text-xs mb-1 block">Fotos</label><PhotoGrid fotos={fd.fotos} onAdd={()=>trigPhoto(img=>sFd(p=>({...p,fotos:[...p.fotos,img]})))} onRemove={i=>sFd(p=>({...p,fotos:p.fotos.filter((_,idx)=>idx!==i)}))}/></div>
        {fd.beginn&&fd.ende&&<div className="p-2 rounded-xl text-xs" style={{background:'rgba(142,58,158,0.08)',border:'1px solid rgba(160,72,120,0.2)',color:'#A04878'}}><strong>{bStd(fd.beginn,fd.ende,fd.pause)}h</strong> + <strong>{fd.fahrtzeit}min</strong> Fahrt</div>}
        <button onClick={save} disabled={!fd.baustelleId||!fd.arbeit} className="w-full py-4 rounded-xl text-white font-medium disabled:opacity-30 flex items-center justify-center gap-2" style={{background:BTN}}><Save size={18}/>{editId?'Aktualisieren':'Speichern'}</button>
        {editId&&<button onClick={()=>{setEditId(null);sFd(initFd);}} className="w-full py-2 text-gray-400 text-xs hover:text-gray-700">Abbrechen – neuen Eintrag erstellen</button>}
      </div>}
    </div>;
  };

  // ==================== MEINE STUNDEN (Handwerker) ====================
  const MeineStd = () => {
    const h=new Date(); const [mo,setMo]=useState(h.getMonth()); const [jr,setJr]=useState(h.getFullYear());
    const pv=()=>{if(mo===0){setMo(11);setJr(j=>j-1);}else setMo(m=>m-1);}; const nx=()=>{if(mo===11){setMo(0);setJr(j=>j+1);}else setMo(m=>m+1);};
    const all=data.stundeneintraege.filter(e=>e.mitarbeiterId===cu.id);
    const me=all.filter(e=>{const d=new Date(e.datum);return d.getMonth()===mo&&d.getFullYear()===jr;});
    const moH=me.reduce((s,e)=>s+parseFloat(bStd(e.beginn,e.ende,e.pause)),0);
    const totalH=all.reduce((s,e)=>s+parseFloat(bStd(e.beginn,e.ende,e.pause)),0);
    // Gruppiert nach Woche
    const byWeek={};me.forEach(e=>{const d=new Date(e.datum);const day=d.getDay()||7;const thu=new Date(d);thu.setDate(d.getDate()+4-day);const kw=Math.ceil(((thu-new Date(thu.getFullYear(),0,1))/86400000+1)/7);const w=`KW ${String(kw).padStart(2,'0')}`;if(!byWeek[w])byWeek[w]=[];byWeek[w].push(e);});
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Meine Stunden" onBack={()=>setV('dash')}/>
      <div className="p-4">
        {/* Monat Navigation */}
        <div className="flex items-center justify-between mb-3"><button onClick={pv} className="p-2 text-gray-400 hover:text-gray-700"><ChevronLeft size={18}/></button><h2 className="text-gray-900 text-sm font-medium">{new Date(jr,mo).toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</h2><button onClick={nx} className="p-2 text-gray-400 hover:text-gray-700"><ChevronRight size={18}/></button></div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl p-2 bg-white border border-gray-200 shadow-sm text-center"><p className="text-lg font-bold text-gray-900">{moH.toFixed(1)}h</p><p className="text-gray-400 text-xs">Monat</p></div>
          <div className="rounded-xl p-2 bg-white border border-gray-200 shadow-sm text-center"><p className="text-lg font-bold text-gray-900">{me.length}</p><p className="text-gray-400 text-xs">Einträge</p></div>
          <div className="rounded-xl p-2 bg-white border border-gray-200 shadow-sm text-center"><p className="text-lg font-bold" style={{color:ACC}}>{totalH.toFixed(1)}h</p><p className="text-gray-400 text-xs">Gesamt</p></div>
        </div>
        {me.length===0?<Empty icon={Clock} text="Keine Stunden in diesem Monat"/>:
        <div className="space-y-3">{Object.entries(byWeek).reverse().map(([w,entries])=>{const wH=entries.reduce((s,e)=>s+parseFloat(bStd(e.beginn,e.ende,e.pause)),0);return <div key={w} className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-2 border-b border-gray-200 flex justify-between items-center"><span className="text-gray-400 text-xs font-medium">{w}</span><span className="text-gray-700 text-xs font-medium">{wH.toFixed(1)}h</span></div>
          <div className="p-2 space-y-1">{[...entries].reverse().map(e=>{const bs=data.baustellen.find(b=>b.id===e.baustelleId);return <div key={e.id} className="p-2 rounded-lg bg-gray-50 text-xs">
            <div className="flex justify-between items-start"><div><p className="text-gray-900">{bs?.kunde||'?'}</p><p className="text-gray-400">{fDat(e.datum)} · {e.beginn}–{e.ende}</p></div><span className="font-medium" style={{color:ACC}}>{bStd(e.beginn,e.ende,e.pause)}h</span></div>
            <p className="text-gray-500 mt-0.5">{e.arbeit}</p>
          </div>;})}</div>
        </div>;})}</div>}
      </div>
    </div>;
  };

  // ==================== MÄNGELMANAGEMENT ====================
  const MngView = () => {
    const [sf,setSf]=useState(false); const [fl,setFl]=useState('alle');
    const [mf,sMf]=useState({baustelleId:sb?.id||(chef?data.baustellen[0]?.id:data.baustellen.find(b=>b.mitarbeiter.includes(cu.id))?.id)||'',titel:'',beschreibung:'',prioritaet:'mittel',zustaendig:'',frist:'',fotos:[]});
    const myBs=chef?data.baustellen:data.baustellen.filter(b=>b.mitarbeiter.includes(cu.id));
    let ls=sb?data.maengel.filter(m=>m.baustelleId===sb.id):chef?data.maengel:data.maengel.filter(m=>myBs.some(b=>b.id===m.baustelleId));
    if(fl!=='alle')ls=ls.filter(m=>m.status===fl);
    const save=()=>{if(!mf.titel.trim()){show('Titel nötig','error');return;}setData(p=>({...p,maengel:[...p.maengel,{id:nid(p.maengel),baustelleId:Number(mf.baustelleId),titel:mf.titel,beschreibung:mf.beschreibung,prioritaet:mf.prioritaet,status:'offen',zustaendig:mf.zustaendig?Number(mf.zustaendig):null,erstelltAm:new Date().toISOString().split('T')[0],frist:mf.frist,fotos:mf.fotos}]}));addN('mangel',`Mangel: ${mf.titel}`,Number(mf.baustelleId));show('Erfasst');setSf(false);sMf({...mf,titel:'',beschreibung:'',fotos:[]});};
    const upSt=(id,st)=>{setData(p=>({...p,maengel:p.maengel.map(m=>m.id===id?{...m,status:st}:m)}));show(st==='erledigt'?'Erledigt':'In Arbeit');};
    const delMng=(id)=>{if(confirm('Mangel löschen?')){setData(p=>({...p,maengel:p.maengel.filter(m=>m.id!==id)}));show('Gelöscht');}};
    const pc={hoch:'#ef4444',mittel:'#f59e0b',niedrig:'#22c55e'}; const sl={offen:'Offen',in_arbeit:'In Arbeit',erledigt:'Erledigt'}; const stc={offen:'#ef4444',in_arbeit:'#f59e0b',erledigt:'#22c55e'};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Mängelmanagement" onBack={()=>setV(sb?'bsd':'dash')} right={<button onClick={()=>setSf(!sf)} className="p-2 rounded-lg text-white" style={{background:BTN}}>{sf?<X size={18}/>:<Plus size={18}/>}</button>}/>
      {sf&&<div className="p-4 border-b border-gray-200 space-y-2">
        {!sb&&<select value={mf.baustelleId} onChange={e=>sMf({...mf,baustelleId:e.target.value})} className={IC}><option value="">Baustelle...</option>{myBs.map(b=><option key={b.id} value={b.id}>{b.kunde}</option>)}</select>}
        <input value={mf.titel} onChange={e=>sMf({...mf,titel:e.target.value})} placeholder="Mangel-Titel *" className={IC}/>
        <textarea value={mf.beschreibung} onChange={e=>sMf({...mf,beschreibung:e.target.value})} placeholder="Beschreibung..." rows={2} className={IC+" resize-none"}/>
        <div className="flex gap-2">{['niedrig','mittel','hoch'].map(p=><button key={p} onClick={()=>sMf({...mf,prioritaet:p})} className={`flex-1 py-3 rounded-lg text-xs ${mf.prioritaet===p?'text-white':'bg-gray-100 text-gray-500 border border-gray-200'}`} style={mf.prioritaet===p?{background:pc[p]}:{}}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>)}</div>
        {chef&&<div className="grid grid-cols-2 gap-2"><select value={mf.zustaendig} onChange={e=>sMf({...mf,zustaendig:e.target.value})} className={IC}><option value="">Zuständig...</option>{data.subunternehmer.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}{data.users.filter(u=>u.role==='mitarbeiter').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select><input type="date" value={mf.frist} onChange={e=>sMf({...mf,frist:e.target.value})} className={IC}/></div>}
        <PhotoGrid fotos={mf.fotos} onAdd={()=>trigPhoto(img=>sMf(p=>({...p,fotos:[...p.fotos,img]})))} onRemove={i=>sMf(p=>({...p,fotos:p.fotos.filter((_,idx)=>idx!==i)}))}/>
        <button onClick={save} className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{background:BTN}}><AlertCircle size={16}/>Erfassen</button>
      </div>}
      <div className="px-4 pt-3 pb-1 flex gap-2">{['alle','offen','in_arbeit','erledigt'].map(s=><button key={s} onClick={()=>setFl(s)} className={`px-4 py-2 rounded-full text-xs ${fl===s?'text-white':'bg-gray-100 text-gray-500'}`} style={fl===s?{background:s==='alle'?BTN:stc[s]||BTN}:{}}>{s==='alle'?'Alle':sl[s]}</button>)}</div>
      <div className="p-4 space-y-2">{ls.length===0?<Empty icon={CheckCircle} text="Keine Mängel"/>:ls.map(m=>{const bs=data.baustellen.find(b=>b.id===m.baustelleId);const z=data.subunternehmer.find(s=>s.id===m.zustaendig)||data.users.find(u=>u.id===m.zustaendig);return <div key={m.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
        <div className="flex items-start justify-between mb-1"><div className="flex-1"><p className="text-gray-900 text-sm font-medium">{m.titel}</p><p className="text-gray-400 text-xs">{bs?.kunde}</p></div><div className="flex gap-1"><Bdg text={m.prioritaet} color={pc[m.prioritaet]}/><Bdg text={sl[m.status]} color={stc[m.status]}/></div></div>
        {m.beschreibung&&<p className="text-gray-400 text-xs mb-1">{m.beschreibung}</p>}
        <div className="flex items-center justify-between text-xs"><div className="text-gray-400">{z&&<span>→ {z.name}</span>}{m.frist&&<span className="ml-2">Frist: {fK(m.frist)}</span>}</div>
        {chef&&m.status!=='erledigt'&&<div className="flex gap-3">{m.status==='offen'&&<button onClick={()=>upSt(m.id,'in_arbeit')} className="px-3 py-2 rounded text-xs bg-yellow-500/20 text-yellow-500">In Arbeit</button>}<button onClick={()=>upSt(m.id,'erledigt')} className="px-3 py-2 rounded text-xs bg-green-500/20 text-green-500">Erledigt</button></div>}
        {chef&&<button onClick={()=>delMng(m.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>}</div>
        {m.fotos?.length>0&&<div className="flex gap-1 mt-1">{m.fotos.map((f,i)=><img key={i} src={f} className="w-10 h-10 rounded object-cover"/>)}</div>}
      </div>;})}</div>
    </div>;
  };

  // ==================== BAUTAGEBUCH ====================
  const BtbView = () => {
    const [sf,setSf]=useState(false);
    const ls=sb?data.bautagebuch.filter(b=>b.baustelleId===sb.id):data.bautagebuch;
    const [bf,sBf]=useState({baustelleId:sb?.id||data.baustellen[0]?.id||'',datum:new Date().toISOString().split('T')[0],wetter:'sonnig',temperatur:12,anwesende:[],arbeiten:'',besonderheiten:'',behinderungen:''});
    const tgA=id=>sBf(p=>({...p,anwesende:p.anwesende.includes(id)?p.anwesende.filter(x=>x!==id):[...p.anwesende,id]}));
    const save=()=>{if(!bf.arbeiten.trim()){show('Arbeiten beschreiben','error');return;}setData(p=>({...p,bautagebuch:[...p.bautagebuch,{id:nid(p.bautagebuch),baustelleId:Number(bf.baustelleId),datum:bf.datum,wetter:bf.wetter,temperatur:bf.temperatur,anwesende:bf.anwesende,arbeiten:bf.arbeiten,besonderheiten:bf.besonderheiten,behinderungen:bf.behinderungen}]}));show('Gespeichert');setSf(false);sBf({...bf,arbeiten:'',besonderheiten:'',behinderungen:'',anwesende:[]});};
    const delBtb=(id)=>{if(confirm('Eintrag löschen?')){setData(p=>({...p,bautagebuch:p.bautagebuch.filter(b=>b.id!==id)}));show('Gelöscht');}};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Bautagebuch" onBack={()=>setV(sb?'bsd':'dash')} right={chef&&<button onClick={()=>setSf(!sf)} className="p-2 rounded-lg text-white" style={{background:BTN}}>{sf?<X size={18}/>:<Plus size={18}/>}</button>}/>
      {sf&&<div className="p-4 border-b border-gray-200 space-y-2">
        {!sb&&<select value={bf.baustelleId} onChange={e=>sBf({...bf,baustelleId:e.target.value})} className={IC}><option value="">Baustelle...</option>{data.baustellen.map(b=><option key={b.id} value={b.id}>{b.kunde}</option>)}</select>}
        <input type="date" value={bf.datum} onChange={e=>sBf({...bf,datum:e.target.value})} className={IC}/>
        <div className="flex gap-2">{[{id:'sonnig',i:Sun},{id:'bewölkt',i:Cloud},{id:'regen',i:CloudRain},{id:'schnee',i:CloudSnow}].map(({id,i:I})=><button key={id} onClick={()=>sBf({...bf,wetter:id})} className={`flex-1 p-3 rounded-lg text-xs flex flex-col items-center ${bf.wetter===id?'text-white':'bg-gray-100 text-gray-500 border border-gray-200'}`} style={bf.wetter===id?{background:BTN}:{}}><I size={16}/>{id}</button>)}</div>
        <div><p className="text-gray-400 text-xs mb-1">Anwesende</p><div className="flex flex-wrap gap-2">{data.users.filter(u=>u.role==='mitarbeiter').map(u=><button key={u.id} onClick={()=>tgA(u.id)} className={`px-3 py-2 rounded-lg text-xs ${bf.anwesende.includes(u.id)?'text-white':'bg-gray-100 text-gray-500 border border-gray-200'}`} style={bf.anwesende.includes(u.id)?{background:BTN}:{}}>{u.name}</button>)}</div></div>
        <textarea value={bf.arbeiten} onChange={e=>sBf({...bf,arbeiten:e.target.value})} placeholder="Arbeiten *" rows={2} className={IC+" resize-none"}/>
        <input value={bf.besonderheiten} onChange={e=>sBf({...bf,besonderheiten:e.target.value})} placeholder="Besonderheiten" className={IC}/>
        <input value={bf.behinderungen} onChange={e=>sBf({...bf,behinderungen:e.target.value})} placeholder="Behinderungen" className={IC}/>
        <button onClick={save} className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{background:BTN}}><Save size={16}/>Speichern</button>
      </div>}
      <div className="p-4 space-y-2">{ls.length===0?<Empty icon={ClipboardList} text="Keine Einträge"/>:[...ls].reverse().map(e=>{const bs=data.baustellen.find(b=>b.id===e.baustelleId);return <div key={e.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-1"><div><p className="text-gray-900 text-sm">{bs?.kunde}</p><p className="text-gray-400 text-xs">{fDat(e.datum)}</p></div><div className="flex items-center gap-2">{chef&&<button onClick={()=>delBtb(e.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>}<div className="flex items-center gap-1"><WI w={e.wetter} className="w-3 h-3 text-gray-500"/><span className="text-gray-400 text-xs">{e.temperatur}°</span></div></div></div>
        <p className="text-gray-600 text-xs mb-1">{e.arbeiten}</p>
        {e.besonderheiten&&<p className="text-yellow-500 text-xs">⚡ {e.besonderheiten}</p>}
        {e.behinderungen&&<p className="text-red-400 text-xs">⛔ {e.behinderungen}</p>}
        {e.anwesende?.length>0&&<p className="text-gray-400 text-xs mt-1">{e.anwesende.map(id=>data.users.find(x=>x.id===id)?.name).filter(Boolean).join(', ')}</p>}
      </div>;})}</div>
    </div>;
  };

  // ==================== DOKUMENTE ====================
  const DokView = () => {
    const ds=sb?data.dokumente.filter(d=>d.baustelleId===sb.id):data.dokumente;
    const add=()=>{const n=prompt('Dokumentenname:');if(!n)return;setData(p=>({...p,dokumente:[...p.dokumente,{id:nid(p.dokumente),baustelleId:sb?.id||data.baustellen[0]?.id,name:n,typ:'dokument',groesse:'–',datum:new Date().toISOString().split('T')[0]}]}));show('Hinzugefügt');};
    const del=id=>{setData(p=>({...p,dokumente:p.dokumente.filter(d=>d.id!==id)}));show('Gelöscht');};
    const tc={plan:'#3b82f6',gutachten:'#22c55e',konzept:'#f59e0b',dokument:'#A04878'};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Dokumente" onBack={()=>setV(sb?'bsd':'dash')} right={chef&&<button onClick={add} className="p-2 rounded-lg text-white" style={{background:BTN}}><Plus size={18}/></button>}/>
      <div className="p-4 space-y-2">{ds.length===0?<Empty icon={FileUp} text="Keine Dokumente"/>:ds.map(d=><div key={d.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${tc[d.typ]||'#A04878'}22`}}><FileText size={18} style={{color:tc[d.typ]||'#A04878'}}/></div>
        <div className="flex-1 min-w-0"><p className="text-gray-900 text-sm truncate">{d.name}</p><p className="text-gray-400 text-xs">{d.groesse} · {fK(d.datum)}</p></div>
        {chef&&<button onClick={()=>del(d.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>}
      </div>)}</div>
    </div>;
  };

  // ==================== MATERIALÜBERSICHT ====================
  const MatView = () => {
    const mp={};data.stundeneintraege.forEach(e=>{if(!e.material)return;const bs=data.baustellen.find(b=>b.id===e.baustelleId);const k=bs?.kunde||'?';if(!mp[k])mp[k]=[];mp[k].push({m:e.material,d:e.datum,v:data.users.find(u=>u.id===e.mitarbeiterId)?.name});});
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Materialübersicht" onBack={()=>setV('dash')}/>
      <div className="p-4 space-y-3">{Object.keys(mp).length===0?<Empty icon={Package} text="Kein Material"/>:Object.entries(mp).map(([bs,items])=><div key={bs} className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-200"><p className="text-gray-900 text-sm font-medium">{bs}</p></div>
        <div className="p-3 space-y-2">{items.map((i,idx)=><div key={idx} className="text-xs"><p className="text-gray-600">{i.m}</p><p className="text-gray-400">{i.v} · {fK(i.d)}</p></div>)}</div>
      </div>)}</div>
    </div>;
  };

  // ==================== BENACHRICHTIGUNGEN ====================
  const NotifView = () => {
    const markAll=()=>setData(p=>({...p,benachrichtigungen:p.benachrichtigungen.map(n=>({...n,gelesen:true}))}));
    const clearAll=()=>{if(confirm('Alle Benachrichtigungen löschen?')){setData(p=>({...p,benachrichtigungen:[]}));show('Alle gelöscht');}};
    const delN=(id)=>setData(p=>({...p,benachrichtigungen:p.benachrichtigungen.filter(n=>n.id!==id)}));
    const ti={mangel:AlertCircle,stunden:Clock,info:Bell}; const tc={mangel:'#ef4444',stunden:'#3b82f6',info:'#A04878'};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Benachrichtigungen" onBack={()=>setV('dash')} right={<div className="flex gap-2"><button onClick={markAll} className="text-xs text-gray-400 hover:text-gray-700">Alle gelesen</button>{data.benachrichtigungen.length>0&&<button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500">Alle löschen</button>}</div>}/>
      <div className="p-4 space-y-2">{data.benachrichtigungen.length===0?<Empty icon={Bell} text="Keine"/>:data.benachrichtigungen.map(n=>{const I=ti[n.typ]||Bell;const bs=data.baustellen.find(b=>b.id===n.baustelleId);return <div key={n.id} className={`p-3 rounded-xl border ${n.gelesen?'bg-gray-50 border-gray-200':'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{background:`${tc[n.typ]}15`}}><I size={14} style={{color:tc[n.typ]}}/></div><div className="flex-1"><p className={`text-sm ${n.gelesen?'text-gray-400':'text-gray-900'}`}>{n.text}</p><p className="text-gray-400 text-xs">{bs?.kunde} · {new Date(n.datum).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</p></div><button onClick={()=>delN(n.id)} className="p-2 text-gray-300 hover:text-red-500 flex-shrink-0"><X size={16}/></button></div>
      </div>;})}</div>
    </div>;
  };

  // ==================== KALENDER ====================
  const KalView = () => {
    const h=new Date(); const [mo,setMo]=useState(h.getMonth()); const [jr,setJr]=useState(h.getFullYear());
    const [selDay,setSelDay]=useState(null); const [sf,setSf]=useState(false);
    const [kf,sKf]=useState({titel:'',baustelleId:'',mitarbeiter:[]});
    const pv=()=>{if(mo===0){setMo(11);setJr(j=>j-1);}else setMo(m=>m-1);}; const nx=()=>{if(mo===11){setMo(0);setJr(j=>j+1);}else setMo(m=>m+1);};
    const off=((new Date(jr,mo,1).getDay()+6)%7); const days=new Date(jr,mo+1,0).getDate();
    const tm=data.kalender.filter(t=>{const d=new Date(t.datum);return d.getMonth()===mo&&d.getFullYear()===jr;});
    const dayTermine=selDay?data.kalender.filter(t=>t.datum===selDay):[];
    const tgM=(id)=>sKf(p=>({...p,mitarbeiter:p.mitarbeiter.includes(id)?p.mitarbeiter.filter(x=>x!==id):[...p.mitarbeiter,id]}));
    const saveTermin=()=>{if(!kf.titel.trim()){show('Titel nötig','error');return;}setData(p=>({...p,kalender:[...p.kalender,{id:nid(p.kalender),datum:selDay,baustelleId:kf.baustelleId?Number(kf.baustelleId):null,titel:kf.titel,mitarbeiter:kf.mitarbeiter}]}));show('Termin gespeichert');setSf(false);sKf({titel:'',baustelleId:'',mitarbeiter:[]});};
    const delTermin=(id)=>{if(confirm('Termin löschen?')){setData(p=>({...p,kalender:p.kalender.filter(t=>t.id!==id)}));show('Gelöscht');}};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Kalender" onBack={()=>setV('dash')}/>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3"><button onClick={pv} className="p-2 text-gray-400 hover:text-gray-700"><ChevronLeft size={18}/></button><h2 className="text-gray-900 text-sm font-medium">{new Date(jr,mo).toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</h2><button onClick={nx} className="p-2 text-gray-400 hover:text-gray-700"><ChevronRight size={18}/></button></div>
        <div className="grid grid-cols-7 gap-1 mb-3">{['Mo','Di','Mi','Do','Fr','Sa','So'].map(t=><div key={t} className="text-center text-gray-400 text-xs py-1">{t}</div>)}
        {Array.from({length:42},(_,i)=>{const tg=i-off+1;const ok=tg>=1&&tg<=days;const ist=ok&&tg===h.getDate()&&mo===h.getMonth()&&jr===h.getFullYear();const dat=`${jr}-${String(mo+1).padStart(2,'0')}-${String(tg).padStart(2,'0')}`;const hat=ok&&data.kalender.some(t=>t.datum===dat);const sel=ok&&dat===selDay;
          return <button key={i} disabled={!ok} onClick={()=>{if(ok){setSelDay(dat);setSf(false);}}} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative cursor-pointer transition-all ${!ok?'text-gray-200 cursor-default':sel?'text-white ring-2 ring-purple-400':ist?'text-white':'text-gray-700 hover:bg-gray-100'}`} style={sel?{background:BTN}:ist?{background:'rgba(160,72,120,0.3)'}:{}}>{ok&&tg}{hat&&<div className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{background:(sel||ist)?'#fff':'#A04878'}}/>}</button>;
        })}</div>

        {/* Ausgewählter Tag */}
        {selDay&&<div className="border-t border-gray-200 pt-3 space-y-2">
          <div className="flex items-center justify-between"><h3 className="text-gray-900 text-sm font-medium">{fDat(selDay)}</h3>
            {chef&&<button onClick={()=>setSf(!sf)} className="px-4 py-2 rounded-lg text-xs text-white flex items-center gap-2" style={{background:BTN}}>{sf?<><X size={14}/>Abbrechen</>:<><Plus size={14}/>Termin</>}</button>}
          </div>

          {sf&&<div className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm space-y-2">
            <input value={kf.titel} onChange={e=>sKf({...kf,titel:e.target.value})} placeholder="Termin / Notiz *" className={IC}/>
            <select value={kf.baustelleId} onChange={e=>sKf({...kf,baustelleId:e.target.value})} className={IC}><option value="">Baustelle (optional)</option>{data.baustellen.map(b=><option key={b.id} value={b.id}>{b.kunde}</option>)}</select>
            {data.users.filter(u=>u.role==='mitarbeiter').length>0&&<div><p className="text-gray-400 text-xs mb-1">Mitarbeiter</p><div className="flex flex-wrap gap-2">{data.users.filter(u=>u.role==='mitarbeiter').map(u=><button key={u.id} onClick={()=>tgM(u.id)} className={`px-3 py-2 rounded-lg text-xs ${kf.mitarbeiter.includes(u.id)?'text-white':'bg-gray-100 text-gray-500 border border-gray-200'}`} style={kf.mitarbeiter.includes(u.id)?{background:BTN}:{}}>{u.name}</button>)}</div></div>}
            <button onClick={saveTermin} className="w-full py-2 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2" style={{background:BTN}}><Save size={14}/>Speichern</button>
          </div>}

          {dayTermine.length===0&&!sf&&<p className="text-gray-400 text-xs">Keine Termine an diesem Tag</p>}
          {dayTermine.map(t=>{const bs=data.baustellen.find(b=>b.id===t.baustelleId);return <div key={t.id} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm text-xs">
            <div className="flex justify-between items-start"><div className="flex-1"><span className="text-gray-900 font-medium">{t.titel}</span>{bs&&<p style={{color:ACC}}>{bs.kunde}</p>}{t.mitarbeiter?.length>0&&<p className="text-gray-400 mt-0.5">{t.mitarbeiter.map(id=>data.users.find(u=>u.id===id)?.name).filter(Boolean).join(', ')}</p>}</div>
            {chef&&<button onClick={()=>delTermin(t.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>}</div>
          </div>;})}
        </div>}

        {/* Alle Termine des Monats wenn kein Tag gewählt */}
        {!selDay&&<div className="border-t border-gray-200 pt-3 space-y-2"><h3 className="text-gray-900 text-sm font-medium">{tm.length?'Termine diesen Monat':'Keine Termine — Tag antippen zum Hinzufügen'}</h3>{tm.map(t=>{const bs=data.baustellen.find(b=>b.id===t.baustelleId);return <div key={t.id} className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm text-xs"><div className="flex justify-between"><span className="text-gray-900 font-medium">{t.titel}</span><span className="text-gray-400">{fK(t.datum)}</span></div>{bs&&<p style={{color:ACC}}>{bs.kunde}</p>}</div>;})}</div>}
      </div>
    </div>;
  };

  // ==================== TAGESÜBERSICHT ====================
  const TagView = () => {
    const [dt,setDt]=useState(new Date().toISOString().split('T')[0]); const te=data.stundeneintraege.filter(e=>e.datum===dt);
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Tagesübersicht" onBack={()=>setV('dash')}/>
      <div className="p-4"><input type="date" value={dt} onChange={e=>setDt(e.target.value)} className={IC+" mb-3"}/>
        <div className="grid grid-cols-2 gap-2 mb-3"><div className="bg-white rounded-xl shadow-sm p-2 border border-gray-200"><p className="text-lg font-bold" style={{color:ACC}}>{te.length}</p><p className="text-gray-400 text-xs">Einträge</p></div><div className="bg-white rounded-xl shadow-sm p-2 border border-gray-200"><p className="text-lg font-bold text-gray-900">{te.reduce((s,e)=>s+parseFloat(bStd(e.beginn,e.ende,e.pause)),0).toFixed(1)}h</p><p className="text-gray-400 text-xs">Gesamt</p></div></div>
        {te.length===0?<p className="text-gray-400 text-center py-8 text-sm">Keine Einträge</p>:<div className="space-y-2">{te.map(e=>{const bs=data.baustellen.find(b=>b.id===e.baustelleId);return <div key={e.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm"><div className="flex justify-between items-start mb-1"><div><p className="text-gray-900 text-sm">{bs?.kunde}</p><p className="text-gray-400 text-xs">{eName(e)}{e.personTyp==='sub'&&<span className="text-blue-400 ml-1">(Sub)</span>}{e.personTyp==='sonstige'&&<span className="text-yellow-400 ml-1">(Sonstige)</span>}</p></div><span className="font-medium text-sm" style={{color:ACC}}>{bStd(e.beginn,e.ende,e.pause)}h</span></div><p className="text-gray-400 text-xs">{e.arbeit}</p>{e.material&&<p className="text-gray-400 text-xs mt-1">Material: {e.material}</p>}</div>;})}</div>}
      </div>
    </div>;
  };

  // ==================== REGIEBERICHTE ====================
  const RegView = () => {
    const [sd,setSd]=useState(new Date().toISOString().split('T')[0]); const [bi,sBi]=useState(data.baustellen[0]?.id); const [sig,sSig]=useState(null);
    const bs=data.baustellen.find(b=>b.id===bi); const te=data.stundeneintraege.filter(e=>e.baustelleId===bi&&e.datum===sd);
    const gh=te.reduce((s,e)=>s+parseFloat(bStd(e.beginn,e.ende,e.pause)),0); const gf=te.reduce((s,e)=>s+e.fahrtzeit,0);
    const print=()=>{const w=window.open('','_blank');if(!w){show('Popup-Blocker!','error');return;}
      w.document.write('<!DOCTYPE html><html><head><title>Regiebericht</title><style>body{font-family:Arial;padding:30px;color:#333;font-size:14px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5}.sum{background:#f9fafb}</style></head><body>');
      w.document.write('<div style="border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:15px"><span style="background:linear-gradient(to right,#8E3A9E,#A04878);color:white;font-weight:bold;padding:8px 12px;border-radius:6px;display:inline-block">MA</span> <b style="margin-left:10px">MA CONSTRUCTION</b> – Regiebericht</div>');
      w.document.write('<p><b>Datum:</b> '+fDat(sd)+'</p><p><b>Baustelle:</b> '+(bs?.kunde||'')+'</p><p><b>Adresse:</b> '+(bs?.adresse||'')+'</p>');
      w.document.write('<table><tr><th>Person</th><th>Zeit</th><th>Stunden</th><th>Tätigkeit</th><th>Material</th></tr>');
      te.forEach(e=>{w.document.write('<tr><td>'+eName(e)+(e.personTyp==='sub'?' (Sub)':e.personTyp==='sonstige'?' (Sonstige)':'')+'</td><td>'+e.beginn+'–'+e.ende+'</td><td>'+bStd(e.beginn,e.ende,e.pause)+'h</td><td>'+e.arbeit+'</td><td>'+(e.material||'–')+'</td></tr>');});
      w.document.write('</table>');
      w.document.write('<table style="margin-top:10px"><tr class="sum"><td><b>Arbeitsstunden gesamt</b></td><td style="text-align:right"><b>'+gh.toFixed(1)+' h</b></td></tr>');
      if(gf>0)w.document.write('<tr><td>Fahrtzeit gesamt</td><td style="text-align:right">'+gf+' Min</td></tr>');
      w.document.write('</table>');
      w.document.write('<p style="margin-top:30px;color:#888;font-size:12px">Unterschrift Auftraggeber:</p>');
      if(sig)w.document.write('<img src="'+sig+'" style="height:80px;border:1px solid #d1d5db;border-radius:8px;padding:5px"/>');
      else w.document.write('<div style="border:2px dashed #ccc;height:60px;border-radius:8px;margin-top:5px"></div>');
      w.document.write('</body></html>');w.document.close();setTimeout(()=>w.print(),300);show('Druckvorschau geöffnet');
    };
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Regieberichte" onBack={()=>setV('dash')}/>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2"><select value={bi} onChange={e=>sBi(Number(e.target.value))} className={IC}>{data.baustellen.map(b=><option key={b.id} value={b.id}>{b.kunde}</option>)}</select><input type="date" value={sd} onChange={e=>setSd(e.target.value)} className={IC}/></div>
        {/* Vorschau */}
        <div className="bg-white rounded-xl p-3 text-xs shadow-sm border border-gray-200" style={{color:'#1f2937'}}>
          <div className="border-b pb-2 mb-2 flex items-center gap-2" style={{borderColor:'#e5e7eb'}}><div className="w-7 h-7 rounded flex items-center justify-center" style={{background:G}}><span className="text-white font-bold text-xs">MA</span></div><div><p className="font-bold text-xs">MA CONSTRUCTION</p><p style={{color:'#6b7280'}} className="text-xs">Regiebericht</p></div></div>
          <div className="space-y-0.5">{[['Datum',fDat(sd)],['Baustelle',bs?.kunde],['Adresse',bs?.adresse]].map(([l,vl])=><div key={l} className="flex justify-between"><span style={{color:'#6b7280'}}>{l}:</span><span className="font-medium">{vl}</span></div>)}
          </div>
          <div className="border-t mt-2 pt-2" style={{borderColor:'#e5e7eb'}}><p className="font-medium mb-1">Arbeitszeiten:</p>
            {te.length===0?<p style={{color:'#6b7280'}}>Keine Einträge</p>:te.map(e=><div key={e.id} className="rounded p-1.5 mb-1" style={{backgroundColor:'#f9fafb'}}><div className="flex justify-between"><span className="font-medium">{eName(e)}{e.personTyp==='sub'?' (Sub)':e.personTyp==='sonstige'?' (Sonstige)':''}</span><span className="font-bold">{bStd(e.beginn,e.ende,e.pause)}h</span></div><p style={{color:'#6b7280'}}>{e.beginn}–{e.ende}</p><p style={{color:'#4b5563'}}>{e.arbeit}</p>{e.material&&<p style={{color:'#6b7280'}}>Material: {e.material}</p>}</div>)}
          </div>
          {te.length>0&&<div className="border-t mt-2 pt-2 space-y-1" style={{borderColor:'#e5e7eb'}}>
            <div className="flex justify-between"><span style={{color:'#6b7280'}}>Stunden gesamt</span><span className="font-bold">{gh.toFixed(1)}h</span></div>
            {gf>0&&<div className="flex justify-between"><span style={{color:'#6b7280'}}>Fahrtzeit</span><span className="font-medium">{gf} Min</span></div>}
          </div>}
          <div className="border-t mt-2 pt-2" style={{borderColor:'#e5e7eb'}}><p style={{color:'#6b7280'}} className="mb-1">Unterschrift Auftraggeber:</p><SigPad sig={sig} onSave={s=>sSig(s)} onClear={()=>sSig(null)}/></div>
        </div>
        <button onClick={print} className="w-full py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{background:'#1f2937'}}><Printer size={18}/>Drucken / PDF</button>
      </div>
    </div>;
  };

  // ==================== MITARBEITER ====================
  const MitView = () => {
    const ma=data.users.filter(u=>u.role==='mitarbeiter');
    const del=id=>{if(confirm('Löschen?')){setData(p=>({...p,users:p.users.filter(u=>u.id!==id),baustellen:p.baustellen.map(b=>({...b,mitarbeiter:b.mitarbeiter.filter(m=>m!==id)}))}));show('Gelöscht');}};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Handwerker" onBack={()=>setV('dash')} right={<button onClick={()=>{setSb(null);setEm(false);setV('mitf');}} className="p-2 rounded-lg text-white" style={{background:BTN}}><Plus size={18}/></button>}/>
      <div className="p-4 space-y-2">{ma.map(m=>{const bs=data.baustellen.filter(b=>b.mitarbeiter.includes(m.id));return <div key={m.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"><User className="text-gray-500" size={16}/></div><div className="flex-1"><p className="text-gray-900 text-sm">{m.name}</p><p className="text-gray-400 text-xs">PIN: {m.pin} · {fE(m.stundensatz||45)}/h</p></div><div className="flex gap-4"><button onClick={()=>{setSb(m);setEm(true);setV('mitf');}} className="p-2 text-gray-400 hover:text-gray-700"><Edit3 size={16}/></button><button onClick={()=>del(m.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button></div></div><div className="flex flex-wrap gap-1">{bs.length===0?<span className="text-gray-400 text-xs">Keine Baustellen</span>:bs.map(b=><Bdg key={b.id} text={b.kunde}/>)}</div></div>;})}</div>
    </div>;
  };

  const MitForm = () => {
    const ex=em&&sb?data.users.find(u=>u.id===sb.id):null;
    const [n,setN]=useState(ex?.name||''); const [p,setP]=useState(ex?.pin||''); const [ss,setSs]=useState(String(ex?.stundensatz||45));
    const save=()=>{
      if(!n.trim()){show('Name nötig','error');return;}
      if(!/^\d{4}$/.test(p)){show('4 Ziffern','error');return;}
      if(data.users.some(u=>u.pin===p&&u.id!==(ex?.id))){show('PIN vergeben','error');return;}
      if(ex){setData(pr=>({...pr,users:pr.users.map(u=>u.id===ex.id?{...u,name:n.trim(),pin:p,stundensatz:Number(ss)||45}:u)}));show('Gespeichert');}
      else{setData(pr=>({...pr,users:[...pr.users,{id:nid(pr.users),name:n.trim(),role:'mitarbeiter',pin:p,stundensatz:Number(ss)||45}]}));show('Angelegt');}
      setEm(false);setSb(null);setV('mit');
    };
    return <div className="min-h-screen bg-gray-50">
      <Hdr title={ex?'Handwerker bearbeiten':'Neuer Handwerker'} onBack={()=>{setEm(false);setSb(null);setV('mit');}}/>
      <div className="p-4 space-y-3">
        <div><label className="text-gray-400 text-xs mb-1 block">Name *</label><input value={n} onChange={e=>setN(e.target.value)} placeholder="Name" className={IC}/></div>
        <div><label className="text-gray-400 text-xs mb-1 block">PIN (4 Ziffern) *</label><input maxLength={4} value={p} onChange={e=>setP(e.target.value.replace(/\D/g,''))} placeholder="PIN" className={IC}/></div>
        <div><label className="text-gray-400 text-xs mb-1 block">Stundensatz (€/h)</label><input type="number" value={ss} onChange={e=>setSs(e.target.value)} placeholder="45" className={IC}/></div>
        <button onClick={save} className="w-full py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{background:BTN}}>{ex?<><Save size={18}/>Speichern</>:<><UserPlus size={18}/>Anlegen</>}</button>
      </div>
    </div>;
  };

  // ==================== SUBUNTERNEHMER ====================
  const SubView = () => {
    const [sf,setSf]=useState(false); const [fn,setFn]=useState(''); const [fg,setFg]=useState(''); const [ft,setFt]=useState('');
    const add=()=>{if(!fn.trim()){show('Name nötig','error');return;}setData(p=>({...p,subunternehmer:[...p.subunternehmer,{id:nid(p.subunternehmer),name:fn.trim(),gewerk:fg,telefon:ft}]}));show('Angelegt');setSf(false);setFn('');setFg('');setFt('');};
    const del=id=>{if(confirm('Löschen?')){setData(p=>({...p,subunternehmer:p.subunternehmer.filter(s=>s.id!==id),baustellen:p.baustellen.map(b=>({...b,subunternehmer:(b.subunternehmer||[]).filter(s=>s!==id)}))}));show('Gelöscht');}};
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Subunternehmer" onBack={()=>setV('dash')} right={<button onClick={()=>setSf(!sf)} className="p-2 rounded-lg text-white" style={{background:BTN}}>{sf?<X size={18}/>:<Plus size={18}/>}</button>}/>
      {sf&&<div className="p-4 border-b border-gray-200 space-y-2"><input value={fn} onChange={e=>setFn(e.target.value)} placeholder="Firma *" className={IC}/><div className="grid grid-cols-2 gap-2"><input value={fg} onChange={e=>setFg(e.target.value)} placeholder="Gewerk" className={IC}/><input value={ft} onChange={e=>setFt(e.target.value)} placeholder="Telefon" className={IC}/></div><button onClick={add} className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{background:BTN}}><Plus size={16}/>Anlegen</button></div>}
      <div className="p-4 space-y-2">{data.subunternehmer.map(s=>{const bs=data.baustellen.filter(b=>(b.subunternehmer||[]).includes(s.id));return <div key={s.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'rgba(59,130,246,0.2)'}}><Briefcase size={16} style={{color:'#3b82f6'}}/></div><div className="flex-1"><p className="text-gray-900 text-sm">{s.name}</p><p className="text-gray-400 text-xs">{s.gewerk}</p></div><button onClick={()=>del(s.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button></div>{s.telefon&&<div className="flex items-center gap-1 text-gray-400 text-xs mb-1"><Phone size={11}/>{s.telefon}</div>}<div className="flex flex-wrap gap-1">{bs.length===0?<span className="text-gray-400 text-xs">Keine Baustellen</span>:bs.map(b=><Bdg key={b.id} text={b.kunde} color="#3b82f6"/>)}</div></div>;})}</div>
    </div>;
  };

  // ==================== KOSTENÜBERSICHT ====================
  const KostenView = () => {
    const [selBs,setSelBs]=useState(null); const [sf,setSf]=useState(false); const [fl,setFl]=useState('alle');
    const [kf,sKf]=useState({baustelleId:'',kategorie:'material',beschreibung:'',betrag:'',datum:new Date().toISOString().split('T')[0]});
    const katLabels={lohn:'Lohnkosten',material:'Material',subunternehmer:'Subunternehmer',sonstiges:'Sonstiges'};
    const katColors={lohn:'#e2e8f0',material:'#3b82f6',subunternehmer:'#f59e0b',sonstiges:'#6b7280'};

    // Lohnkosten berechnen pro Baustelle
    const calcLohn=(bid)=>{const ei=data.stundeneintraege.filter(e=>e.baustelleId===bid);return ei.reduce((s,e)=>{const u=data.users.find(x=>x.id===e.mitarbeiterId);const std=parseFloat(bStd(e.beginn,e.ende,e.pause));return s+std*(u?.stundensatz||45);},0);};

    // Gesamtkosten pro Baustelle
    const calcTotal=(bid)=>{const lohn=calcLohn(bid);const extra=data.kosten.filter(k=>k.baustelleId===bid).reduce((s,k)=>s+k.betrag,0);return lohn+extra;};

    // Kosten nach Kategorie pro Baustelle
    const calcKat=(bid,kat)=>{if(kat==='lohn')return calcLohn(bid);return data.kosten.filter(k=>k.baustelleId===bid&&k.kategorie===kat).reduce((s,k)=>s+k.betrag,0);};

    // Gesamtkosten aller Baustellen
    const totalAll=data.baustellen.reduce((s,b)=>s+calcTotal(b.id),0);
    const budgetAll=data.baustellen.reduce((s,b)=>s+(b.budget||0),0);

    const saveKost=()=>{if(!kf.baustelleId||!kf.beschreibung.trim()||!kf.betrag){show('Alle Felder ausfüllen','error');return;}setData(p=>({...p,kosten:[...p.kosten,{id:nid(p.kosten),baustelleId:Number(kf.baustelleId),kategorie:kf.kategorie,beschreibung:kf.beschreibung,betrag:Number(kf.betrag),datum:kf.datum,ersteller:cu.id}]}));addN('info',`Kosten: ${fE(Number(kf.betrag))} – ${kf.beschreibung}`,Number(kf.baustelleId));show('Kosten erfasst');setSf(false);sKf({...kf,beschreibung:'',betrag:''});};

    const exportCSV=()=>{const rows=[['Baustelle','Kategorie','Beschreibung','Betrag','Datum']];
      data.baustellen.forEach(b=>{
        // Lohnkosten pro Mitarbeiter
        const ei=data.stundeneintraege.filter(e=>e.baustelleId===b.id);
        const byUser={};ei.forEach(e=>{if(!byUser[e.mitarbeiterId])byUser[e.mitarbeiterId]=0;byUser[e.mitarbeiterId]+=parseFloat(bStd(e.beginn,e.ende,e.pause));});
        Object.entries(byUser).forEach(([uid,std])=>{const u=data.users.find(x=>x.id===Number(uid));rows.push([b.kunde,'Lohn',`${u?.name||'?'} (${std.toFixed(1)}h × ${fE(u?.stundensatz||45)})`,((u?.stundensatz||45)*std).toFixed(2),'']);});
        // Extra Kosten
        data.kosten.filter(k=>k.baustelleId===b.id).forEach(k=>rows.push([b.kunde,katLabels[k.kategorie],k.beschreibung,k.betrag.toFixed(2),k.datum]));
        // Budget Zeile
        rows.push([b.kunde,'BUDGET','Gesamt',b.budget||0,'']);
        rows.push([b.kunde,'GESAMT','',calcTotal(b.id).toFixed(2),'']);
        rows.push(['','','','','']);
      });
      const csv='\uFEFF'+rows.map(r=>r.join(';')).join('\n');
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Kostenübersicht_${new Date().toISOString().split('T')[0]}.csv`;a.click();URL.revokeObjectURL(url);show('CSV exportiert');
    };

    let bsList=data.baustellen;
    if(fl!=='alle')bsList=bsList.filter(b=>b.status===fl);

    // Detail-Ansicht einer Baustelle
    if(selBs){
      const b=selBs; const total=calcTotal(b.id); const budget=b.budget||0; const pct=budget>0?Math.min(100,Math.round(total/budget*100)):0;
      const isOver=budget>0&&total>budget;
      const ei=data.stundeneintraege.filter(e=>e.baustelleId===b.id);
      const bsKosten=data.kosten.filter(k=>k.baustelleId===b.id);

      // Lohnkosten nach Mitarbeiter
      const byUser={};ei.forEach(e=>{const uid=e.mitarbeiterId;if(!byUser[uid])byUser[uid]={std:0,kosten:0};const std=parseFloat(bStd(e.beginn,e.ende,e.pause));const u=data.users.find(x=>x.id===uid);byUser[uid].std+=std;byUser[uid].kosten+=std*(u?.stundensatz||45);});

      const delKost=(id)=>{if(confirm('Kosten löschen?')){setData(p=>({...p,kosten:p.kosten.filter(k=>k.id!==id)}));show('Gelöscht');}};

      return <div className="min-h-screen bg-gray-50">
        <Hdr title={`Kosten: ${b.kunde}`} onBack={()=>setSelBs(null)}/>
        <div className="p-4 space-y-3">
          {/* Budget Übersicht */}
          <div className="rounded-xl p-3 border" style={{background:isOver?'rgba(239,68,68,0.06)':'rgba(31,41,55,0.04)',borderColor:isOver?'rgba(239,68,68,0.2)':'rgba(31,41,55,0.15)'}}>
            <div className="flex justify-between items-start mb-2">
              <div><p className="text-gray-400 text-xs">Gesamtkosten</p><p className="text-gray-900 text-xl font-bold">{fE(total)}</p></div>
              {budget>0&&<div className="text-right"><p className="text-gray-400 text-xs">Budget</p><p className="text-gray-900 text-sm font-medium">{fE(budget)}</p></div>}
            </div>
            {budget>0&&<div><PBar value={pct}/><div className="flex justify-between mt-1"><span className="text-xs" style={{color:isOver?'#ef4444':'#A04878'}}>{pct}% verbraucht</span><span className="text-xs" style={{color:isOver?'#ef4444':'#22c55e'}}>{isOver?`${fE(total-budget)} über Budget`:`${fE(budget-total)} übrig`}</span></div></div>}
          </div>

          {/* Stunden Zusammenfassung */}
          {ei.length>0&&<div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2 bg-white border border-gray-200 shadow-sm text-center"><p className="text-lg font-bold" style={{color:ACC}}>{ei.reduce((s,e)=>s+parseFloat(bStd(e.beginn,e.ende,e.pause)),0).toFixed(1)}</p><p className="text-gray-400 text-xs">Stunden</p></div>
            <div className="rounded-xl p-2 bg-white border border-gray-200 shadow-sm text-center"><p className="text-lg font-bold text-gray-900">{Object.keys(byUser).length}</p><p className="text-gray-400 text-xs">Mitarbeiter</p></div>
            <div className="rounded-xl p-2 bg-white border border-gray-200 shadow-sm text-center"><p className="text-lg font-bold text-gray-900">{fE(calcLohn(b.id))}</p><p className="text-gray-400 text-xs">Lohnkosten</p></div>
          </div>}

          {/* Kategorie-Aufteilung */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-3">
            <p className="text-gray-900 text-sm font-medium mb-2">Kostenaufteilung</p>
            <div className="space-y-2">{['lohn','material','subunternehmer','sonstiges'].map(kat=>{const val=calcKat(b.id,kat);const katPct=total>0?Math.round(val/total*100):0;return val>0||kat==='lohn'?<div key={kat}>
              <div className="flex justify-between items-center mb-1"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:katColors[kat]}}/><span className="text-gray-600 text-xs">{katLabels[kat]}</span></div><div className="flex items-center gap-2"><span className="text-gray-700 text-xs font-medium">{fE(val)}</span><span className="text-gray-400 text-xs">{katPct}%</span></div></div>
              <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="h-full rounded-full transition-all" style={{width:`${katPct}%`,background:katColors[kat]}}/></div>
            </div>:null;})}</div>
          </div>

          {/* Lohnkosten Detail */}
          {Object.keys(byUser).length>0&&<div className="rounded-xl bg-white border border-gray-200 shadow-sm p-3">
            <p className="text-gray-900 text-sm font-medium mb-2">Lohnkosten pro Mitarbeiter</p>
            <div className="space-y-1.5">{Object.entries(byUser).map(([uid,d])=>{const u=data.users.find(x=>x.id===Number(uid));const ue=ei.filter(e=>e.mitarbeiterId===Number(uid));const tage=[...new Set(ue.map(e=>e.datum))].length;return <div key={uid} className="p-2 rounded-lg bg-gray-50 text-xs">
              <div className="flex justify-between items-center"><p className="text-gray-900 font-medium">{u?.name||'?'}</p><span className="font-bold" style={{color:ACC}}>{fE(d.kosten)}</span></div>
              <div className="flex items-center gap-3 mt-0.5 text-gray-400"><span>{d.std.toFixed(1)}h an {tage} {tage===1?'Tag':'Tagen'}</span><span>×</span><span>{fE(u?.stundensatz||45)}/h</span></div>
            </div>;})}</div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 text-xs"><span className="text-gray-500 font-medium">Lohn gesamt</span><span className="text-gray-900 font-bold">{fE(Object.values(byUser).reduce((s,d)=>s+d.kosten,0))}</span></div>
          </div>}

          {/* Einzelposten */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-3">
            <div className="flex justify-between items-center mb-2"><p className="text-gray-900 text-sm font-medium">Kosteneinträge ({bsKosten.length})</p>
              <button onClick={()=>{sKf({...kf,baustelleId:String(b.id)});setSf(true);}} className="px-3 py-2 rounded-lg text-xs text-white flex items-center gap-2" style={{background:BTN}}><Plus size={14}/>Kosten</button>
            </div>
            {bsKosten.length===0?<p className="text-gray-400 text-xs">Keine manuellen Kosten eingetragen</p>:
            [...bsKosten].reverse().map(k=><div key={k.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 mb-1 text-xs">
              <div className="flex items-center gap-2 flex-1"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:katColors[k.kategorie]}}/><div><p className="text-gray-900">{k.beschreibung}</p><p className="text-gray-400">{katLabels[k.kategorie]} · {fK(k.datum)}</p></div></div>
              <div className="flex items-center gap-3"><span className="font-medium text-gray-900">{fE(k.betrag)}</span><button onClick={()=>delKost(k.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16}/></button></div>
            </div>)}
          </div>
        </div>
      </div>;
    }

    // Hauptübersicht
    return <div className="min-h-screen bg-gray-50">
      <Hdr title="Kostenübersicht" onBack={()=>setV('dash')} right={<div className="flex gap-3"><button onClick={()=>setSf(!sf)} className="p-2 rounded-lg text-white" style={{background:BTN}}>{sf?<X size={18}/>:<Plus size={18}/>}</button><button onClick={exportCSV} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-700"><Download size={18}/></button></div>}/>

      {/* Neuer Kosteneintrag */}
      {sf&&<div className="p-4 border-b border-gray-200 space-y-2">
        <select value={kf.baustelleId} onChange={e=>sKf({...kf,baustelleId:e.target.value})} className={IC}><option value="">Baustelle *</option>{data.baustellen.map(b=><option key={b.id} value={b.id}>{b.kunde}</option>)}</select>
        <div className="flex gap-2">{['material','subunternehmer','sonstiges'].map(k=><button key={k} onClick={()=>sKf({...kf,kategorie:k})} className={`flex-1 py-3 rounded-lg text-xs ${kf.kategorie===k?'text-white':'bg-gray-100 text-gray-500 border border-gray-200'}`} style={kf.kategorie===k?{background:katColors[k]}:{}}>{katLabels[k]}</button>)}</div>
        <input value={kf.beschreibung} onChange={e=>sKf({...kf,beschreibung:e.target.value})} placeholder="Beschreibung *" className={IC}/>
        <div className="grid grid-cols-2 gap-2"><div className="relative"><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span><input type="number" value={kf.betrag} onChange={e=>sKf({...kf,betrag:e.target.value})} placeholder="Betrag *" className={IC}/></div><input type="date" value={kf.datum} onChange={e=>sKf({...kf,datum:e.target.value})} className={IC}/></div>
        <button onClick={saveKost} className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{background:BTN}}><Receipt size={16}/>Kosten erfassen</button>
      </div>}

      {/* Gesamtübersicht */}
      <div className="p-4 pb-2">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl p-3 border border-gray-200" style={{background:'rgba(160,72,120,0.06)'}}>
            <p className="text-gray-400 text-xs">Gesamtkosten</p>
            <p className="text-gray-900 text-lg font-bold">{fE(totalAll)}</p>
          </div>
          <div className="rounded-xl p-3 border border-gray-200 bg-white">
            <p className="text-gray-400 text-xs">Budget</p>
            <p className="text-gray-900 text-lg font-bold">{budgetAll>0?fE(budgetAll):'–'}</p>
            {budgetAll>0&&<p className="text-xs mt-0.5" style={{color:totalAll>budgetAll?'#ef4444':'#22c55e'}}>{totalAll>budgetAll?<span className="flex items-center gap-0.5"><TrendingUp size={10}/>{fE(totalAll-budgetAll)} über</span>:<span className="flex items-center gap-0.5"><TrendingDown size={10}/>{fE(budgetAll-totalAll)} übrig</span>}</p>}
          </div>
          <div className="rounded-xl p-3 border border-gray-200 bg-white">
            <p className="text-gray-400 text-xs">Stunden</p>
            <p className="text-gray-900 text-lg font-bold">{data.stundeneintraege.reduce((s,e)=>s+parseFloat(bStd(e.beginn,e.ende,e.pause)),0).toFixed(0)}h</p>
            <p className="text-gray-400 text-xs mt-0.5">{fE(data.baustellen.reduce((s,b)=>s+calcLohn(b.id),0))} Lohn</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">{['alle','aktiv','geplant','fertig','abgerechnet'].map(s=><button key={s} onClick={()=>setFl(s)} className={`px-4 py-2 rounded-full text-xs whitespace-nowrap ${fl===s?'text-white':'bg-gray-100 text-gray-500'}`} style={fl===s?{background:BTN}:{}}>{s==='alle'?'Alle':s.charAt(0).toUpperCase()+s.slice(1)}</button>)}</div>

      {/* Baustellen-Liste */}
      <div className="p-4 pt-2 space-y-2">{bsList.length===0?<Empty icon={Receipt} text="Keine Baustellen"/>:bsList.map(b=>{
        const total=calcTotal(b.id);const budget=b.budget||0;const pct=budget>0?Math.min(100,Math.round(total/budget*100)):0;const isOver=budget>0&&total>budget;
        const ei=data.stundeneintraege.filter(e=>e.baustelleId===b.id);
        const totalStd=ei.reduce((s,e)=>s+parseFloat(bStd(e.beginn,e.ende,e.pause)),0);
        const lohn=calcLohn(b.id); const extraK=data.kosten.filter(k=>k.baustelleId===b.id).reduce((s,k)=>s+k.betrag,0);
        // Stunden pro Mitarbeiter
        const byU={};ei.forEach(e=>{const uid=e.mitarbeiterId;if(!byU[uid])byU[uid]=0;byU[uid]+=parseFloat(bStd(e.beginn,e.ende,e.pause));});
        return <button key={b.id} onClick={()=>setSelBs(b)} className="w-full p-3 rounded-xl bg-white border border-gray-200 shadow-sm text-left hover:border-purple-300">
          <div className="flex justify-between items-start mb-1"><p className="text-gray-900 text-sm font-medium">{b.kunde}</p><span className="text-sm font-bold" style={{color:isOver?'#ef4444':'#A04878'}}>{fE(total)}</span></div>
          {budget>0&&<div><div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Budget: {fE(budget)}</span><span style={{color:isOver?'#ef4444':'#22c55e'}}>{pct}%</span></div><div className="w-full bg-gray-200 rounded-full h-1.5"><div className="h-full rounded-full transition-all" style={{width:`${Math.min(pct,100)}%`,background:isOver?'#ef4444':G}}/></div></div>}
          {!budget&&<p className="text-gray-400 text-xs">Kein Budget gesetzt</p>}
          {/* Mitarbeiter Stunden & Kosten */}
          {Object.keys(byU).length>0&&<div className="mt-2 space-y-1">{Object.entries(byU).map(([uid,std])=>{const u=data.users.find(x=>x.id===Number(uid));const kst=std*(u?.stundensatz||45);return <div key={uid} className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><User size={10} className="text-gray-400"/><span className="text-gray-600">{u?.name||'?'}</span><span className="text-gray-400">{std.toFixed(1)}h</span></div><span style={{color:ACC}}>{fE(kst)}</span></div>;})}<div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200"><span className="text-gray-500 font-medium">Lohn gesamt ({totalStd.toFixed(1)}h)</span><span className="text-gray-900 font-medium">{fE(lohn)}</span></div></div>}
          {Object.keys(byU).length===0&&<p className="text-gray-400 text-xs mt-1">Noch keine Stunden eingetragen</p>}
          {/* Zusatzkosten */}
          {extraK>0&&<div className="flex gap-2 mt-1.5 pt-1.5 border-t border-gray-200">{['material','subunternehmer','sonstiges'].map(kat=>{const val=calcKat(b.id,kat);return val>0?<div key={kat} className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{background:katColors[kat]}}/><span className="text-gray-400 text-xs">{katLabels[kat]}: {fE(val)}</span></div>:null;})}</div>}
        </button>;
      })}</div>
    </div>;
  };

  // ==================== PROFIL (helles Design) ====================
  const ProfilView = () => {
    const [editMode,setEditMode]=useState(false);
    const [name,setName]=useState(cu.name);
    const [pin,setPin]=useState(cu.pin);
    const meineStd=data.stundeneintraege.filter(e=>e.mitarbeiterId===cu.id);
    const totalH=meineStd.reduce((s,e)=>s+parseFloat(bStd(e.beginn,e.ende,e.pause)),0);
    const meineBs=chef?data.baustellen:data.baustellen.filter(b=>b.mitarbeiter.includes(cu.id));

    const save=()=>{
      if(!name.trim()){show('Name nötig','error');return;}
      if(!/^\d{4}$/.test(pin)){show('PIN: 4 Ziffern','error');return;}
      if(data.users.some(u=>u.pin===pin&&u.id!==cu.id)){show('PIN vergeben','error');return;}
      setData(p=>({...p,users:p.users.map(u=>u.id===cu.id?{...u,name:name.trim(),pin}:u)}));
      setCu(p=>({...p,name:name.trim(),pin}));
      setEditMode(false);show('Gespeichert');
    };

    return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4"><div className="flex items-center gap-3">
        <button onClick={()=>setV('dash')} className="p-2 -ml-2 text-gray-400 hover:text-gray-700"><ArrowLeft size={20}/></button>
        <h1 className="text-gray-900 font-medium flex-1 text-sm">Mein Profil</h1>
        {!editMode&&<button onClick={()=>setEditMode(true)} className="p-2 text-gray-400 hover:text-gray-700"><Edit3 size={18}/></button>}
      </div></div>

      <div className="p-4 space-y-4">
        {/* Avatar & Name */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold" style={{background:G}}>
            {cu.name.split(' ').map(w=>w[0]).join('').toUpperCase()}
          </div>
          {editMode?<input value={name} onChange={e=>setName(e.target.value)} className="w-full text-center text-gray-900 font-medium text-lg bg-gray-50 rounded-xl p-2 border border-gray-200 focus:outline-none focus:border-gray-400"/>
          :<p className="text-gray-900 font-medium text-lg">{cu.name}</p>}
          <p className="text-gray-400 text-xs mt-1">{chef?'Bauleiter':'Handwerker'}</p>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-900 text-lg font-bold">{totalH.toFixed(0)}h</p>
            <p className="text-gray-400 text-xs">Stunden</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-900 text-lg font-bold">{meineStd.length}</p>
            <p className="text-gray-400 text-xs">Einträge</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-900 text-lg font-bold">{meineBs.length}</p>
            <p className="text-gray-400 text-xs">Baustellen</p>
          </div>
        </div>

        {/* Einstellungen */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <p className="text-gray-900 font-medium text-sm">Einstellungen</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between">
              <div><p className="text-gray-700 text-sm">PIN</p><p className="text-gray-400 text-xs">Zugangs-Code</p></div>
              {editMode?<input maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} className="w-20 text-right text-gray-900 bg-gray-50 rounded-lg p-2 border border-gray-200 focus:outline-none text-sm"/>
              :<p className="text-gray-500 text-sm font-mono">{cu.pin}</p>}
            </div>
            <div className="p-4 flex items-center justify-between">
              <div><p className="text-gray-700 text-sm">Rolle</p><p className="text-gray-400 text-xs">Berechtigung</p></div>
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{background:'rgba(160,72,120,0.12)',color:'#A04878'}}>{chef?'Bauleiter':'Handwerker'}</span>
            </div>
          </div>
        </div>

        {/* Baustellen */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <p className="text-gray-900 font-medium text-sm">{chef?'Alle Baustellen':'Meine Baustellen'}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {meineBs.length===0?<p className="p-4 text-gray-400 text-xs">Keine Baustellen zugewiesen</p>
            :meineBs.map(b=><div key={b.id} className="p-4 flex items-center justify-between">
              <div><p className="text-gray-700 text-sm">{b.kunde}</p><p className="text-gray-400 text-xs">{b.adresse}</p></div>
              <span className="px-2 py-1 rounded-full text-xs" style={{background:b.status==='aktiv'?'#dcfce7':b.status==='geplant'?'#dbeafe':'#f3f4f6',color:b.status==='aktiv'?'#16a34a':b.status==='geplant'?'#2563eb':'#6b7280'}}>{b.status}</span>
            </div>)}
          </div>
        </div>

        {/* Buttons */}
        {editMode?<div className="space-y-2">
          <button onClick={save} className="w-full py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{background:G}}><Save size={18}/>Speichern</button>
          <button onClick={()=>{setEditMode(false);setName(cu.name);setPin(cu.pin);}} className="w-full py-3 text-gray-400 text-sm">Abbrechen</button>
        </div>
        :<button onClick={()=>{setCu(null);setV('login');}} className="w-full py-4 rounded-xl text-red-500 font-medium flex items-center justify-center gap-2 bg-white border border-gray-200 shadow-sm"><LogOut size={18}/>Abmelden</button>}
      </div>
    </div>;
  };

  // ==================== RENDER ====================
  return <div className="font-sans max-w-lg mx-auto">
    <input type="file" ref={fileRef} onChange={onFile} accept="image/*" capture="environment" className="hidden"/>
    {toast&&<Toast message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>}
    {v==='login'&&<Login/>}
    {v==='dash'&&<Dash/>}
    {v==='profil'&&<ProfilView/>}
    {v==='bst'&&<BstList/>}
    {v==='bsd'&&<BstDet/>}
    {v==='bsf'&&<BstForm/>}
    {v==='ste'&&<SteView/>}
    {v==='mst'&&<MeineStd/>}
    {v==='mng'&&<MngView/>}
    {v==='btb'&&<BtbView/>}
    {v==='dok'&&<DokView/>}
    {v==='mat'&&<MatView/>}
    {v==='notif'&&<NotifView/>}
    {v==='kal'&&<KalView/>}
    {v==='tag'&&<TagView/>}
    {v==='reg'&&<RegView/>}
    {v==='kos'&&<KostenView/>}
    {v==='mit'&&<MitView/>}
    {v==='mitf'&&<MitForm/>}
    {v==='sub'&&<SubView/>}
  </div>;
}
