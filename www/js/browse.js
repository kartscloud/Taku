/* taku · Discover — browse: genre shelves, personalized, full-season "new releases", language filter */
/* Filters are three independent axes, so no two choices can ever contradict:
   many-within-a-group is OR (Japan OR Korea), across groups is AND.
   An empty group means "any". */
const FILTER_DEFAULTS={new:false,origins:[],platforms:[],formats:[],audio:[],sort:"time"};
/* What a brand-new user sees before touching settings. Japanese only, because
   that's what "anime" means to almost everyone opening this — the unfiltered
   feed is otherwise half Chinese donghua and long-running kids' shows.
   Shelves are already popularity-ordered by the API. Deliberately NO audio
   default: sub/dub is a weekly airing feed, so it can't describe evergreen
   shelf titles. The moment settings is saved once, the user's picks win. */
const FILTER_FIRST_RUN={origins:["JP"]};
let _audioAvailable=false;   // true once the animeschedule proxy has answered
const _savedFilters=store.get("browseFilters",null);
let browseFilters=Object.assign({},FILTER_DEFAULTS,_savedFilters||FILTER_FIRST_RUN);
["origins","platforms","formats","audio"].forEach(k=>{if(!Array.isArray(browseFilters[k]))browseFilters[k]=[];});
function saveFilters(){store.set("browseFilters",browseFilters);}
function toggleFilter(group,val){
  const a=browseFilters[group],i=a.indexOf(val);
  if(i>=0)a.splice(i,1);else a.push(val);
}
let browseTab="browse";                      // browse | schedule
let _browseData=null, _seasonData=null, _browseToken=0, _schedToken=0;
/* must mirror whatever langCountry() will use on the FIRST fetch, or clearing a
   persisted single origin computes the same key and skips cache invalidation */
let _loadedOrigin=browseFilters.origins.length===1?browseFilters.origins[0]:"";
let _schedWeek=0, _schedCache={};            // week offset: 0 = next 7 days, -1 = last week

/* Schedule ordering. Days always stay chronological — sorting reorders titles
   *within* each day, so it stays a calendar instead of collapsing into a list. */
const SCHED_SORT={
  time:(a,b)=>a.at-b.at,
  popularity:(a,b)=>(b.m.popularity||0)-(a.m.popularity||0),
  score:(a,b)=>(b.m.averageScore||0)-(a.m.averageScore||0),
  title:(a,b)=>mTitle(a.m).localeCompare(mTitle(b.m))
};
SCHED_SORT.newest=(a,b)=>(b.m.seasonYear||0)-(a.m.seasonYear||0);
const SORT_LABEL={time:"Air time",popularity:"Most popular",score:"Highest rated",title:"A–Z",newest:"Newest"};
/* Same setting drives the Browse shelves. "Air time" is meaningless off the
   schedule (shelf titles aren't airing), so it falls back to popularity there. */
const BROWSE_SORT={
  popularity:(a,b)=>(b.popularity||0)-(a.popularity||0),
  score:(a,b)=>(b.averageScore||0)-(a.averageScore||0),
  title:(a,b)=>mTitle(a).localeCompare(mTitle(b)),
  newest:(a,b)=>(b.seasonYear||0)-(a.seasonYear||0)
};
function browseSorter(){return BROWSE_SORT[browseFilters.sort]||BROWSE_SORT.popularity;}
const _DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const _MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function _dayKey(at){const d=new Date(at*1000);return d.getFullYear()+"_"+d.getMonth()+"_"+d.getDate();}
function _dayLabel(at){
  const d=new Date(at*1000),now=new Date(),tm=new Date(now.getTime()+864e5);
  const same=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  let name=_DAYS[d.getDay()];if(same(d,now))name="Today";else if(same(d,tm))name="Tomorrow";
  return name+" · "+_MON[d.getMonth()]+" "+d.getDate();
}
function _timeLabel(at){try{return new Date(at*1000).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});}catch(e){return "";}}
/* AniList's countryOfOrigin takes one value, so a fetch-level narrow is only
   possible when exactly one origin is picked. With several we fetch unfiltered
   (which returns all countries) and narrow client-side. */
function langCountry(){return browseFilters.origins.length===1?browseFilters.origins[0]:null;}

function genreOrder(){return [...OB_GENRES].sort((a,b)=>(affinity[b]||0)-(affinity[a]||0));}
function browsePasses(m){
  const f=browseFilters;
  if(f.origins.length&&!(m.country&&f.origins.includes(m.country)))return false;
  if(f.platforms.length){
    // "__EN__" is a shortcut for the whole Western set — saves tapping seven chips
    const want=f.platforms.includes("__EN__")
      ? f.platforms.filter(p=>p!=="__EN__").concat(WESTERN_SITES)
      : f.platforms;
    if(!(m.sites&&m.sites.some(s=>want.includes(s))))return false;
  }
  if(f.formats.length&&!f.formats.includes(m.format))return false;
  // Audio only means anything on the Schedule: sub/dub comes from a weekly airing
  // timetable, so evergreen shelf titles are never in it and would all be culled.
  // Unmatched schedule titles have no .audio — unknown, so excluded rather than
  // guessed. Never treat "unknown" as "not dubbed".
  if(browseTab==="schedule"&&f.audio.length&&!(m.audio&&f.audio.some(a=>m.audio[a])))return false;
  return true;
}
/* includeNew=false for the Schedule: browsePasses ignores `new`, so counting it
   there would blame a filter that had nothing to do with the empty result */
function activeFilterCount(includeNew){
  const f=browseFilters;
  return f.origins.length+f.platforms.length+f.formats.length+f.audio.length+(includeNew&&f.new?1:0);
}

async function buildBrowse(){
  const data={genres:{},rec:[],loved:null};
  const country=langCountry();
  const top=genreOrder().slice(0,8);
  for(const g of top){ data.genres[g]=await fetchGenre(g,country).catch(()=>[]); }
  const acted=new Set([...seen,...want.map(w=>w.id),...watched.map(w=>w.id)]);
  const recBy=new Map();
  genreOrder().slice(0,4).forEach(g=>(data.genres[g]||[]).forEach(m=>{if(!acted.has(m.id)&&!recBy.has(m.id))recBy.set(m.id,m);}));
  data.rec=[...recBy.values()].sort((a,b)=>(b.averageScore||0)-(a.averageScore||0)).slice(0,20);
  const fav=watched.find(m=>m.tier==="S"&&m.status!=="watching")||watched.find(m=>m.tier==="A"&&m.status!=="watching");
  if(fav){try{const d=await fetchDetail(fav.id);if(d.recs&&d.recs.length)data.loved={title:fav.title,items:d.recs};}catch(e){}}
  return data;
}
async function buildSeason(){
  const data={all:[],genres:{}};
  const country=langCountry();
  let all=[];
  for(let p=1;p<=3;p++){const list=await fetchSeason(p,country).catch(()=>[]);all.push(...list);if(list.length<50)break;}
  const byId=new Map();all.forEach(m=>{if(!byId.has(m.id))byId.set(m.id,m);});
  data.all=[...byId.values()];
  OB_GENRES.forEach(g=>{data.genres[g]=data.all.filter(m=>(m.genres||[]).includes(g));});
  return data;
}

function bcard(m){
  const img=(m.coverImage&&(m.coverImage.extraLarge||m.coverImage.large))||"";
  const flag=m.country&&m.country!=="JP"?`<span class="btag cn">${m.country}</span>`:"";
  return `<div class="bcard" data-bopen="${m.id}">
    <div class="bposter" style="background-image:url('${img}')">
      ${m.averageScore?`<span class="bscore">${(m.averageScore/10).toFixed(1)}</span>`:""}
      ${m.status==="RELEASING"?`<span class="btag new">AIRING</span>`:m.status==="NOT_YET_RELEASED"?`<span class="btag soon">SOON</span>`:""}
      ${flag}
    </div>
    <div class="btitle">${mTitle(m)}</div>
  </div>`;
}
function shelfHTML(title,items,sub){
  const list=(items||[]).filter(browsePasses).slice().sort(browseSorter());
  if(!list.length)return "";
  const tag=browseFilters.sort&&browseFilters.sort!=="popularity"&&browseFilters.sort!=="time"
    ? ` <span class="shsort">${SORT_LABEL[browseFilters.sort]}</span>`:"";
  return `<div class="shelf"><h3>${title}${sub?` <span class="shsub">${sub}</span>`:""}${tag}</h3><div class="shelfscroll">${list.map(bcard).join("")}</div></div>`;
}
function _loadingHTML(t){return `<div class="browseload"><div class="spin"></div><p>${t||"Loading…"}</p></div>`;}

/* full-bleed spotlight at the top of the feed — the tall cover art reads far better
   than AniList's banners here (those are ~1900x400 and go to mush when cropped tall) */
function heroHTML(m,kicker){
  if(!m)return "";
  const img=(m.coverImage&&(m.coverImage.extraLarge||m.coverImage.large))||"";
  const inWant=want.some(x=>x.id===m.id);
  const meta=[m.format,m.seasonYear,(m.genres||[]).slice(0,2).join(" · ")].filter(Boolean).join("  ·  ");
  const score=m.averageScore?`<b>★ ${(m.averageScore/10).toFixed(1)}</b> · `:"";
  return `<div class="hero" data-bopen="${m.id}" style="background-image:url('${img}')">
    <div class="heroin">
      <span class="herokick">${score}${kicker||"Top pick for you"}</span>
      <h2>${mTitle(m)}</h2>
      <div class="herometa">${meta}</div>
      <div class="heroacts">
        <button class="herobtn primary${inWant?" done":""}" data-hwant="${m.id}"><span class="icw">${icSvg("star")}</span>${inWant?"Saved":"Want"}</button>
        <button class="herobtn" data-bopen="${m.id}"><span class="icw">${icSvg("info")}</span>Details</button>
      </div>
    </div>
  </div>`;
}

function paintBrowse(){
  const host=$("#browseShelves");
  if(browseFilters.new){
    if(!_seasonData){host.innerHTML=_loadingHTML("Pulling the full "+seasonLabel()+" lineup…");return;}
    const pool=_seasonData.all.filter(browsePasses);
    const star=pool.slice().sort((a,b)=>(b.averageScore||0)-(a.averageScore||0))[0];
    let html=heroHTML(star,"Biggest of "+seasonLabel());
    html+=shelfHTML("New this season",_seasonData.all.filter(m=>!star||m.id!==star.id),seasonLabel()+" · "+pool.length+" titles");
    genreOrder().forEach(g=>{html+=shelfHTML(g,_seasonData.genres[g]);});
    host.innerHTML=html||`<div class="emptylist">No titles this season match your filters.</div>`;
  }else{
    if(!_browseData){host.innerHTML=_loadingHTML("Building your Discover feed…");return;}
    const rec=_browseData.rec.filter(browsePasses);
    const star=rec[0];                                   // rec is already score-sorted
    let html=heroHTML(star);
    html+=shelfHTML("Recommended for you",_browseData.rec.filter(m=>!star||m.id!==star.id),"from your taste");
    if(_browseData.loved)html+=shelfHTML("Because you loved "+_browseData.loved.title,_browseData.loved.items);
    genreOrder().slice(0,8).forEach(g=>{html+=shelfHTML(g,_browseData.genres[g]);});
    host.innerHTML=html||`<div class="emptylist">Nothing matches this filter.</div>`;
  }
  host.querySelectorAll(".shelfscroll").forEach(el=>enableDragScroll(el));
}
function _browseItem(id){
  const pools=[];
  // richer pools first — schedule entries carry only the fields the calendar needs
  if(_seasonData)pools.push(_seasonData.all);
  if(_browseData){pools.push(_browseData.rec);if(_browseData.loved)pools.push(_browseData.loved.items);for(const g in _browseData.genres)pools.push(_browseData.genres[g]);}
  for(const p of pools){const f=p.find(m=>m.id==id);if(f)return f;}
  for(const wk in _schedCache){const e=_schedCache[wk].find(x=>x.m.id==id);if(e)return e.m;}
  return null;
}

/* ---- Best of a year ----
   Its own mode rather than a tab or a settings toggle: it takes over the feed
   while active and exits with one tap, so it never competes with Browse. */
let yearMode={year:null,lens:"gems"};
let _yearData=null,_yearToken=0;
const LENS_LABEL={popular:"Most popular",rated:"Top rated",gems:"Hidden gems"};
function yearBannerHTML(){
  return `<div class="yearbar">
    <div class="ybhead">
      <div><b>Best of ${yearMode.year}</b><span>${LENS_LABEL[yearMode.lens]}</span></div>
      <button class="ybx" id="yearExit" title="Back to Browse">${icSvg("x")}</button>
    </div>
    <div class="yblens">
      ${["popular","rated","gems"].map(l=>
        `<button class="yblbtn${l===yearMode.lens?" on":""}" data-ylens="${l}">${LENS_LABEL[l]}</button>`).join("")}
    </div>
  </div>`;
}
function ycard(m,i){
  const img=(m.coverImage&&(m.coverImage.extraLarge||m.coverImage.large))||"";
  const flag=m.country&&m.country!=="JP"?`<span class="schflag">${m.country}</span>`:"";
  return `<div class="schcard" data-bopen="${m.id}">
    <div class="schart" style="background-image:url('${img}')">
      <span class="yrank">${i+1}</span>${flag}
      ${m.averageScore?`<span class="schscore">${(m.averageScore/10).toFixed(1)}</span>`:""}
      <span class="schep">${m.format||""}${m.episodes?" · "+m.episodes+" ep":""}</span>
    </div>
    <div class="schname">${mTitle(m)}</div>
  </div>`;
}
function paintYear(){
  const host=$("#browseShelves");
  if(!_yearData){host.innerHTML=yearBannerHTML()+_loadingHTML("Digging through "+yearMode.year+"…");return;}
  const list=_yearData.filter(browsePasses);
  const hidden=_yearData.length-list.length;
  // Old titles often have no streaming links recorded, so a platform filter can
  // quietly gut a year. Say so instead of pretending the year was thin.
  const note=hidden?`<div class="yhid">${hidden} more hidden by your filters
      <button class="clearfilters" id="clearFilters">Clear filters</button></div>`:"";
  host.innerHTML=yearBannerHTML()+(list.length
    ? `<div class="schgrid">${list.map(ycard).join("")}</div>`+note
    : `<div class="emptylist">${hidden?hidden+" titles from "+yearMode.year+" are hidden by your filters."
         :"Nothing found for "+yearMode.year+"."}<br>
        ${hidden?`<button class="clearfilters" id="clearFilters">Clear filters</button>`
         :yearMode.lens==="gems"?"Hidden gems is strict — try Top rated.":""}</div>`);
}
async function renderYear(){
  paintYear();
  const tok=++_yearToken, y=yearMode.year, l=yearMode.lens;
  const d=await fetchYear(y,l).catch(()=>[]);
  if(tok!==_yearToken||yearMode.year!==y||yearMode.lens!==l)return;
  _yearData=d;
  if(currentView==="browse"&&browseTab==="year")paintYear();
}
function enterYear(y,lens){
  yearMode={year:y,lens:lens||yearMode.lens};
  browseTab="year";_yearData=null;
  $("#browseShelves").scrollTop=0;window.scrollTo(0,0);
  renderBrowse();
}
function exitYear(){
  yearMode.year=null;browseTab="browse";_yearData=null;
  document.querySelectorAll("#browseTabs .seg").forEach(s=>s.classList.toggle("on",s.dataset.btab==="browse"));
  renderBrowse();
}

/* weekly airing schedule (animeschedule-style poster grid) */
function schcard(e){
  const m=e.m,img=(m.coverImage&&(m.coverImage.extraLarge||m.coverImage.large))||"";
  const flag=m.country&&m.country!=="JP"?`<span class="schflag">${m.country}</span>`:"";
  const score=m.averageScore?`<span class="schscore">${(m.averageScore/10).toFixed(1)}</span>`:"";
  return `<div class="schcard" data-bopen="${m.id}">
    <div class="schart" style="background-image:url('${img}')">
      <span class="schtime">${_timeLabel(e.at)}</span>
      ${flag}${score}
      <span class="schep">EP ${e.ep}</span>
      ${m.audio?`<span class="schaud">${m.audio.sub?'<i class="sub">SUB</i>':""}${m.audio.dub?'<i class="dub">DUB</i>':""}</span>`:""}
    </div>
    <div class="schname">${mTitle(m)}</div>
  </div>`;
}
function _weekRangeLabel(off){
  const d0=new Date(Date.now()+off*7*864e5), d1=new Date(Date.now()+(off*7+6)*864e5);
  return _MON[d0.getMonth()]+" "+d0.getDate()+" – "+_MON[d1.getMonth()]+" "+d1.getDate();
}
function _weekNavHTML(){
  const label=_schedWeek===0?"This week":_schedWeek===-1?"Last week":_schedWeek===1?"Next week":
    (_schedWeek<0?Math.abs(_schedWeek)+" weeks ago":"In "+_schedWeek+" weeks");
  return `<div class="weeknav">
    <button class="wkbtn" data-wk="-1" title="Earlier">${icSvg("arrowL")}</button>
    <div class="wklabel"><b>${label}</b><span>${_weekRangeLabel(_schedWeek)}</span></div>
    <button class="wkbtn" data-wk="1" title="Later">${icSvg("arrowR")}</button>
    ${_schedWeek!==0?`<button class="wktoday" data-wk="0">Today</button>`:""}
  </div>`;
}
function paintSchedule(){
  const host=$("#browseShelves");
  const data=_schedCache[_schedWeek];
  if(!data){host.innerHTML=_weekNavHTML()+_loadingHTML("Loading the airing schedule…");return;}
  const entries=data.filter(e=>browsePasses(e.m));
  let body;
  if(!entries.length){
    const n=activeFilterCount(false);
    body=`<div class="emptylist">Nothing airing this week matches ${n?"your "+n+" active filter"+(n>1?"s":""):"this view"}.<br>
      ${n?`<button class="clearfilters" id="clearFilters">Clear filters</button>`:""}</div>`;
  }else{
    const order=[],map={};
    entries.forEach(e=>{const k=_dayKey(e.at);if(!map[k]){map[k]={at:e.at,items:[]};order.push(k);}map[k].items.push(e);});
    const cmp=SCHED_SORT[browseFilters.sort]||SCHED_SORT.time;
    order.forEach(k=>map[k].items.sort(cmp));      // days stay in date order; titles reorder inside each
    const tag=browseFilters.sort==="time"?"":`<span class="schsort">${SORT_LABEL[browseFilters.sort]}</span>`;
    body=order.map(k=>`<div class="schday"><div class="schdayhead">${_dayLabel(map[k].at)}<span class="schcount">${map[k].items.length}</span>${tag}</div><div class="schgrid">${map[k].items.map(schcard).join("")}</div></div>`).join("");
  }
  host.innerHTML=_weekNavHTML()+body;
}
async function renderSchedule(){
  paintSchedule();
  const tok=++_schedToken, wk=_schedWeek;
  if(!_schedCache[wk]){
    const d=await fetchSchedule(wk).catch(()=>[]);
    if(tok!==_schedToken)return;
    _schedCache[wk]=d;
  }
  // sub/dub is best-effort: if the proxy isn't up this is a no-op
  const idx=await fetchDubSub().catch(()=>null);
  if(tok!==_schedToken)return;
  if(idx)annotateDubSub(_schedCache[wk],idx);
  _audioAvailable=!!idx;
  if(currentView==="browse"&&browseTab==="schedule")paintSchedule();
}

async function renderBrowse(){
  if(browseTab==="year"&&yearMode.year){renderYear();return;}
  if(browseTab==="schedule"){renderSchedule();return;}
  paintBrowse();
  const tok=++_browseToken;   // any newer render (e.g. language changed) invalidates this load
  if(browseFilters.new){
    if(!_seasonData){const d=await buildSeason();if(tok!==_browseToken)return;_seasonData=d;}
  }else{
    if(!_browseData){const d=await buildBrowse();if(tok!==_browseToken)return;_browseData=d;}
  }
  if(currentView==="browse"&&browseTab==="browse")paintBrowse();
}

function _syncSettingsUI(){
  const t=$("#bsNew");if(t)t.classList.toggle("on",browseFilters.new);
  document.querySelectorAll("#bsSort [data-sort]").forEach(b=>b.classList.toggle("on",b.dataset.sort===browseFilters.sort));
  document.querySelectorAll("#bsAudio [data-audio]").forEach(b=>b.classList.toggle("on",browseFilters.audio.includes(b.dataset.audio)));
  const an=$("#audioNote");
  if(an)an.textContent=_audioAvailable
    ? "Live from animeschedule.net. Titles it doesn't track show no badge — that means unknown, not \"no dub\"."
    : "Sub/dub comes from animeschedule.net and needs the local helper running. Without it these do nothing.";
  document.querySelectorAll("#bsOrigins [data-origin]").forEach(b=>b.classList.toggle("on",browseFilters.origins.includes(b.dataset.origin)));
  document.querySelectorAll("#bsPlatforms [data-plat]").forEach(b=>b.classList.toggle("on",browseFilters.platforms.includes(b.dataset.plat)));
  document.querySelectorAll("#bsFormats [data-fmt]").forEach(b=>b.classList.toggle("on",browseFilters.formats.includes(b.dataset.fmt)));
}
function _updateGearDot(){
  const g=$("#browseGear");if(!g)return;
  g.classList.toggle("active",activeFilterCount(true)>0);
}

function initBrowse(){
  $("#browseGear").onclick=()=>{_syncSettingsUI();$("#browseSettings").classList.add("on");};
  $("#bsNew").onclick=()=>{browseFilters.new=!browseFilters.new;_syncSettingsUI();};
  document.querySelectorAll("#bsSort [data-sort]").forEach(b=>b.onclick=()=>{browseFilters.sort=b.dataset.sort;buzz(6);_syncSettingsUI();});
  document.querySelectorAll("#bsAudio [data-audio]").forEach(b=>b.onclick=()=>{toggleFilter("audio",b.dataset.audio);buzz(6);_syncSettingsUI();});
  document.querySelectorAll("#bsOrigins [data-origin]").forEach(b=>b.onclick=()=>{toggleFilter("origins",b.dataset.origin);buzz(6);_syncSettingsUI();});
  document.querySelectorAll("#bsPlatforms [data-plat]").forEach(b=>b.onclick=()=>{toggleFilter("platforms",b.dataset.plat);buzz(6);_syncSettingsUI();});
  document.querySelectorAll("#bsFormats [data-fmt]").forEach(b=>b.onclick=()=>{toggleFilter("formats",b.dataset.fmt);buzz(6);_syncSettingsUI();});
  $("#browseFiltersReset").onclick=()=>{
    browseFilters=Object.assign({},FILTER_DEFAULTS,{origins:[],platforms:[],formats:[],audio:[]});
    _syncSettingsUI();
  };
  function commitFilters(){
    $("#browseSettings").classList.remove("on");_updateGearDot();saveFilters();
    // a single origin narrows at fetch level, so re-pull when that changes
    const originKey=browseFilters.origins.length===1?browseFilters.origins[0]:"";
    if(originKey!==_loadedOrigin){_browseData=null;_seasonData=null;_loadedOrigin=originKey;}
    renderBrowse();
  }
  $("#browseSettingsDone").onclick=commitFilters;
  // dismissing by backdrop must commit too — the toggles already mutated state
  $("#browseSettings").addEventListener("click",e=>{if(e.target.id==="browseSettings")commitFilters();});
  _updateGearDot();   // persisted filters must light the gear on boot, not only after Done
  document.addEventListener("click",e=>{
    if(e.target.closest&&e.target.closest("#clearFilters")){
      browseFilters=Object.assign({},FILTER_DEFAULTS,{origins:[],platforms:[],formats:[],audio:[]});
      saveFilters();_updateGearDot();_browseData=null;_seasonData=null;_loadedOrigin="";renderBrowse();
    }
  });
  // schedule week navigation
  $("#browseShelves").addEventListener("click",e=>{
    const w=e.target.closest?e.target.closest("[data-wk]"):null;
    if(!w)return;
    e.stopPropagation();
    const v=w.dataset.wk;
    _schedWeek=v==="0"?0:_schedWeek+(+v);
    buzz(6);$("#browseShelves").scrollTop=0;window.scrollTo(0,0);
    renderSchedule();
  });
  // --- Best of a year ---
  const yearsHost=$("#ysYears");
  if(yearsHost){
    const now=new Date().getFullYear();
    let html="";
    for(let dec=Math.floor(now/10)*10;dec>=1960;dec-=10){
      const ys=[];
      for(let y=Math.min(dec+9,now);y>=dec;y--)ys.push(y);
      html+=`<div class="ydec"><span>${dec}s</span><div class="yrow">`+
        ys.map(y=>`<button class="ybtn" data-year="${y}">${y}</button>`).join("")+`</div></div>`;
    }
    yearsHost.innerHTML=html;
  }
  const syncLens=()=>document.querySelectorAll("#ysLens [data-lens]")
    .forEach(b=>b.classList.toggle("on",b.dataset.lens===yearMode.lens));
  $("#yearBtn").onclick=()=>{syncLens();$("#yearSheet").classList.add("on");};
  $("#yearClose").onclick=()=>$("#yearSheet").classList.remove("on");
  document.querySelectorAll("#ysLens [data-lens]").forEach(b=>b.onclick=()=>{
    yearMode.lens=b.dataset.lens;syncLens();buzz(6);
  });
  $("#ysYears").addEventListener("click",e=>{
    const b=e.target.closest("[data-year]");if(!b)return;
    $("#yearSheet").classList.remove("on");
    buzz(8);enterYear(+b.dataset.year);
  });
  // lens chips inside the banner + the exit button
  $("#browseShelves").addEventListener("click",e=>{
    if(!e.target.closest)return;
    if(e.target.closest("#yearExit")){exitYear();return;}
    const l=e.target.closest("[data-ylens]");
    if(l){yearMode.lens=l.dataset.ylens;_yearData=null;buzz(6);renderYear();}
  });

  document.querySelectorAll("#browseTabs .seg").forEach(b=>b.onclick=()=>{
    yearMode.year=null;_yearData=null;      // leaving year mode via the tabs
    browseTab=b.dataset.btab;
    document.querySelectorAll("#browseTabs .seg").forEach(s=>s.classList.toggle("on",s===b));
    buzz(6);$("#browseShelves").scrollTop=0;renderBrowse();
  });
  document.addEventListener("click",e=>{
    if(!e.target.closest)return;
    // hero Want — must win over the hero's own data-bopen
    const hw=e.target.closest("[data-hwant]");
    if(hw){
      e.stopPropagation();
      const m=_browseItem(hw.dataset.hwant);
      if(m){addWant(slim(m));bumpAffinity(m.genres,1.5);markSeen(m.id);
        hw.classList.add("done");hw.innerHTML=`<span class="icw">${icSvg("star")}</span>Saved`;
        buzz(8);toast("Added to Want");refreshCounts();}
      return;
    }
    const c=e.target.closest("#browseShelves [data-bopen]");
    if(!c)return;
    const rail=c.closest(".shelfscroll");if(rail&&rail._sc)return;
    const m=_browseItem(c.dataset.bopen);
    if(m)openDetails({id:m.id,title:mTitle(m),img:m.coverImage&&(m.coverImage.extraLarge||m.coverImage.large),genres:m.genres});
  });
}
