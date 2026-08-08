/* taku · discover deck: modes, swipe, details, rating */
let deckMode="foryou";
const queues={foryou:[],new:[],trending:[]};
const poolPage={foryou:0,new:0,trending:0};
let deckLoading=false,pendingWatch=null;
let lastUndo=null; // single-level rewind, Tinder-style

/* Replay mode: the deck is temporarily fed from the passed pile instead of the
   recommender. Kept as a separate queue rather than a fourth deckMode so the
   normal feed's paging state is untouched while you dip in and out. */
let replayMode=false,replayQueue=[];
function activeQueue(){return replayMode?replayQueue:queues[deckMode];}

/* genre filter changed → drop queued cards for all modes and rebuild */
function applyGenreFilter(){
  Object.keys(queues).forEach(k=>{queues[k]=[];poolPage[k]=0;});
  lastUndo=null;updateUndoBtn();
  renderDeck();
}

const scoreClass=s=>s>=75?"hi":s>=60?"mid":"lo";

async function ensureQueue(){
  if(replayMode)return;              // the pile is finite; nothing to page in
  if(deckLoading)return;deckLoading=true;
  let guard=0;
  while(queues[deckMode].length<4&&guard<3){
    poolPage[deckMode]++;guard++;
    try{
      const cands=await buildQueue(deckMode,poolPage[deckMode]);
      const have=new Set(queues[deckMode].map(m=>m.id));
      queues[deckMode].push(...cands.filter(m=>!have.has(m.id)));
    }catch(e){console.error(e);break;}
  }
  deckLoading=false;
}
function prefetchImages(){
  activeQueue().slice(0,4).forEach(m=>{const u=m.coverImage&&(m.coverImage.extraLarge||m.coverImage.large);if(u){const i=new Image();i.src=u;}});
}

function cardEl(m){
  const el=document.createElement("div");el.className="card";el.dataset.id=m.id;
  const img=(m.coverImage&&(m.coverImage.extraLarge||m.coverImage.large))||"";
  const meta=[m.format,m.seasonYear,m.episodes?m.episodes+" eps":null].filter(Boolean).map(x=>`<span class="chip">${x}</span>`).join("")
    +(m.genres||[]).slice(0,3).map(g=>`<span class="chip">${g}</span>`).join("");
  const r=reasonFor(m);
  el.innerHTML=`
    <div class="poster" style="background-image:url('${img}')"></div>
    <div class="shade"></div>
    ${r?`<div class="reason ${r.cls}">${r.txt}</div>`:""}
    ${m.averageScore?`<div class="score ${scoreClass(m.averageScore)}">${icSvg("star",true)} ${(m.averageScore/10).toFixed(1)}</div>`:""}
    <div class="badge seen">Seen</div><div class="badge nope">Nope</div>
    <div class="info">
      <h2>${mTitle(m)}</h2>
      <div class="meta">${meta}</div>
      <div class="desc">${(m.description||"")}</div>
      <span class="cinfo" title="Details">${icSvg("info")}</span>
    </div>`;
  attachDrag(el,m);
  // the card is full-screen, so AniList's 460px cover upscales ~2x here.
  // Swap to the TMDB poster if one clears the match gates; guard on the element
  // still being in the deck so a late response can't paint a swiped-away card.
  tmdbUpgrade(el.querySelector(".poster"),m,()=>el.isConnected);
  return el;
}

async function renderDeck(){
  const deck=$("#deck");
  syncReplayBar();
  if(!replayMode&&!queues[deckMode].length){
    deck.innerHTML=`<div class="empty"><div class="spin"></div><p>Studying your taste…</p></div>`;
    await ensureQueue();
  }
  deck.innerHTML="";
  const q=activeQueue();
  if(!q.length){
    deck.innerHTML=replayMode
      ? `<div class="empty"><h3>Pile cleared</h3><p>You've been back through everything you passed.</p><button class="savebtn" id="replayExitEmpty">Back to my feed</button></div>`
      : `<div class="empty"><h3>You're all caught up</h3><p>This feed is clear for now. Try another mode, or search for something specific.</p>${passed.length?`<button class="savebtn" id="replayStartEmpty">Revisit ${passed.length} show${passed.length>1?"s":""} you passed</button>`:""}</div>`;
    return;
  }
  const top=q.slice(0,3).reverse();
  top.forEach((m,i)=>{
    const el=cardEl(m);
    const depth=top.length-1-i;
    el.style.transform=`scale(${1-depth*0.04}) translateY(${depth*10}px)`;
    el.style.zIndex=10-depth;
    el.style.pointerEvents=depth===0?"auto":"none";
    deck.appendChild(el);
  });
  prefetchImages();
  ensureQueue(); // top up in background
}

function decide(id,action){
  const q=activeQueue();
  const idx=q.findIndex(m=>m.id===id);
  if(idx<0)return;
  const m=q[idx];q.splice(idx,1);
  markSeen(id);buzz(12);
  if(window._dismissCoach)window._dismissCoach();
  lastUndo={m,action,replay:replayMode};updateUndoBtn();
  if(action==="want"){addWant(slim(m));bumpAffinity(m.genres,1.5);}
  if(action==="nope"){
    bumpAffinity(m.genres,-1);
    /* Passing inside replay just re-buries it — it is already in the pile and
       already in `seen`, so re-adding would only reshuffle the order. */
    if(!replayMode)addPassed(m);
  }
  /* Rating or wanting something settles it: it leaves the pile for good. */
  if(replayMode&&action!=="nope")removePassed(id);
  if(action==="watch"){
    if(swipePrefs.rate==="quick"){                 // log it and keep the deck moving; rank later from Tiers
      addWatched({...slim(m),tier:null,status:"watched"});
      bumpAffinity(m.genres,1);
    }else openRate(m);
  }
  refreshCounts();
}
function updateUndoBtn(){const b=$("#bUndo");if(b)b.classList.toggle("off",!lastUndo);}
function undoLast(){
  if(!lastUndo)return;
  const {m,action,replay}=lastUndo;
  /* Only un-see it when it came from the live feed. Undoing inside replay must
     leave the id in `seen`, or a passed show would leak back into the feed. */
  if(!replay){seen.delete(m.id);store.set("seen",[...seen]);}
  if(action==="want"){removeWant(m.id);bumpAffinity(m.genres,-1.5);}
  if(action==="nope"){bumpAffinity(m.genres,1);if(!replay)removePassed(m.id);}
  if(replay&&action!=="nope")addPassed(m);   // put it back in the pile
  if(action==="watch"){
    if(pendingWatch&&pendingWatch.rec.id===m.id){$("#rateModal").classList.remove("on");pendingWatch=null;}
    else{const rec=watched.find(x=>x.id===m.id);if(rec){removeWatched(m.id);bumpAffinity(m.genres,-(rec.tier?TIER_AFFINITY[rec.tier]:1));}}
  }
  (replay?replayQueue:queues[deckMode]).unshift(m);
  lastUndo=null;updateUndoBtn();
  buzz(10);toast("Brought it back");
  refreshCounts();renderDeck();
}
function flyOut(el,dir,cb){
  const x=dir==="right"?600:dir==="left"?-600:0;
  const y=dir==="up"?-700:0;
  el.style.transition="transform .35s ease, opacity .35s ease";
  el.style.transform=`translate(${x}px,${y}px) rotate(${x/20}deg)`;el.style.opacity="0";
  setTimeout(cb,300);
}
function topCard(){const c=$("#deck").querySelectorAll(".card");return c[c.length-1]||null;}
function doAction(action){
  const top=topCard();if(!top)return;
  const id=+top.dataset.id;
  const dir=action==="nope"?"left":action==="watch"?"right":"up"; // want (star button) tosses up
  flyOut(top,dir,()=>{decide(id,action);renderDeck();});
}

/* pointer-capture drag: no global listeners, no leaks */
function attachDrag(el,m){
  let sx=0,sy=0,dx=0,dy=0,drag=false,t0=0;
  const bSeen=el.querySelector(".badge.seen"),bn=el.querySelector(".badge.nope");
  el.addEventListener("pointerdown",e=>{
    drag=true;sx=e.clientX;sy=e.clientY;dx=dy=0;t0=Date.now();
    el.setPointerCapture(e.pointerId);el.style.transition="none";
  });
  el.addEventListener("pointermove",e=>{
    if(!drag)return;
    dx=e.clientX-sx;dy=e.clientY-sy;
    el.style.transform=`translate(${dx}px,0) rotate(${dx/22}deg)`; // horizontal only — left/right swipes
    bSeen.style.opacity=Math.max(0,dx/90);  // right = seen
    bn.style.opacity=Math.max(0,-dx/90);    // left = pass
  });
  el.addEventListener("pointerup",e=>{
    if(!drag)return;drag=false;
    const dist=Math.hypot(dx,dy);
    if(dist<8&&Date.now()-t0<400){ // tap → details
      el.style.transition="transform .25s ease";el.style.transform="";
      openDetails(m);return;
    }
    if(dx>110)flyOut(el,"right",()=>{decide(m.id,"watch");renderDeck();});        // right = seen it
    else if(dx<-110)flyOut(el,"left",()=>{decide(m.id,"nope");renderDeck();});    // left = pass
    else{el.style.transition="transform .25s ease";el.style.transform="";bSeen.style.opacity=bn.style.opacity=0;}
    dx=dy=0;
  });
  el.addEventListener("pointercancel",()=>{drag=false;el.style.transition="transform .25s ease";el.style.transform="";});
}

/* rating (+ watching/watched status) */
let rateStatus="watched";
function syncRateToggle(){}   // status is now implied: a tier means finished, "Still watching" is its own button
/* park it in the Watching deck untiered and move on; ranked later, once actually finished */
function commitWatching(){
  if(!pendingWatch)return;
  addWatched({...pendingWatch.rec,tier:null,status:"watching"});
  bumpAffinity(pendingWatch.genres,1);
  $("#rateModal").classList.remove("on");pendingWatch=null;
  buzz(12);toast("Added to Watching");refreshCounts();
}
function openRate(m,status){openRateFor(slim(m),status||"watched");}
function openRateFor(rec,status){
  pendingWatch={rec:rec,genres:rec.genres||[]};
  rateStatus=status||rec.status||"watched";syncRateToggle();
  // it's already in Watching — offering "Still watching" here would do nothing
  const already=watched.some(x=>x.id===rec.id&&x.status==="watching");
  const w=$("#rateWatchingGo"),s=$("#rateSkip");
  if(w)w.hidden=already;
  if(s)s.classList.toggle("solo",already);
  $("#rateTitle").textContent=rec.title;$("#rateModal").classList.add("on");mountDemos($("#rateModal"));startDemos("rateModal");
}
function commitRate(tier){
  if(!pendingWatch)return;
  const rec={...pendingWatch.rec,tier,status:"watched"};   // picking a tier means you finished it
  addWatched(rec);
  bumpAffinity(pendingWatch.genres, tier?TIER_AFFINITY[tier]:1);
  $("#rateModal").classList.remove("on");pendingWatch=null;
  buzz(tier==="S"?[15,40,15]:12);
  refreshCounts();
}

/* ---- replay controls ---- */
function enterReplay(){
  if(!passed.length){toast("Nothing passed yet");return;}
  replayMode=true;replayQueue=passed.slice();
  lastUndo=null;updateUndoBtn();
  buzz(10);renderDeck();
}
function exitReplay(){
  replayMode=false;replayQueue=[];
  lastUndo=null;updateUndoBtn();
  buzz(6);renderDeck();
}
function syncReplayBar(){
  const bar=$("#replayBar");if(!bar)return;
  bar.hidden=!replayMode;
  const n=$("#replayLeft");if(n)n.textContent=replayQueue.length;
}
/* Ids that were acted on but saved nowhere — i.e. passes. Before the pile
   existed a left-swipe only wrote the id into `seen`, so this is the only trace
   of everything passed on older builds. Recovering means refetching them. */
function orphanPassIds(){
  const kept=new Set([...want.map(x=>x.id),...watched.map(x=>x.id),
                      ...trash.map(x=>x.id),...passed.map(x=>x.id)]);
  return [...seen].filter(id=>!kept.has(id));
}
function syncPassedRow(){
  const note=$("#passedNote"),btn=$("#replayStart"),rec=$("#passedRecover");
  const orphans=orphanPassIds().length;
  if(note)note.textContent=passed.length
    ? passed.length+" show"+(passed.length>1?"s":"")+" waiting — they never come back on their own"
    : (orphans?"Nothing saved yet — but "+orphans+" older pass"+(orphans>1?"es":"")+" can be recovered"
              :"Nothing passed yet");
  if(btn)btn.disabled=!passed.length;
  if(rec){rec.hidden=!orphans;rec.textContent="Recover "+orphans;}
}
/* One-off backfill. Deliberately a button rather than something that runs at
   boot: it is a burst of network the user did not ask for otherwise. */
async function recoverPassed(){
  const ids=orphanPassIds();
  if(!ids.length)return;
  const btn=$("#passedRecover");
  if(btn){btn.disabled=true;btn.textContent="Fetching…";}
  const media=await fetchByIds(ids);
  media.forEach(m=>addPassed(m));
  if(btn)btn.disabled=false;
  syncPassedRow();
  toast(media.length?"Recovered "+media.length+" show"+(media.length>1?"s":""):"Couldn't recover those");
}
document.addEventListener("click",e=>{
  if(!e.target.closest)return;
  if(e.target.closest("#replayStart")||e.target.closest("#replayStartEmpty")){
    $("#swipeSettings").classList.remove("on");stopDemos("swipeSettings");
    enterReplay();return;
  }
  if(e.target.closest("#replayExit")||e.target.closest("#replayExitEmpty")){exitReplay();return;}
  if(e.target.closest("#passedRecover")){recoverPassed();return;}
});
