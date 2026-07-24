/* taku · Discover — Crunchyroll-style browse: personalized + genre shelves, no swiping */
let browseFilters={new:false,english:false};
let _browseData=null, _browseLoading=false;

function genreOrder(){return [...OB_GENRES].sort((a,b)=>(affinity[b]||0)-(affinity[a]||0));}

async function loadBrowseData(){
  _browseData={genres:{},rec:[],loved:null};
  const top=genreOrder().slice(0,8);
  // sequential fetch — respects AniList's burst limiter; cached after first load
  for(const g of top){ _browseData.genres[g]=await fetchGenre(g).catch(()=>[]); }
  // Recommended: merge the user's top affinity genres, drop anything already acted on, best-scored first
  const acted=new Set([...seen,...want.map(w=>w.id),...watched.map(w=>w.id)]);
  const seenRec=new Map();
  genreOrder().slice(0,4).forEach(g=>(_browseData.genres[g]||[]).forEach(m=>{if(!acted.has(m.id)&&!seenRec.has(m.id))seenRec.set(m.id,m);}));
  _browseData.rec=[...seenRec.values()].sort((a,b)=>(b.averageScore||0)-(a.averageScore||0)).slice(0,20);
  // "Because you loved X" — from your highest-rated finished show
  const fav=watched.find(m=>m.tier==="S"&&m.status!=="watching")||watched.find(m=>m.tier==="A"&&m.status!=="watching");
  if(fav){try{const d=await fetchDetail(fav.id);if(d.recs&&d.recs.length)_browseData.loved={title:fav.title,items:d.recs};}catch(e){}}
}

function browsePasses(m){
  if(browseFilters.english&&!m.en)return false;
  if(browseFilters.new){const {s,y}=curSeason();if(!(m.status==="RELEASING"||m.seasonYear===y||(m.seasonYear===y-1)))return false;}
  return true;
}
function bcard(m){
  const img=(m.coverImage&&m.coverImage.large)||"";
  return `<div class="bcard" data-bopen="${m.id}">
    <div class="bposter" style="background-image:url('${img}')">
      ${m.averageScore?`<span class="bscore">${(m.averageScore/10).toFixed(1)}</span>`:""}
      ${m.status==="RELEASING"?`<span class="btag new">NEW</span>`:""}
      ${m.en?`<span class="btag en">EN</span>`:""}
    </div>
    <div class="btitle">${mTitle(m)}</div>
  </div>`;
}
function shelfHTML(title,items,sub){
  const list=(items||[]).filter(browsePasses);
  if(!list.length)return "";
  return `<div class="shelf"><h3>${title}${sub?` <span class="shsub">${sub}</span>`:""}</h3><div class="shelfscroll">${list.map(bcard).join("")}</div></div>`;
}
function paintBrowse(){
  const host=$("#browseShelves");
  if(!_browseData){host.innerHTML=`<div class="browseload"><div class="spin"></div><p>Building your Discover feed…</p></div>`;return;}
  let html="";
  html+=shelfHTML("Recommended for you",_browseData.rec,"from your taste");
  if(_browseData.loved)html+=shelfHTML("Because you loved "+_browseData.loved.title,_browseData.loved.items);
  genreOrder().slice(0,8).forEach(g=>{html+=shelfHTML(g,_browseData.genres[g]);});
  host.innerHTML=html||`<div class="emptylist">Nothing matches these filters.<br>Try turning one off.</div>`;
  host.querySelectorAll(".shelfscroll").forEach(el=>enableDragScroll(el));
}
function _browseItem(id){
  if(!_browseData)return null;
  if(_browseData.loved){const f=_browseData.loved.items.find(m=>m.id==id);if(f)return f;}
  const r=_browseData.rec.find(m=>m.id==id);if(r)return r;
  for(const g in _browseData.genres){const f=_browseData.genres[g].find(m=>m.id==id);if(f)return f;}
  return null;
}

async function renderBrowse(){
  paintBrowse(); // loading state or existing
  if(!_browseData&&!_browseLoading){
    _browseLoading=true;
    await loadBrowseData();
    _browseLoading=false;
    if(currentView==="browse")paintBrowse();
  }
}

function initBrowse(){
  document.querySelectorAll("#view-browse .bchip").forEach(b=>b.onclick=()=>{
    browseFilters[b.dataset.bf]=!browseFilters[b.dataset.bf];
    b.classList.toggle("on");buzz(6);paintBrowse();
  });
  // open detail from a poster (ignore if it was a drag-scroll)
  document.addEventListener("click",e=>{
    const c=e.target.closest?e.target.closest("#browseShelves .bcard"):null;
    if(!c)return;
    const rail=c.closest(".shelfscroll");if(rail&&rail._sc)return;
    const m=_browseItem(c.dataset.bopen);
    if(m)openDetails({id:m.id,title:mTitle(m),img:m.coverImage&&m.coverImage.large,genres:m.genres});
  });
}
