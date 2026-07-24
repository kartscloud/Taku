/* taku · Discover — browse: genre shelves, personalized, full-season "new releases", language filter */
let browseFilters={new:false,lang:"all"};   // lang: all | english | japanese | chinese | korean
let _browseData=null, _seasonData=null, _loadedLang="all", _browseToken=0;
const LANG_COUNTRY={japanese:"JP",chinese:"CN",korean:"KR"};
function langCountry(){return LANG_COUNTRY[browseFilters.lang]||null;} // JP/CN/KR, or null for all/english

function genreOrder(){return [...OB_GENRES].sort((a,b)=>(affinity[b]||0)-(affinity[a]||0));}
function browsePasses(m){
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

function paintBrowse(){
  const host=$("#browseShelves");
  if(browseFilters.new){
    if(!_seasonData){host.innerHTML=_loadingHTML("Pulling the full "+seasonLabel()+" lineup…");return;}
    let html=shelfHTML("New this season",_seasonData.all,seasonLabel()+" · "+_seasonData.all.filter(browsePasses).length+" titles");
    genreOrder().forEach(g=>{html+=shelfHTML(g,_seasonData.genres[g]);});
    host.innerHTML=html||`<div class="emptylist">No titles match this language filter this season.</div>`;
  }else{
    if(!_browseData){host.innerHTML=_loadingHTML("Building your Discover feed…");return;}
    let html=shelfHTML("Recommended for you",_browseData.rec,"from your taste");
    if(_browseData.loved)html+=shelfHTML("Because you loved "+_browseData.loved.title,_browseData.loved.items);
    genreOrder().slice(0,8).forEach(g=>{html+=shelfHTML(g,_browseData.genres[g]);});
    host.innerHTML=html||`<div class="emptylist">Nothing matches this filter.</div>`;
  }
  host.querySelectorAll(".shelfscroll").forEach(el=>enableDragScroll(el));
}
function _browseItem(id){
  const pools=[];
  if(_seasonData)pools.push(_seasonData.all);
  if(_browseData){pools.push(_browseData.rec);if(_browseData.loved)pools.push(_browseData.loved.items);for(const g in _browseData.genres)pools.push(_browseData.genres[g]);}
  for(const p of pools){const f=p.find(m=>m.id==id);if(f)return f;}
  return null;
}

async function renderBrowse(){
  paintBrowse();
  const tok=++_browseToken;   // any newer render (e.g. language changed) invalidates this load
  if(browseFilters.new){
    if(!_seasonData){const d=await buildSeason();if(tok!==_browseToken)return;_seasonData=d;}
  }else{
    if(!_browseData){const d=await buildBrowse();if(tok!==_browseToken)return;_browseData=d;}
  }
  if(currentView==="browse")paintBrowse();
}

function _syncSettingsUI(){
  const t=$("#bsNew");if(t)t.classList.toggle("on",browseFilters.new);
  document.querySelectorAll("#browseSettings .langopt").forEach(b=>b.classList.toggle("on",b.dataset.lang===browseFilters.lang));
}
function _updateGearDot(){const g=$("#browseGear");if(g)g.classList.toggle("active",browseFilters.new||browseFilters.lang!=="all");}

function initBrowse(){
  $("#browseGear").onclick=()=>{_syncSettingsUI();$("#browseSettings").classList.add("on");};
  $("#bsNew").onclick=()=>{browseFilters.new=!browseFilters.new;_syncSettingsUI();};
  document.querySelectorAll("#browseSettings .langopt").forEach(b=>b.onclick=()=>{browseFilters.lang=b.dataset.lang;_syncSettingsUI();});
  $("#browseSettingsDone").onclick=()=>{
    $("#browseSettings").classList.remove("on");_updateGearDot();
    if(browseFilters.lang!==_loadedLang){_browseData=null;_seasonData=null;_loadedLang=browseFilters.lang;} // language changed → re-fetch the right country
    renderBrowse();
  };
  document.addEventListener("click",e=>{
    const c=e.target.closest?e.target.closest("#browseShelves .bcard"):null;
    if(!c)return;
    const rail=c.closest(".shelfscroll");if(rail&&rail._sc)return;
    const m=_browseItem(c.dataset.bopen);
    if(m)openDetails({id:m.id,title:mTitle(m),img:m.coverImage&&m.coverImage.large,genres:m.genres});
  });
}
