/* taku · persistent state (localStorage, same taku_* keys as v1 so data survives) */
const store={
  get(k,d){try{const v=JSON.parse(localStorage.getItem("taku_"+k));return v===null||v===undefined?d:v;}catch(e){return d;}},
  set(k,v){try{localStorage.setItem("taku_"+k,JSON.stringify(v));}catch(e){/* quota — drop caches */ purgeCaches();}}
};
function purgeCaches(){
  for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith("taku_cache"))localStorage.removeItem(k);}
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
let watched=store.get("watched",[]);          // slim records + tier
let seen=new Set(store.get("seen",[]));        // every id acted on
let profile=store.get("profile",{name:"",handle:"",bio:"",avatar:"🍥",created:0});
let friends=store.get("friends",null);
let affinity=store.get("affinity",{});         // genre -> learned weight
let deckGenres=store.get("deckGenres",[]);      // Discover genre filter (empty = all)

if(friends===null){friends=[
  {id:"seed_rei",name:"Rei",handle:"reibot",avatar:"👁️",title:"MINDFLAYER",tier:"ELITE",power:8200,genre:"Psychological",color:"#a855f7"},
  {id:"seed_kenji",name:"Kenji",handle:"shonenmax",avatar:"⚡",title:"BERSERKER",tier:"VETERAN",power:4300,genre:"Action",color:"#ef4444"},
  {id:"seed_mizu",name:"Mizu",handle:"cozygirl",avatar:"🎐",title:"SLICE MONK",tier:"ADEPT",power:900,genre:"Slice of Life",color:"#a3e635"}
];store.set("friends",friends);}

const $=s=>document.querySelector(s);
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(window._toastT);window._toastT=setTimeout(()=>t.classList.remove("show"),1900);}
function buzz(ms){try{if(navigator.vibrate)navigator.vibrate(ms||10);}catch(e){}}

/* affinity learning: every action teaches the feed */
function bumpAffinity(genres,delta){
  (genres||[]).forEach((g,i)=>{
    const w=delta/(i+1);                       // primary genre learns hardest
    affinity[g]=Math.max(-6,Math.min(10,(affinity[g]||0)+w));
  });
  store.set("affinity",affinity);
}
const TIER_AFFINITY={S:3,A:2,B:1,C:-0.5,D:-1.5};

function markSeen(id){seen.add(id);store.set("seen",[...seen]);}
function addWant(m){if(!want.some(x=>x.id===m.id)){want.unshift(m);store.set("want",want);}}
function removeWant(id){want=want.filter(x=>x.id!==id);store.set("want",want);}
function addWatched(rec){
  const i=watched.findIndex(x=>x.id===rec.id);
  if(i>=0)watched[i]=rec;else watched.push(rec);
  removeWant(rec.id);sortWatched();store.set("watched",watched);
}
function removeWatched(id){watched=watched.filter(x=>x.id!==id);store.set("watched",watched);}
function sortWatched(){watched.sort((a,b)=>(TIER_ORDER[a.tier]??9)-(TIER_ORDER[b.tier]??9)||(b.score||0)-(a.score||0));}

function slim(m){return{id:m.id,title:mTitle(m),img:m.coverImage&&m.coverImage.large,score:m.averageScore,year:m.seasonYear,eps:m.episodes||null,dur:m.duration||null,genres:(m.genres||[]).slice(0,3)};}
function mTitle(m){return (m.title&&(m.title.english||m.title.romaji))||m.title||"Untitled";}
