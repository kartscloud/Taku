/* taku · search — lives inside Discover; empty box shows the browse feed, typing shows results */
let _searchT=null,_lastQ="",_searchResults=[];
function _searchMode(on){
  const head=$("#browseHead"),shelves=$("#browseShelves"),list=$("#searchList"),clr=$("#searchClear");
  if(head)head.style.display=on?"none":"";
  if(shelves)shelves.style.display=on?"none":"";
  if(list)list.style.display=on?"block":"none";
  if(clr)clr.hidden=!on;
}
function initSearch(){
  const inp=$("#searchInput");
  inp.addEventListener("input",()=>{
    clearTimeout(_searchT);
    const q=inp.value.trim();
    if(q.length<2){_lastQ="";_searchMode(false);return;}   // back to the discovery feed
    _searchMode(true);
    $("#searchList").innerHTML=`<div class="searchmsg"><div class="spin" style="margin:0 auto 12px"></div>Searching…</div>`;
    _searchT=setTimeout(()=>runSearch(q),350);
  });
  const clr=$("#searchClear");
  if(clr)clr.onclick=()=>{inp.value="";_lastQ="";_searchMode(false);inp.focus();};
}
async function runSearch(q){
  if(q===_lastQ)return;_lastQ=q;
  $("#searchList").innerHTML=`<div class="searchmsg"><div class="spin" style="margin:0 auto 12px"></div>Searching…</div>`;
  try{
    const res=await searchAnime(q);
    if(q!==_lastQ)return;
    _searchResults=res;
    if(!res.length){$("#searchList").innerHTML=`<div class="searchmsg">Nothing found for “${q}”.</div>`;return;}
    $("#searchList").innerHTML=res.map(m=>{
      const inWant=want.some(x=>x.id===m.id),inWatched=watched.some(x=>x.id===m.id);
      return `<div class="row" data-open="${m.id}">
        <img src="${(m.coverImage&&m.coverImage.large)||""}" loading="lazy" alt="" />
        <div class="rc">
          <h4>${mTitle(m)}</h4>
          <div class="sub">${[m.seasonYear,m.format,(m.genres||[]).slice(0,2).join(" · ")].filter(Boolean).join("  ·  ")}${m.averageScore?"  ·  "+(m.averageScore/10).toFixed(1):""}</div>
        </div>
        <div class="srow-actions">
          <button class="sact want ${inWant?'done':''}" data-s-want="${m.id}" title="Want to watch"><span class="icw">${icSvg("heart")}</span></button>
          <button class="sact watch ${inWatched?'done':''}" data-s-watch="${m.id}" title="Seen it — rate"><span class="icw">${icSvg("star")}</span></button>
        </div>
      </div>`;}).join("");
  }catch(e){$("#searchList").innerHTML=`<div class="searchmsg">Search failed — check your connection.</div>`;}
}
document.addEventListener("click",e=>{
  if(!e.target.closest)return;
  const wantBtn=e.target.closest("[data-s-want]");
  if(wantBtn){const m=_searchResults.find(x=>x.id==wantBtn.dataset.sWant);if(m){addWant(slim(m));bumpAffinity(m.genres,1.5);markSeen(m.id);wantBtn.classList.add("done");toast("Added to Want");refreshCounts();}return;}
  const watchBtn=e.target.closest("[data-s-watch]");
  if(watchBtn){const m=_searchResults.find(x=>x.id==watchBtn.dataset.sWatch);if(m){markSeen(m.id);openRate(m);}return;}
  const rowEl=e.target.closest("[data-open]");
  if(rowEl&&!e.target.closest(".srow-actions")){const m=_searchResults.find(x=>x.id==rowEl.dataset.open);if(m)openDetails(m);}
});
