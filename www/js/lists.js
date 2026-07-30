/* taku · Want (swipe-to-reveal) + Tiers views */
function refreshCounts(){
  const nt=$("#nWatched");
  const total=want.length+watched.length;             // Tiers now holds Want + Watched + Watching
  if(nt){nt.textContent=total;nt.style.display=total?"grid":"none";}
  updateTierCounts();
  if(currentView==="watched")renderWatched();
}

/* one row open at a time */
let _openRow=null;
function closeOpenRow(){if(_openRow){_openRow.style.transform="";_openRow.dataset.open="0";_openRow=null;}}

/* horizontal swipe-to-reveal on a .swfront; vertical gestures pass through to scroll */
function attachSwipe(front,width,onTap){
  let sx=0,sy=0,dx=0,base=0,active=false,lock=null,t0=0;
  front.addEventListener("pointerdown",e=>{
    sx=e.clientX;sy=e.clientY;dx=0;lock=null;t0=Date.now();
    base=front.dataset.open==="1"?-width:0;
    active=true;front.style.transition="none";
  });
  front.addEventListener("pointermove",e=>{
    if(!active)return;
    const mx=e.clientX-sx,my=e.clientY-sy;
    if(lock===null){
      if(Math.abs(mx)<6&&Math.abs(my)<6)return;
      lock=Math.abs(mx)>Math.abs(my)?"h":"v";
      if(lock==="h"){front.setPointerCapture(e.pointerId);if(_openRow&&_openRow!==front)closeOpenRow();}
    }
    if(lock!=="h")return;
    dx=mx;
    let t=Math.max(-width-20,Math.min(0,base+dx));
    front.style.transform=`translateX(${t}px)`;
    e.preventDefault&&e.preventDefault();
  });
  front.addEventListener("pointerup",()=>{
    if(!active)return;active=false;
    front.style.transition="transform .22s ease";
    const moved=Math.abs(dx);
    if(lock!=="h"&&moved<8&&Date.now()-t0<450){ // tap
      if(front.dataset.open==="1"){closeOpenRow();}
      else onTap&&onTap();
      return;
    }
    const cur=base+dx;
    if(cur<-width/2){front.style.transform=`translateX(${-width}px)`;front.dataset.open="1";_openRow=front;}
    else{front.style.transform="";front.dataset.open="0";if(_openRow===front)_openRow=null;}
  });
  front.addEventListener("pointercancel",()=>{active=false;front.style.transition="transform .22s ease";front.style.transform=front.dataset.open==="1"?`translateX(${-width}px)`:"";});
}

function renderWant(){
  const c=$("#watchedList");_openRow=null;
  if(!want.length){c.innerHTML=`<div class="emptylist">Nothing saved yet.<br>Swipe right on anything that looks worth your time.</div>`;return;}
  c.innerHTML=want.map(m=>`
    <div class="swrow">
      <div class="swactions">
        <button class="swact watched" data-sw-watched="${m.id}"><span class="icw">${icSvg("star")}</span>Watched</button>
        <button class="swact unadd" data-sw-unadd="${m.id}"><span class="icw">${icSvg("x")}</span>Unadd</button>
      </div>
      <div class="swfront row" data-open="0">
        <img src="${m.img||""}" loading="lazy" alt="" />
        <div class="rc">
          <h4>${m.title}</h4>
          <div class="sub">${[m.year,(m.genres||[]).join(" · ")].filter(Boolean).join("  ·  ")}${m.score?"  ·  "+(m.score/10).toFixed(1):""}</div>
        </div>
        <span class="swhint">${icSvg("arrowL")}</span>
      </div>
    </div>`).join("");
  c.querySelectorAll(".swrow").forEach((row,i)=>{
    const m=want[i];
    attachSwipe(row.querySelector(".swfront"),176,()=>openDetails({id:m.id,title:m.title,img:m.img,genres:m.genres}));
  });
}

let tierTab="want";
function updateTierCounts(){
  const w=watched.filter(m=>m.status==="watching").length, r=watched.length-w;
  const cr=$("#cRanked"),cw=$("#cWatching"),cwant=$("#cWant");
  if(cr)cr.textContent=r||"";if(cw)cw.textContent=w||"";if(cwant)cwant.textContent=want.length||"";
}
function renderWatched(){
  updateTierCounts();
  if(tierTab==="want")return renderWant();
  return tierTab==="watching"?renderWatching():renderRanked();
}
function renderRanked(){
  const c=$("#watchedList");
  const list=watched.filter(m=>m.status!=="watching");
  if(!list.length){c.innerHTML=`<div class="emptylist">No ratings yet.<br>Swipe up on something you've finished and give it a tier.</div>`;return;}
  c.innerHTML=list.map((m,i)=>`
    <div class="row">
      <span class="rank">${i+1}</span>
      <div class="tier" style="background:${TIER_COLOR[m.tier]||"var(--line)"}">${m.tier||"–"}</div>
      <div class="rc rc-open" data-open-watched="${m.id}">
        <h4>${m.title}</h4>
        <div class="sub">${[m.year,(m.genres||[]).join(" · ")].filter(Boolean).join("  ·  ")}</div>
      </div>
      <button class="x" data-rewatch="${m.id}" title="Re-rate"><span class="icw">${icSvg("rotate")}</span></button>
      <button class="x" data-watch-remove="${m.id}" title="Remove"><span class="icw">${icSvg("x")}</span></button>
    </div>`).join("");
}
async function renderWatching(){
  const c=$("#watchedList");
  const list=watched.filter(m=>m.status==="watching");
  if(!list.length){c.innerHTML=`<div class="emptylist">Nothing in progress.<br>When you start a show, rate it as <b>Still watching</b>.</div>`;return;}
  c.innerHTML=list.map(m=>`
    <div class="row">
      ${m.tier?`<div class="tier sm" style="background:${TIER_COLOR[m.tier]}">${m.tier}</div>`:`<span class="livedot"></span>`}
      <div class="rc rc-open" data-open-watched="${m.id}">
        <h4>${m.title}</h4>
        <div class="sub airing" data-air="${m.id}">checking schedule…</div>
      </div>
      <button class="x" data-finish="${m.id}" title="Finished — rate it"><span class="icw">${icSvg("star")}</span></button>
      <button class="x" data-watch-remove="${m.id}" title="Remove"><span class="icw">${icSvg("x")}</span></button>
    </div>`).join("");
  const map=await fetchNextAiring(list.map(m=>m.id));
  if(currentView!=="watched"||tierTab!=="watching")return;
  list.forEach(m=>{
    const el=c.querySelector(`[data-air="${m.id}"]`);if(!el)return;
    const info=map[m.id];
    const txt=airingText(info&&info.next,info&&info.status);
    el.textContent=txt||[m.year,(m.genres||[]).join(" · ")].filter(Boolean).join("  ·  ");
    if(info&&info.next)el.classList.add("live");
  });
}

document.addEventListener("click",e=>{
  // tier sub-tabs (Watched / Watching)
  const seg=e.target.closest?e.target.closest("#tierTabs .seg"):null;
  if(seg){tierTab=seg.dataset.tiertab;document.querySelectorAll("#tierTabs .seg").forEach(s=>s.classList.toggle("on",s===seg));renderWatched();return;}

  const t=e.target.closest?e.target.closest("[data-sw-watched],[data-sw-unadd],[data-watch-remove],[data-rewatch],[data-open-watched],[data-finish]"):null;
  if(!t)return;const d=t.dataset;
  if(d.swUnadd){removeWant(+d.swUnadd);closeOpenRow();refreshCounts();toast("Removed from Want");}
  if(d.swWatched){const m=want.find(x=>x.id==d.swWatched);if(m){closeOpenRow();openRateFor(m,"watched");}}
  if(d.watchRemove){removeWatched(+d.watchRemove);refreshCounts();}
  if(d.rewatch){const m=watched.find(x=>x.id==d.rewatch);if(m)openRateFor(m,m.status||"watched");}
  if(d.finish){const m=watched.find(x=>x.id==d.finish);if(m)openRateFor(m,"watched");}
  if(d.openWatched){const m=watched.find(x=>x.id==d.openWatched);if(m)openDetails({id:m.id,title:m.title,img:m.img,genres:m.genres});}
});
