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

let tierTab="list";      // list | want
let listTab="watching";  // within List: watching | ranked
function updateTierCounts(){
  const w=watched.filter(m=>m.status==="watching").length, r=watched.length-w;
  const cr=$("#cRanked"),cw=$("#cWatching"),cwant=$("#cWant"),cl=$("#cList");
  if(cr)cr.textContent=r||"";if(cw)cw.textContent=w||"";
  if(cwant)cwant.textContent=want.length||"";
  if(cl)cl.textContent=watched.length||"";
  const ct=$("#cTrash");if(ct)ct.textContent=trash.length||"";
}
function renderWatched(){
  updateTierCounts();
  const sub=$("#listSub");if(sub)sub.style.display=tierTab==="list"?"":"none";
  if(tierTab==="want")return renderWant();
  if(listTab==="trash")return renderTrash();
  return listTab==="watching"?renderWatching():renderRanked();
}
function renderRanked(){
  const c=$("#watchedList");
  const list=watched.filter(m=>m.status!=="watching");
  if(!list.length){c.innerHTML=`<div class="emptylist">No ratings yet.<br>Swipe up on something you've finished and give it a tier.</div>`;return;}
  const untiered=list.filter(m=>!m.tier).length;
  const banner=untiered?`<button class="rankcta" id="rankCta">
      <span class="rcicon icw">${icSvg("trophy")}</span>
      <span class="rctext"><b>${untiered} show${untiered>1?"s":""} need${untiered>1?"":"s"} a tier</b><span>Rank them in one pass</span></span>
      <span class="rcgo icw">${icSvg("arrowR")}</span>
    </button>`:"";
  c.innerHTML=banner+list.map((m,i)=>`
    <div class="row rankrow" data-rid="${m.id}">
      <span class="rank grip" data-grip title="Drag to reorder">${i+1}</span>
      <div class="tier" style="background:${TIER_COLOR[m.tier]||"var(--line)"}">${m.tier||"–"}</div>
      <div class="rc rc-open" data-open-watched="${m.id}">
        <h4>${m.title}</h4>
        <div class="sub">${[m.year,(m.genres||[]).join(" · ")].filter(Boolean).join("  ·  ")}</div>
      </div>
      <button class="x" data-rewatch="${m.id}" title="Re-rate"><span class="icw">${icSvg("rotate")}</span></button>
      <button class="x danger" data-watch-remove="${m.id}" title="Remove"><span class="icw">${icSvg("x")}</span></button>
    </div>`).join("");
  enableTierDrag(c);
}

/* ---- drag to re-rank ----
   Live DOM reordering (the dragged row swaps places as you pass others) rather
   than a floating ghost — far less to go wrong on touch, and the list always
   shows its true post-drop state. Only the rank number is a drag handle, so
   tapping the row still opens details and the buttons still work. */
function enableTierDrag(container){
  if(container._dragBound)return;      // one binding per container, survives re-render
  container._dragBound=true;
  let row=null,dragging=false,startY=0,pid=null;

  const onDown=e=>{
    if(e.button!==undefined&&e.button!==0)return;          // left button only
    if(e.target.closest("button"))return;                  // let re-rate / remove work
    const r=e.target.closest(".rankrow");
    if(!r||r.parentNode!==container)return;
    row=r;startY=e.clientY;pid=e.pointerId;dragging=false;
  };
  const onMove=e=>{
    if(!row||(pid!=null&&e.pointerId!==pid))return;
    if(!dragging){
      if(Math.abs(e.clientY-startY)<8)return;              // let taps and scrolls through
      dragging=true;row.classList.add("dragging");buzz(8);
      document.body.classList.add("dragging-row");         // kills text selection
    }
    e.preventDefault();
    row.style.pointerEvents="none";                        // see what's underneath
    const under=document.elementFromPoint(e.clientX,e.clientY);
    row.style.pointerEvents="";
    const over=under&&under.closest?under.closest(".rankrow"):null;
    if(over&&over!==row&&over.parentNode===container){
      const b=over.getBoundingClientRect();
      container.insertBefore(row,e.clientY>b.top+b.height/2?over.nextSibling:over);
    }
  };
  const onUp=()=>{
    if(!row)return;
    const wasDragging=dragging,id=+row.dataset.rid;
    row.classList.remove("dragging");
    document.body.classList.remove("dragging-row");
    row=null;dragging=false;pid=null;
    if(wasDragging)commitTierOrder(container,id);
  };

  // Bound to the DOCUMENT, not the row: pointer capture on a small child proved
  // unreliable — the capture reported success yet pointermove never reached it,
  // so the drag silently did nothing. Document-level listeners always fire.
  container.addEventListener("pointerdown",onDown);
  document.addEventListener("pointermove",onMove,{passive:false});
  document.addEventListener("pointerup",onUp);
  document.addEventListener("pointercancel",onUp);
}
function commitTierOrder(container,movedId){
  const ids=[...container.querySelectorAll(".rankrow")].map(r=>+r.dataset.rid);
  const byId=new Map(watched.map(m=>[m.id,m]));
  const ranked=ids.map(id=>byId.get(id)).filter(Boolean);
  if(!ranked.length)return;
  // ONLY the row you dragged can change tier, and it takes whichever tier it
  // was dropped among — so the badge can never contradict where it now sits.
  const i=ranked.findIndex(m=>m.id===movedId);
  if(i>=0){
    const neighbour=ranked[i-1]||ranked[i+1];
    if(neighbour&&neighbour.tier&&neighbour.tier!==ranked[i].tier){
      ranked[i].tier=neighbour.tier;
      toast("Moved to "+neighbour.tier+" tier");
    }
  }
  ranked.forEach((m,n)=>{m.ord=n;});
  watched=ranked.concat(watched.filter(m=>m.status==="watching"));
  sortWatched();store.set("watched",watched);
  renderWatched();refreshCounts();
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
      <button class="x ok" data-finish="${m.id}" title="Finished — rate it"><span class="icw">${icSvg("check")}</span></button>
      <button class="x danger" data-watch-remove="${m.id}" title="Remove"><span class="icw">${icSvg("x")}</span></button>
    </div>`).join("");
  const map=await fetchNextAiring(list.map(m=>m.id));
  if(currentView!=="watched"||tierTab!=="list"||listTab!=="watching")return;
  list.forEach(m=>{
    const el=c.querySelector(`[data-air="${m.id}"]`);if(!el)return;
    const info=map[m.id];
    const txt=airingText(info&&info.next,info&&info.status);
    el.textContent=txt||[m.year,(m.genres||[]).join(" · ")].filter(Boolean).join("  ·  ");
    if(info&&info.next)el.classList.add("live");
  });
}

/* ---- Dropped: removals are reversible, and you choose whether it can resurface ----
   Users see "Dropped"; the code (listTab "trash", the `trash` array, addTrash/purgeTrash/
   restoreTrash, id="cTrash", the localStorage key) keeps the old "trash" name on purpose —
   renaming the storage key would orphan data already on people's devices. */
const FROM_LABEL={want:"Want to watch",watching:"Watching",watched:"Watched"};
let _pendingRemove=null;
function askRemove(rec,from){
  _pendingRemove={rec,from};
  $("#cfTitle").textContent="Drop “"+rec.title+"”?";
  $("#cfBody").textContent="It goes to Dropped. You can put it back any time.";
  $("#confirmModal").classList.add("on");
}
function _doRemove(suggest){
  if(!_pendingRemove)return;
  const {rec,from}=_pendingRemove;
  if(from==="want")removeWant(rec.id);else removeWatched(rec.id);
  addTrash(rec,from,suggest);
  if(suggest){seen.delete(rec.id);store.set("seen",[...seen]);}  // let the deck offer it again
  else markSeen(rec.id);                                          // keep it out of the deck
  $("#confirmModal").classList.remove("on");_pendingRemove=null;
  buzz(10);toast(suggest?"Moved to Dropped — may resurface":"Moved to Dropped — hidden from swipes");
  refreshCounts();renderWatched();
}
function renderTrash(){
  const c=$("#watchedList");_openRow=null;
  if(!trash.length){c.innerHTML=`<div class="emptylist">Nothing dropped yet.<br>Anything you remove lands here first — nothing is lost.</div>`;return;}
  c.innerHTML=trash.map(m=>`
    <div class="row">
      <img src="${m.img||""}" loading="lazy" alt="" />
      <div class="rc">
        <h4>${m.title}</h4>
        <div class="sub">was in ${FROM_LABEL[m.from]||"your lists"}${m.suggest?"":" · hidden from swipes"}</div>
      </div>
      <button class="x ok" data-restore="${m.id}" title="Put it back"><span class="icw">${icSvg("rotate")}</span></button>
      <button class="x danger" data-purge="${m.id}" title="Delete forever"><span class="icw">${icSvg("x")}</span></button>
    </div>`).join("");
}

/* ---- Rank mode: tier the backlog one tap at a time, no modal round-trip ---- */
let _rankQ=[],_rankAt=0,_rankDone=0;
function openRankMode(){
  _rankQ=watched.filter(m=>m.status!=="watching"&&!m.tier);
  if(!_rankQ.length)return;
  _rankAt=0;_rankDone=0;
  const el=$("#rankMode");el.hidden=false;requestAnimationFrame(()=>el.classList.add("on"));
  _rankPaint();
}
function closeRankMode(){
  const el=$("#rankMode");el.classList.remove("on");
  setTimeout(()=>{el.hidden=true;},200);
  if(_rankDone)toast("Ranked "+_rankDone+" show"+(_rankDone>1?"s":""));
  renderWatched();refreshCounts();
}
function _rankPaint(){
  if(_rankAt>=_rankQ.length){closeRankMode();return;}
  const m=_rankQ[_rankAt];
  // full-screen art from a 230px thumb is grainy — show it instantly, then swap
  // in the 460px version (ximg on new records, URL-upgraded for old ones)
  const el=$("#rankArt");
  el.style.backgroundImage=`url('${m.img||""}')`;
  const hi=m.ximg||hiRes(m.img);
  if(hi&&hi!==m.img){
    const pre=new Image();
    pre.onload=()=>{if(_rankQ[_rankAt]===m)el.style.backgroundImage=`url('${hi}')`;};
    pre.src=hi;
  }
  $("#rankTitleTxt").textContent=m.title;
  $("#rankSub").textContent=[m.year,(m.genres||[]).join(" · ")].filter(Boolean).join("  ·  ");
  $("#rankCount").textContent=(_rankAt+1)+" of "+_rankQ.length;
  $("#rankFill").style.width=Math.round(_rankAt/_rankQ.length*100)+"%";
}
function _rankAssign(tier){
  const m=_rankQ[_rankAt];if(!m)return;
  addWatched({...m,tier,status:"watched"});
  bumpAffinity(m.genres,TIER_AFFINITY[tier]);
  _rankDone++;buzz(tier==="S"?[15,40,15]:10);
  _rankAt++;_rankPaint();
}
/* hit something you never actually finished — park it in Watching and move on */
function _rankToWatching(){
  const m=_rankQ[_rankAt];if(!m)return;
  addWatched({...m,tier:null,status:"watching"});
  buzz(10);toast("Moved to Watching");
  _rankAt++;_rankPaint();
}

document.addEventListener("click",e=>{
  if(e.target.closest&&e.target.closest("#rankCta")){openRankMode();return;}
  const rt=e.target.closest?e.target.closest("[data-rtier]"):null;
  if(rt){_rankAssign(rt.dataset.rtier);return;}
  if(e.target.closest&&e.target.closest("#rankWatching")){_rankToWatching();return;}
  if(e.target.closest&&e.target.closest("#rankSkip")){_rankAt++;_rankPaint();return;}
  if(e.target.closest&&e.target.closest("#rankClose")){closeRankMode();return;}

  // tier sub-tabs (Watched / Watching)
  const seg=e.target.closest?e.target.closest("#tierTabs .seg"):null;
  if(seg){tierTab=seg.dataset.tiertab;document.querySelectorAll("#tierTabs .seg").forEach(s=>s.classList.toggle("on",s===seg));renderWatched();return;}
  // Watching / Watched buttons inside List
  const sb=e.target.closest?e.target.closest("#listSub .subbtn"):null;
  if(sb){listTab=sb.dataset.listtab;document.querySelectorAll("#listSub .subbtn").forEach(s=>s.classList.toggle("on",s===sb));renderWatched();return;}

  const t=e.target.closest?e.target.closest("[data-sw-watched],[data-sw-unadd],[data-watch-remove],[data-rewatch],[data-open-watched],[data-finish],[data-restore],[data-purge]"):null;
  if(!t)return;const d=t.dataset;
  if(d.restore){const from=restoreTrash(+d.restore);refreshCounts();renderWatched();toast("Back in "+(FROM_LABEL[from]||"your list"));return;}
  if(d.purge){purgeTrash(+d.purge);refreshCounts();renderWatched();toast("Deleted for good");return;}
  if(d.swUnadd){const m=want.find(x=>x.id==d.swUnadd);closeOpenRow();if(m)askRemove(m,"want");}
  if(d.swWatched){const m=want.find(x=>x.id==d.swWatched);if(m){closeOpenRow();openRateFor(m,"watched");}}
  if(d.watchRemove){const m=watched.find(x=>x.id==d.watchRemove);if(m)askRemove(m,m.status==="watching"?"watching":"watched");}
  if(d.rewatch){const m=watched.find(x=>x.id==d.rewatch);if(m)openRateFor(m,m.status||"watched");}
  if(d.finish){const m=watched.find(x=>x.id==d.finish);if(m)openRateFor(m,"watched");}
  if(d.openWatched){const m=watched.find(x=>x.id==d.openWatched);if(m)openDetails({id:m.id,title:m.title,img:m.img,genres:m.genres});}
});
