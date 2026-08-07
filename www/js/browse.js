/* taku · Discover — browse: genre shelves, personalized, full-season "new releases", language filter */
let browseFilters={new:false,lang:"all",platform:"all",format:"all"};
let browseTab="browse";                      // browse | schedule
let _browseData=null, _seasonData=null, _loadedLang="all", _browseToken=0, _schedToken=0;
let _schedWeek=0, _schedCache={};            // week offset: 0 = next 7 days, -1 = last week
const PLATFORMS=["Crunchyroll","Netflix","Hulu","Amazon Prime Video","HIDIVE","Disney Plus","Bilibili TV"];
const FORMATS=["TV","TV_SHORT","MOVIE","ONA","OVA","SPECIAL"];
const LANG_COUNTRY={japanese:"JP",chinese:"CN",korean:"KR"};
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
function langCountry(){return LANG_COUNTRY[browseFilters.lang]||null;} // JP/CN/KR, or null for all/english

function genreOrder(){return [...OB_GENRES].sort((a,b)=>(affinity[b]||0)-(affinity[a]||0));}
function browsePasses(m){
  if(browseFilters.platform!=="all"){
    if(!m.sites||!m.sites.includes(browseFilters.platform))return false;
  }
  if(browseFilters.format!=="all"&&m.format!==browseFilters.format)return false;
  if(browseFilters.lang==="english")return !!m.en;                 // English = available on a Western platform
  const c=langCountry();
  if(c&&m.country&&m.country!==c)return false;                     // guards mixed-source shelves (recs)
  return true;
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
  const img=(m.coverImage&&m.coverImage.large)||"";
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
  const list=(items||[]).filter(browsePasses);
  if(!list.length)return "";
  return `<div class="shelf"><h3>${title}${sub?` <span class="shsub">${sub}</span>`:""}</h3><div class="shelfscroll">${list.map(bcard).join("")}</div></div>`;
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
    host.innerHTML=html||`<div class="emptylist">No titles match this language filter this season.</div>`;
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
  for(const wk in _schedCache){const e=_schedCache[wk].find(x=>x.m.id==id);if(e)return e.m;}
  if(_seasonData)pools.push(_seasonData.all);
  if(_browseData){pools.push(_browseData.rec);if(_browseData.loved)pools.push(_browseData.loved.items);for(const g in _browseData.genres)pools.push(_browseData.genres[g]);}
  for(const p of pools){const f=p.find(m=>m.id==id);if(f)return f;}
  return null;
}

/* weekly airing schedule (animeschedule-style poster grid) */
function schcard(e){
  const m=e.m,img=(m.coverImage&&m.coverImage.large)||"";
  const flag=m.country&&m.country!=="JP"?`<span class="schflag">${m.country}</span>`:"";
  const score=m.averageScore?`<span class="schscore">${(m.averageScore/10).toFixed(1)}</span>`:"";
  return `<div class="schcard" data-bopen="${m.id}">
    <div class="schart" style="background-image:url('${img}')">
      <span class="schtime">${_timeLabel(e.at)}</span>
      ${flag}${score}
      <span class="schep">EP ${e.ep}</span>
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
  if(!entries.length){body=`<div class="emptylist">Nothing airing this week matches your filters.</div>`;}
  else{
    const order=[],map={};
    entries.forEach(e=>{const k=_dayKey(e.at);if(!map[k]){map[k]={at:e.at,items:[]};order.push(k);}map[k].items.push(e);});
    body=order.map(k=>`<div class="schday"><div class="schdayhead">${_dayLabel(map[k].at)}<span class="schcount">${map[k].items.length}</span></div><div class="schgrid">${map[k].items.map(schcard).join("")}</div></div>`).join("");
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
  if(currentView==="browse"&&browseTab==="schedule")paintSchedule();
}

async function renderBrowse(){
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
  document.querySelectorAll("#browseSettings [data-lang]").forEach(b=>b.classList.toggle("on",b.dataset.lang===browseFilters.lang));
  document.querySelectorAll("#bsPlatforms [data-plat]").forEach(b=>b.classList.toggle("on",b.dataset.plat===browseFilters.platform));
  document.querySelectorAll("#bsFormats [data-fmt]").forEach(b=>b.classList.toggle("on",b.dataset.fmt===browseFilters.format));
}
function _updateGearDot(){
  const g=$("#browseGear");if(!g)return;
  const on=browseFilters.new||browseFilters.lang!=="all"||browseFilters.platform!=="all"||browseFilters.format!=="all";
  g.classList.toggle("active",on);
}

function initBrowse(){
  $("#browseGear").onclick=()=>{_syncSettingsUI();$("#browseSettings").classList.add("on");};
  $("#bsNew").onclick=()=>{browseFilters.new=!browseFilters.new;_syncSettingsUI();};
  document.querySelectorAll("#browseSettings [data-lang]").forEach(b=>b.onclick=()=>{browseFilters.lang=b.dataset.lang;_syncSettingsUI();});
  document.querySelectorAll("#bsPlatforms [data-plat]").forEach(b=>b.onclick=()=>{browseFilters.platform=b.dataset.plat;_syncSettingsUI();});
  document.querySelectorAll("#bsFormats [data-fmt]").forEach(b=>b.onclick=()=>{browseFilters.format=b.dataset.fmt;_syncSettingsUI();});
  $("#browseSettingsDone").onclick=()=>{
    $("#browseSettings").classList.remove("on");_updateGearDot();
    if(browseFilters.lang!==_loadedLang){_browseData=null;_seasonData=null;_loadedLang=browseFilters.lang;} // language changed → re-fetch the right country
    renderBrowse();
  };
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
  document.querySelectorAll("#browseTabs .seg").forEach(b=>b.onclick=()=>{
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
    if(m)openDetails({id:m.id,title:mTitle(m),img:m.coverImage&&m.coverImage.large,genres:m.genres});
  });
}
