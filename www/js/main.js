/* taku · nav, onboarding, boot */
let currentView="deck";
function setView(v){
  currentView=v;
  document.querySelectorAll(".navbtn").forEach(t=>t.classList.toggle("active",t.dataset.view===v));
  ["deck","search","want","watched","profile"].forEach(x=>{$("#view-"+x).style.display=x===v?"block":"none";});
  if(v!=="profile")stopNet();
  if(v==="want")renderWant();
  if(v==="watched")renderWatched();
  if(v==="deck")renderDeck();
  if(v==="profile")renderProfile();
  if(v==="search")setTimeout(()=>$("#searchInput").focus(),50);
}

function initNav(){
  document.querySelectorAll(".navbtn").forEach(t=>t.onclick=()=>{buzz(6);setView(t.dataset.view);});
  $("#miniAv").onclick=()=>setView("profile");
  document.querySelectorAll("#modes .pill").forEach(p=>p.onclick=()=>{
    deckMode=p.dataset.mode;buzz(6);
    document.querySelectorAll("#modes .pill").forEach(x=>x.classList.toggle("active",x===p));
    renderDeck();
  });
  $("#bWantTop").onclick=()=>doAction("want");
  $("#bNope").onclick=()=>doAction("nope");
  $("#bWatch").onclick=()=>doAction("watch");

  // genre filter
  $("#filterBtn").onclick=()=>{
    $("#filterGenres").innerHTML=OB_GENRES.map(g=>`<button class="ob-g${deckGenres.includes(g)?" sel":""}" data-fg="${g}">${g}</button>`).join("");
    $("#genreModal").classList.add("on");
  };
  $("#filterGenres").onclick=e=>{const g=e.target.dataset.fg;if(!g)return;const i=deckGenres.indexOf(g);if(i>=0)deckGenres.splice(i,1);else deckGenres.push(g);e.target.classList.toggle("sel");buzz(6);};
  $("#applyGenres").onclick=()=>{store.set("deckGenres",deckGenres);$("#genreModal").classList.remove("on");updateFilterBadge();applyGenreFilter();toast(deckGenres.length?"Filtered to "+deckGenres.length+" genre"+(deckGenres.length>1?"s":""):"Showing everything");};
  $("#clearGenres").onclick=()=>{deckGenres.length=0;store.set("deckGenres",deckGenres);$("#genreModal").classList.remove("on");updateFilterBadge();applyGenreFilter();toast("Filter cleared");};
  $("#shareCard").onclick=()=>shareRankCard();
  $("#backupBtn").onclick=()=>exportData();
  $("#restoreBtn").onclick=()=>$("#restoreFile").click();
  $("#restoreFile").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];if(f)importData(f);e.target.value="";});
  document.querySelectorAll("#rateModal .tierbtn").forEach(b=>b.onclick=()=>commitRate(b.dataset.tier));
  document.querySelectorAll("#rateStatusToggle .segs").forEach(b=>b.onclick=()=>{rateStatus=b.dataset.status;syncRateToggle();});
  $("#rateSkip").onclick=()=>commitRate(null);
  ["rateModal","detailModal","editModal","friendModal","genreModal"].forEach(id=>{
    $("#"+id).addEventListener("click",e=>{if(e.target.id===id){$("#"+id).classList.remove("on");if(id==="rateModal")pendingWatch=null;}});
  });
  document.addEventListener("keydown",e=>{
    if(currentView!=="deck")return;
    if(document.querySelector(".modal.on"))return;
    if(e.key==="ArrowRight")doAction("watch");
    if(e.key==="ArrowLeft")doAction("nope");
  });
}

/* overlay helpers: class drives styling, [hidden] guarantees invisibility even with no CSS */
function showOverlay(el){el.hidden=false;el.classList.add("on");}
function hideOverlay(el){el.classList.remove("on");el.hidden=true;}

/* onboarding: identity + taste seeds, first run only */
function initOnboard(){
  if(store.get("onboarded",false))return;
  const ob=$("#onboard");showOverlay(ob);
  let av=profile.avatar||"🍥";
  $("#obAvPick").innerHTML=AVATARS.slice(0,12).map(a=>`<button class="avopt${a===av?' sel':''}" data-av="${a}">${a}</button>`).join("");
  $("#obAvPick").onclick=e=>{const a=e.target.dataset.av;if(!a)return;av=a;document.querySelectorAll("#obAvPick .avopt").forEach(b=>b.classList.toggle("sel",b.dataset.av===a));};
  const picked=new Set();
  $("#obGenres").innerHTML=OB_GENRES.map(g=>`<button class="ob-g" data-g="${g}">${g}</button>`).join("");
  $("#obGenres").onclick=e=>{const g=e.target.dataset.g;if(!g)return;picked.has(g)?picked.delete(g):picked.add(g);e.target.classList.toggle("sel",picked.has(g));buzz(6);};
  $("#obStart").onclick=()=>{
    profile.avatar=av;
    profile.name=$("#obName").value.trim().slice(0,20);
    profile.handle=profile.name?profile.name.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,18):"";
    if(!profile.created)profile.created=Date.now();
    store.set("profile",profile);
    picked.forEach(g=>{affinity[g]=(affinity[g]||0)+2;});
    store.set("affinity",affinity);
    store.set("onboarded",true);
    hideOverlay(ob);buzz([10,30,10]);
    toast(picked.size?"Feed tuned to "+picked.size+" genres":"Welcome in");
    if(!store.get("coached",false))showOverlay($("#coach"));
    renderDeck();
  };
}

/* first-run gesture coach — shows once, dies on first swipe or Got it */
function initCoach(){
  window._dismissCoach=()=>{
    const c=$("#coach");
    if(c.classList.contains("on")){hideOverlay(c);store.set("coached",true);}
  };
  $("#coachOk").onclick=()=>{buzz(8);window._dismissCoach();};
  if(store.get("onboarded",false)&&!store.get("coached",false))showOverlay($("#coach"));
}

/* hydrate every [data-ic] slot from the single icon source */
function hydrateIcons(){
  document.querySelectorAll("[data-ic]").forEach(el=>{el.innerHTML=icSvg(el.dataset.ic);});
}

function updateFilterBadge(){const b=$("#filterCount");if(!b)return;b.textContent=deckGenres.length||"";$("#filterBtn").classList.toggle("active",deckGenres.length>0);}

/* boot */
sortWatched();
hydrateIcons();
initNav();initSearch();initProfile();initOnboard();initCoach();
refreshCounts();updateFilterBadge();
$("#miniAv").textContent=profile.avatar||"🍥";
if(store.get("onboarded",false))renderDeck();
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{}); // ask the browser not to evict our data
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
  // when an updated SW takes over, reload once so HTML+assets can never run mixed versions
  let _swReloaded=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(_swReloaded||!navigator.serviceWorker.controller)return;
    if(!window._hadController){window._hadController=true;return;} // first install, page already fresh
    _swReloaded=true;location.reload();
  });
  window._hadController=!!navigator.serviceWorker.controller;
}
