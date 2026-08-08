/* taku · persistent state (localStorage, same taku_* keys as v1 so data survives) */
const store={
  get(k,d){try{const v=JSON.parse(localStorage.getItem("taku_"+k));return v===null||v===undefined?d:v;}catch(e){return d;}},
  /* On quota the old version purged caches and gave up — so the write that
     tripped the limit (a rating, a tier) was silently thrown away. Now it frees
     space in increasing order of pain and retries after each step. */
  set(k,v){
    const key="taku_"+k, json=JSON.stringify(v);
    try{localStorage.setItem(key,json);return true;}catch(e){}
    sweepCaches();                                  // expired + orphaned entries
    try{localStorage.setItem(key,json);return true;}catch(e){}
    purgeCaches();                                  // everything cacheable, TMDB included
    try{localStorage.setItem(key,json);return true;}
    catch(e){console.warn("taku: could not save",k,e);return false;}
  }
};
const CACHE_KEEP="taku_cache_tmdb";   // a hand-built poster map, expensive to refill
function purgeCaches(){
  for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith("taku_cache"))localStorage.removeItem(k);}
}
/* Cache keys are versioned (cache_sched_ → sched2_ → sched3_) whenever the
   stored shape changes, but the superseded generations were never deleted — they
   just sat there burning quota forever. Every cache entry carries a timestamp,
   so sweeping by age clears both expired entries and every orphaned generation. */
function sweepCaches(){
  const ttl=(typeof CACHE_TTL==="number"?CACHE_TTL:30*60*1000), now=Date.now();
  let freed=0;
  for(let i=localStorage.length-1;i>=0;i--){
    const k=localStorage.key(i);
    if(!k||!k.startsWith("taku_cache")||k===CACHE_KEEP)continue;
    try{
      const v=JSON.parse(localStorage.getItem(k));
      if(!v||typeof v.t!=="number"||now-v.t>=ttl){freed+=localStorage.getItem(k).length;localStorage.removeItem(k);}
    }catch(e){localStorage.removeItem(k);}
  }
  return freed;
}

/* one-time migration: the app was renamed naku → taku; carry old naku_* data over */
(function migrateNakuToTaku(){
  try{
    if(localStorage.getItem("taku_migrated"))return;
    const old=[];
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf("naku_")===0)old.push(k);}
    old.forEach(k=>{const nk="taku_"+k.slice(5);if(localStorage.getItem(nk)===null)localStorage.setItem(nk,localStorage.getItem(k));});
    localStorage.setItem("taku_migrated","1");
  }catch(e){}
})();

let want=store.get("want",[]);
let watched=store.get("watched",[]);          // slim records + tier + status ("watching"|"watched")
watched.forEach(m=>{if(!m.status)m.status="watched";}); // records made before the watching/watched split
let seen=new Set(store.get("seen",[]));        // every id acted on
// how swiping behaves. rate: "ask" = tier sheet after every right-swipe,
// "quick" = just log it as watched and keep the deck moving
let swipePrefs=store.get("swipePrefs",{rate:"ask"});
let profile=store.get("profile",{name:"",handle:"",bio:"",avatar:"🍥",created:0,age:null});

/* Age gate. Self-declared, so this is a preference gate, not verification —
   it decides whether the 18+ switch is even offered. Unknown age = treated as
   under 18, so anyone who onboarded before this existed stays gated until they
   say otherwise. Feeds are filtered for everyone regardless. */
function userAge(){const a=+(profile&&profile.age);return Number.isFinite(a)&&a>0?a:null;}
function canAdult(){const a=userAge();return a!==null&&a>=18;}
function adultOn(){return canAdult()&&!!store.get("searchAdult",false);}
let friends=store.get("friends",null);
let affinity=store.get("affinity",{});         // genre -> learned weight
let deckGenres=store.get("deckGenres",[]);      // Discover genre filter (empty = all)

if(friends===null){friends=[
  {id:"seed_rei",name:"Rei",handle:"reibot",avatar:"👁️",title:"MINDFLAYER",tier:"ELITE",power:8200,genre:"Psychological",color:"#a855f7"},
  {id:"seed_kenji",name:"Kenji",handle:"shonenmax",avatar:"⚡",title:"BERSERKER",tier:"VETERAN",power:4300,genre:"Action",color:"#ef4444"},
  {id:"seed_mizu",name:"Mizu",handle:"cozygirl",avatar:"🎐",title:"SLICE MONK",tier:"ADEPT",power:900,genre:"Slice of Life",color:"#a3e635"}
];store.set("friends",friends);}

const $=s=>document.querySelector(s);
/* Anything that reaches innerHTML from outside the app goes through this.
   Friend codes are the live case: they are pasted from another person, so
   every field in one is attacker-controlled by design. */
function escHTML(v){return String(v==null?"":v).replace(/[&<>"'`]/g,c=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;"}[c]));}
const HEX_COLOR=/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
function safeColor(c,fallback){return HEX_COLOR.test(String(c||""))?c:(fallback||"#8b5cf6");}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(window._toastT);window._toastT=setTimeout(()=>t.classList.remove("show"),1900);}
function buzz(ms){try{if(navigator.vibrate)navigator.vibrate(ms||10);}catch(e){}}

/* human "next episode airs in …" from a nextAiringEpisode {at,ep} */
function airingText(next,status){
  if(next&&next.at){
    const secs=next.at-Math.floor(Date.now()/1000);
    if(secs<=0)return "Ep "+next.ep+" · airing now";
    const d=Math.floor(secs/86400),h=Math.floor((secs%86400)/3600),m=Math.floor((secs%3600)/60);
    const rel=d>0?d+"d "+h+"h":h>0?h+"h "+m+"m":m+"m";
    return "Ep "+next.ep+" · airs in "+rel;
  }
  if(status==="FINISHED")return "All episodes out";
  if(status==="RELEASING")return "Airing — schedule TBA";
  return "";
}

/* affinity learning: every action teaches the feed */
function bumpAffinity(genres,delta){
  (genres||[]).forEach((g,i)=>{
    const w=delta/(i+1);                       // primary genre learns hardest
    affinity[g]=Math.max(-6,Math.min(10,(affinity[g]||0)+w));
  });
  store.set("affinity",affinity);
}
const TIER_AFFINITY={S:3,A:2,B:1,C:-0.5,D:-1.5};

/* ---- timezone ----
   Airing times come back as absolute epoch seconds. Everything that turns one
   into a day, a weekday or a clock time has to agree on WHICH zone, or an
   episode airing 01:00 JST lands on a different calendar day than the header
   says. The user picks the zone; "" means follow the device.

   All of this goes through Intl rather than Date's local-time getters, because
   Date can only ever answer in the device's zone. */
function deviceTz(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";}catch(e){return "UTC";}}
function tzName(){const t=store.get("tz","");if(!t)return deviceTz();
  try{new Intl.DateTimeFormat("en-US",{timeZone:t});return t;}catch(e){return deviceTz();}}
const _tzFmts={};
function _tzFmt(tz){
  if(!_tzFmts[tz])_tzFmts[tz]=new Intl.DateTimeFormat("en-US",{timeZone:tz,
    year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",
    second:"numeric",weekday:"short",hourCycle:"h23"});
  return _tzFmts[tz];
}
/* epoch seconds -> calendar fields in the active zone */
function tzParts(at){
  const p={};
  _tzFmt(tzName()).formatToParts(new Date(at*1000)).forEach(x=>{p[x.type]=x.value;});
  return {y:+p.year,mo:+p.month-1,d:+p.day,h:+p.hour%24,mi:+p.minute,s:+p.second,wd:p.weekday};
}
function tzDayKey(at){const p=tzParts(at);return p.y+"_"+p.mo+"_"+p.d;}
/* epoch of the start of the calendar day containing `at`, in the active zone.
   Derived by subtracting the wall-clock time rather than by constructing a
   local Date, so it stays correct for any offset including :30 and :45 zones. */
function tzStartOfDay(at){const p=tzParts(at);return at-(p.h*3600+p.mi*60+p.s);}
function tzTimeLabel(at){
  try{return new Date(at*1000).toLocaleTimeString([],{timeZone:tzName(),hour:"numeric",minute:"2-digit"});}
  catch(e){return "";}
}
/* Short label for the picker, e.g. "GMT+9". */
function tzOffsetLabel(tz){
  try{
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:tz,timeZoneName:"shortOffset"}).formatToParts(new Date());
    const z=parts.find(x=>x.type==="timeZoneName");
    return z?z.value:"";
  }catch(e){return "";}
}

function markSeen(id){seen.add(id);store.set("seen",[...seen]);}

/* ---- passed pile ----
   Everything swiped left. These stay in `seen`, so the normal deck can never
   resurface them (rec.js filters the pool on `seen`) — this list exists only so
   the pile can be replayed on purpose. Stored card-ready rather than slim()
   because a replayed card has to render the same as a fresh one, and capped so
   a heavy swiper can't fill localStorage. */
const PASSED_MAX=200;
let passed=store.get("passed",[]);
function passRec(m){
  return {id:m.id,title:mTitle(m),
    coverImage:{large:m.coverImage&&m.coverImage.large,extraLarge:m.coverImage&&m.coverImage.extraLarge},
    averageScore:m.averageScore||null,format:m.format||null,seasonYear:m.seasonYear||null,
    episodes:m.episodes||null,duration:m.duration||null,
    genres:(m.genres||[]).slice(0,4),description:(m.description||"").slice(0,320),
    passedAt:Date.now()};
}
function addPassed(m){
  passed=passed.filter(x=>x.id!==m.id);
  passed.unshift(passRec(m));
  if(passed.length>PASSED_MAX)passed.length=PASSED_MAX;
  store.set("passed",passed);
}
function removePassed(id){if(!passed.some(x=>x.id===id))return;passed=passed.filter(x=>x.id!==id);store.set("passed",passed);}
function clearPassed(){passed=[];store.set("passed",passed);}
/* Saving a show retires it from the passed pile here rather than at each call
   site — Discover, search and the detail sheet had each forgotten to, leaving
   shows listed as both wanted and passed, and re-offered on every replay. */
function addWant(m){if(!want.some(x=>x.id===m.id)){want.unshift(m);store.set("want",want);}removePassed(m.id);}
function removeWant(id){want=want.filter(x=>x.id!==id);store.set("want",want);}
function addWatched(rec){
  const i=watched.findIndex(x=>x.id===rec.id);
  if(i>=0)watched[i]=rec;else watched.push(rec);
  removeWant(rec.id);removePassed(rec.id);sortWatched();store.set("watched",watched);
}
function removeWatched(id){watched=watched.filter(x=>x.id!==id);store.set("watched",watched);}

/* Trash — shown to users as "Dropped"; the internal name and the "trash" localStorage
   key stay as-is so existing devices keep their saved data.
   Nothing leaves the app outright. Removals land here with where they
   came from, so restoring puts them back exactly where they were.
   suggest:false also keeps the id in `seen`, so the swipe deck never shows it again. */
let trash=store.get("trash",[]);
function addTrash(rec,from,suggest){
  trash=trash.filter(x=>x.id!==rec.id);
  trash.unshift({...rec,from,suggest:!!suggest,trashedAt:Date.now()});
  store.set("trash",trash);
}
function purgeTrash(id){trash=trash.filter(x=>x.id!==id);store.set("trash",trash);}
function restoreTrash(id){
  const t=trash.find(x=>x.id===id);if(!t)return null;
  const {from,suggest,trashedAt,...rec}=t;
  if(from==="want")addWant(rec);
  else addWatched({...rec,status:from==="watching"?"watching":"watched"});
  markSeen(id);
  purgeTrash(id);
  return from;
}
/* tier is always the primary key, so an S can never sit below an A no matter
   what was dragged. `ord` is the hand-placed position inside a tier; untouched
   items fall back to score, which is how the list behaved before dragging. */
function sortWatched(){
  watched.sort((a,b)=>(TIER_ORDER[a.tier]??9)-(TIER_ORDER[b.tier]??9)
    ||(a.ord??9999)-(b.ord??9999)
    ||(b.score||0)-(a.score||0));
}

/* AniList's CDN paths are offset from its API names: the API's "large" serves
   from /cover/medium/ (230px) and "extraLarge" from /cover/large/ (460px, its
   max). Saved records made before ximg existed only kept the small URL — same
   filename one folder up IS its 2x version, so old libraries upgrade for free. */
function hiRes(u){return u&&u.indexOf("/cover/medium/")>=0?u.replace("/cover/medium/","/cover/large/"):u;}
function slim(m){return{id:m.id,title:mTitle(m),img:m.coverImage&&m.coverImage.large,ximg:m.coverImage&&m.coverImage.extraLarge,score:m.averageScore,year:m.seasonYear,eps:m.episodes||null,dur:m.duration||null,genres:(m.genres||[]).slice(0,3)};}
function mTitle(m){return (m.title&&(m.title.english||m.title.romaji))||m.title||"Untitled";}
