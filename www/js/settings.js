/* taku · settings hub
   ============================================================================
   One place for everything, reached from the profile.

   The rule this follows: the hub NAVIGATES to the existing sheets rather than
   duplicating their controls. Two copies of the same switch is two sources of
   truth, and they drift — one gets fixed and the other doesn't. Only settings
   with no home of their own live here directly (timezone, demos, the data
   tools), plus a live summary of what each linked sheet is currently set to, so
   the hub is worth opening even when you are only checking.
*/

function _bytesOf(prefix){
  let n=0;
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k||k.indexOf("taku_")!==0)continue;
      if(prefix&&k.indexOf("taku_"+prefix)!==0)continue;
      n+=(localStorage.getItem(k)||"").length+k.length;
    }
  }catch(e){}
  return n*2;                       // localStorage stores UTF-16
}
function _fmtBytes(b){
  if(b<1024)return b+" B";
  if(b<1024*1024)return (b/1024).toFixed(0)+" KB";
  return (b/1048576).toFixed(1)+" MB";
}
/* The 5MB figure is the conventional per-origin allowance; browsers vary and
   some grant far more. Shown as a guide, not a promise. */
const STORAGE_BUDGET=5*1024*1024;

function _summaries(){
  const swipe=$("#snSwipe");
  if(swipe)swipe.textContent=swipePrefs.rate==="quick"
    ? "Swiping right just marks watched" : "You rate after each swipe";
  const passed=$("#snPassed");
  if(passed)passed.textContent=passed_count_label();
  const name=$("#snName");
  if(name)name.textContent=(profile.name||"Nameless Otaku")+" · @"+(profile.handle||"you");
  const f=$("#snFilters");
  if(f){
    const n=(typeof activeFilterCount==="function")?activeFilterCount(false):0;
    f.textContent=n?n+" filter"+(n>1?"s":"")+" active":"No filters — showing everything";
  }
  const tz=$("#snTz");
  if(tz)tz.textContent="Schedule days and air times in "+tzName().replace(/_/g," ");
}
function passed_count_label(){
  const n=passed.length;
  if(n)return n+" waiting to be revisited";
  const orphans=(typeof orphanPassIds==="function")?orphanPassIds().length:0;
  return orphans?orphans+" older passes can be recovered":"Nothing passed yet";
}

function _storage(){
  const bar=$("#storageFill"),note=$("#storageNote");
  if(!bar)return;
  const total=_bytesOf(""), cache=_bytesOf("cache");
  const pct=Math.min(100,Math.round(total/STORAGE_BUDGET*100));
  bar.style.width=Math.max(2,pct)+"%";
  bar.className=pct>85?"hot":pct>60?"warm":"";
  note.innerHTML=`<b>${_fmtBytes(total)}</b> used of about ${_fmtBytes(STORAGE_BUDGET)} — `+
    `${_fmtBytes(cache)} of that is cached anime data you can clear at any time.`;
}

function _syncSettings(){
  _summaries();_storage();
  const d=$("#setDemos");
  if(d){const on=!(typeof demosOff==="function"&&demosOff());
    d.classList.toggle("on",on);d.setAttribute("aria-checked",String(on));}
  const row=$("#setAdultRow"),ad=$("#setAdult");
  if(row)row.hidden=!canAdult();
  if(ad){const on=adultOn();ad.classList.toggle("on",on);ad.setAttribute("aria-checked",String(on));}
  // timezone picker shares its option list with the Discover sheet
  const sel=$("#setTz");
  if(sel&&!sel.options.length){
    let zones;try{zones=Intl.supportedValuesOf("timeZone");}catch(e){zones=null;}
    if(!zones||!zones.length)zones=(typeof TZ_FALLBACK!=="undefined")?TZ_FALLBACK:["UTC"];
    const dev=deviceTz();
    sel.innerHTML=[`<option value="">Device — ${dev.replace(/_/g," ")}</option>`]
      .concat(zones.map(z=>`<option value="${z}">${z.replace(/_/g," ")} (${tzOffsetLabel(z)})</option>`)).join("");
  }
  if(sel)sel.value=store.get("tz","");
  const about=$("#setAbout");
  if(about)about.innerHTML=
    `taku · build ${(document.querySelector('link[rel=stylesheet]')||{getAttribute:()=>""}).getAttribute("href").split("v=")[1]||"—"}<br>`+
    `Anime data from <a href="https://anilist.co" target="_blank" rel="noopener">AniList</a>. `+
    `Airing times from <a href="https://animeschedule.net" target="_blank" rel="noopener">AnimeSchedule</a>. `+
    `Some artwork from <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a> — `+
    `this product uses the TMDB API but is not endorsed or certified by TMDB.<br>`+
    `<a href="privacy.html" target="_blank" rel="noopener">Privacy</a>`;
  if(typeof renderAuthZone==="function")renderAuthZone();
  const sub=$("#srSub");
  if(sub)sub.textContent=_fmtBytes(_bytesOf(""))+" stored on this device";
}

function openSettings(){
  const sh=$("#settingsSheet");if(!sh)return;
  _syncSettings();
  sh.classList.add("on");
}

function initSettings(){
  if(!$("#settingsSheet"))return;
  $("#openSettings").onclick=()=>openSettings();
  $("#settingsDone").onclick=()=>$("#settingsSheet").classList.remove("on");

  /* Navigation rows hand off to the sheet that already owns each group. The hub
     closes first so dismissing the child returns to the profile rather than
     stacking two modals. */
  document.querySelectorAll("#settingsSheet [data-go]").forEach(b=>b.onclick=()=>{
    const to=b.dataset.go;
    $("#settingsSheet").classList.remove("on");
    if(to==="edit")$("#pfEdit").click();
    else if(to==="look"){$("#lookSheet")&&openLook();}
    else if(to==="swipe"){setView("deck");setTimeout(()=>$("#swipeGear").click(),80);}
    else if(to==="passed"){setView("deck");setTimeout(()=>{$("#swipeGear").click();},80);}
    else if(to==="filters"){setView("browse");setTimeout(()=>$("#browseGear").click(),120);}
  });

  $("#setDemos").onclick=()=>{
    const nowOff=!(typeof demosOff==="function"&&demosOff());
    store.set("demosOff",nowOff);
    if(typeof mountDemos==="function")mountDemos(document);
    _syncSettings();buzz(6);
  };
  $("#setAdult").onclick=()=>{
    if(!canAdult())return;
    store.set("searchAdult",!store.get("searchAdult",false));
    _syncSettings();buzz(6);
  };
  $("#setTz").onchange=e=>{
    store.set("tz",e.target.value);
    if(typeof _schedCache!=="undefined")_schedCache={};
    _syncSettings();buzz(6);
    toast("Times now in "+tzName().replace(/_/g," "));
  };

  $("#setBackup").onclick=()=>exportData();
  $("#setRestore").onclick=()=>$("#restoreFile").click();
  $("#restoreFile").addEventListener("change",e=>{
    const f=e.target.files&&e.target.files[0];e.target.value="";
    if(f)importData(f);
  });

  $("#setClearCache").onclick=()=>{
    const before=_bytesOf("cache");
    purgeCaches();
    _syncSettings();
    toast("Freed "+_fmtBytes(before)+" — it will refill as you browse");
  };

  /* Offered because the feed genuinely can end up mislearned — the genre
     weights were biased by a bug for a long time, and there was no way back
     short of wiping everything. Ratings are untouched. */
  $("#setResetTaste").onclick=()=>{
    if(!confirm("Reset what the feed has learned?\n\nYour ratings, tiers and lists all stay. Only the genre weights behind \"For You\" are cleared, and they rebuild as you swipe."))return;
    affinity={};store.set("affinity",affinity);
    if(typeof applyGenreFilter==="function")applyGenreFilter();
    _syncSettings();
    toast("Feed reset — it starts learning again from your next swipe");
  };

  $("#setWipe").onclick=()=>{
    if(!confirm("Delete everything?\n\nEvery rating, tier, list and setting on this device. This cannot be undone.\n\nBack up first if you might want it back."))return;
    if(!confirm("Really delete everything? There is no undo."))return;
    try{
      const keys=[];
      for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf("taku_")===0)keys.push(k);}
      keys.forEach(k=>localStorage.removeItem(k));
    }catch(e){}
    location.reload();
  };

  $("#setAuthToggle").onclick=()=>$("#authToggle")&&$("#authToggle").click();
}
