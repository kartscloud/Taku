/* naku · Want + Tiers views */
function refreshCounts(){
  const nw=$("#nWant"),nt=$("#nWatched");
  nw.textContent=want.length;nw.style.display=want.length?"grid":"none";
  nt.textContent=watched.length;nt.style.display=watched.length?"grid":"none";
  $("#wantCount").textContent=want.length+" title"+(want.length!==1?"s":"");
  $("#watchedCount").textContent=watched.length+" ranked";
  if(currentView==="want")renderWant();
  if(currentView==="watched")renderWatched();
}
function renderWant(){
  const c=$("#wantList");
  if(!want.length){c.innerHTML=`<div class="emptylist">Nothing saved yet.<br>Swipe right on anything that looks worth your time.</div>`;return;}
  c.innerHTML=want.map(m=>`
    <div class="row">
      <img src="${m.img||""}" loading="lazy" alt="" />
      <div class="rc">
        <h4>${m.title}</h4>
        <div class="sub">${[m.year,(m.genres||[]).join(" · ")].filter(Boolean).join("  ·  ")}${m.score?"  ·  "+(m.score/10).toFixed(1):""}</div>
      </div>
      <button class="x" data-want-watched="${m.id}" title="Seen it — rate"><span class="icw">${icSvg("star")}</span></button>
      <button class="x" data-want-remove="${m.id}" title="Remove"><span class="icw">${icSvg("x")}</span></button>
    </div>`).join("");
}
function renderWatched(){
  const c=$("#watchedList");
  if(!watched.length){c.innerHTML=`<div class="emptylist">No ratings yet.<br>Swipe up on something you've seen and give it a tier.</div>`;return;}
  c.innerHTML=watched.map((m,i)=>`
    <div class="row">
      <span class="rank">${i+1}</span>
      <div class="tier" style="background:${TIER_COLOR[m.tier]||"var(--line)"}">${m.tier||"–"}</div>
      <img src="${m.img||""}" loading="lazy" alt="" />
      <div class="rc">
        <h4>${m.title}</h4>
        <div class="sub">${[m.year,(m.genres||[]).join(" · ")].filter(Boolean).join("  ·  ")}</div>
      </div>
      <button class="x" data-rewatch="${m.id}" title="Re-rate"><span class="icw">${icSvg("rotate")}</span></button>
      <button class="x" data-watch-remove="${m.id}" title="Remove"><span class="icw">${icSvg("x")}</span></button>
    </div>`).join("");
}

document.addEventListener("click",e=>{
  const t=e.target.closest?e.target.closest("[data-want-remove],[data-want-watched],[data-watch-remove],[data-rewatch]"):null;
  if(!t)return;const d=t.dataset;
  if(d.wantRemove){removeWant(+d.wantRemove);refreshCounts();}
  if(d.wantWatched){const m=want.find(x=>x.id==d.wantWatched);if(m){pendingWatch={rec:m,genres:m.genres||[]};$("#rateTitle").textContent=m.title;$("#rateModal").classList.add("on");}}
  if(d.watchRemove){removeWatched(+d.watchRemove);refreshCounts();}
  if(d.rewatch){const m=watched.find(x=>x.id==d.rewatch);if(m){pendingWatch={rec:m,genres:m.genres||[]};$("#rateTitle").textContent=m.title;$("#rateModal").classList.add("on");}}
});
