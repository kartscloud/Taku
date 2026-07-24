/* taku · full anime info page — synopsis, characters (+MBTI), tags, "more like this" */
let _detailStack=[];

function detailAction(m,action){
  const inDeck=queues[deckMode].some(x=>x.id===m.id);
  if(inDeck){const top=topCard();if(top&&+top.dataset.id===m.id){doAction(action);return;}decide(m.id,action);renderDeck();return;}
  markSeen(m.id);
  if(action==="want"){addWant(slim(m));bumpAffinity(m.genres,1.5);toast("Added to Want");}
  if(action==="nope"){bumpAffinity(m.genres,-1);}
  if(action==="watch")openRate(m);
  refreshCounts();
}

function closeDetail(){$("#detailModal").classList.remove("on");_detailStack=[];}

/* mouse drag-to-scroll for horizontal rails (touch/pen keep native scroll) */
function enableDragScroll(el){
  if(!el)return;
  let down=false,sx=0,sl=0,moved=false,pid=null;
  el.addEventListener("pointerdown",e=>{
    if(e.pointerType!=="mouse")return;
    down=true;sx=e.clientX;sl=el.scrollLeft;moved=false;pid=e.pointerId;
    // NOTE: do NOT capture the pointer here — capturing on pointerdown makes the
    // browser dispatch the ensuing `click` to the rail instead of the card, which
    // eats every plain click on a cover. Capture lazily once a real drag begins.
  });
  el.addEventListener("pointermove",e=>{
    if(!down)return;const dx=e.clientX-sx;
    if(!moved&&Math.abs(dx)>4){moved=true;el.classList.add("dragging");try{el.setPointerCapture(pid);}catch(_){}}
    if(moved)el.scrollLeft=sl-dx;
  });
  const end=()=>{if(!down)return;down=false;el.classList.remove("dragging");if(moved&&pid!=null){try{el.releasePointerCapture(pid);}catch(_){}}if(moved){el._sc=true;setTimeout(()=>{el._sc=false;},60);}};
  el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);
  el.addEventListener("click",e=>{if(el._sc){e.stopPropagation();e.preventDefault();}},true); // swallow the click that ends a drag
}

function openDetails(seed,push){
  if(push!==false)_detailStack.push(seed);
  renderDetail(seed,!!seed.characters); // full immediately if seed already carries detail (back-nav), else skeleton
  $("#detailModal").classList.add("on");
  $("#detailSheet").scrollTop=0;
  fetchDetail(seed.id).then(d=>{
    if(_detailStack[_detailStack.length-1]!==seed)return; // user navigated away
    _detailStack[_detailStack.length-1]=d;                // promote full detail so recs/tags are reachable
    renderDetail(d,true);
  }).catch(()=>{
    const el=$("#detailReel");if(el)el.innerHTML='<div class="dnote">Couldn\'t load extra details — check your connection.</div>';
  });
}

function _chip(x){return `<span class="chip">${x}</span>`;}

function renderDetail(m,full){
  const scoreCol=m.averageScore?(m.averageScore>=75?"#22c55e":m.averageScore>=60?"#f59e0b":"#ef4444"):null;
  const meta=[m.format,m.season?`${m.season} ${m.seasonYear||""}`.trim():m.seasonYear,m.episodes?m.episodes+" eps":null,m.studio,m.status==="RELEASING"?"AIRING":null]
    .filter(Boolean).map(_chip).join("")+(m.genres||[]).map(_chip).join("");
  const back=_detailStack.length>1?`<button class="dnav dback" id="dBack">${icSvg("arrowL")}</button>`:"";
  const banner=m.bannerImage?`<div class="dbanner" style="background-image:url('${m.bannerImage}')"></div>`:`<div class="dbanner nobanner"></div>`;

  // sections that need the full fetch — skeleton until then
  let reel;
  if(!full){
    reel=`<div id="detailReel">
      <div class="dsection"><h4>Characters</h4><div class="charscroll">${'<div class="charcard sk"></div>'.repeat(4)}</div></div>
      <div class="dsection"><h4>More like this</h4><div class="recscroll">${'<div class="reccard sk"></div>'.repeat(4)}</div></div>
    </div>`;
  }else{
    const chars=(m.characters||[]).filter(c=>c.role!=="BACKGROUND").filter(c=>c.img&&!/\/default\.\w+$/i.test(c.img)).slice(0,10).map(c=>{
      const mb=mbtiFor(c.name,c.desc);
      const sub=[c.role==="MAIN"?"Main":"Supporting",c.age&&("Age "+c.age)].filter(Boolean).join(" · ");
      const bio=(c.desc||"").slice(0,1400);
      const long=bio.length>170;
      return `<div class="charcard">
        <div class="charimg" style="background-image:url('${c.img||""}')">${mb?`<span class="mbti">${mb}</span>`:""}</div>
        <div class="charname">${c.name}</div>
        <div class="charsub">${sub}</div>
        ${bio?`<div class="charbio">${bio}</div>${long?`<div class="charmore">tap to read more</div>`:""}`:""}
      </div>`;
    }).join("");
    const recs=(m.recs||[]).slice(0,12).map(r=>`
      <div class="reccard" data-rec="${r.id}">
        <div class="recposter" style="background-image:url('${(r.coverImage&&r.coverImage.large)||""}')">
          ${r.averageScore?`<span class="recscore">${(r.averageScore/10).toFixed(1)}</span>`:""}
          <button class="recadd" data-recwant="${r.id}" title="Want to watch">${icSvg("heart")}</button>
        </div>
        <div class="rectitle">${mTitle(r)}</div>
      </div>`).join("");
    const tags=(m.tags||[]).map(_chip).join("");
    reel=`<div id="detailReel">
      ${tags?`<div class="dsection tight"><h4>Tags</h4><div class="dmeta">${tags}</div></div>`:""}
      <div class="dsection"><h4>Characters ${chars?"":'<span class="dsmall">— none listed</span>'}</h4>
        <div class="charscroll">${chars||""}</div>
        <div class="dnote mbti-note">MBTI is community-sourced — shown for well-known characters, blank otherwise.</div>
      </div>
      <div class="dsection"><h4>More like this ${recs?"":'<span class="dsmall">— none listed</span>'}</h4><div class="recscroll">${recs||""}</div></div>
    </div>`;
  }

  // contextual actions: what you can do depends on where this anime already sits
  const ranked=watched.find(x=>x.id===m.id);
  const inWant=want.some(x=>x.id===m.id);
  let actionsHtml;
  if(ranked){
    actionsHtml=`
      <div class="dstate"><span class="dstier" style="background:${TIER_COLOR[ranked.tier]||"var(--line)"}">${ranked.tier||"–"}</span>Ranked in your tiers</div>
      <div class="dactions">
        <button class="dact rerank" data-da="rerank"><span class="icw">${icSvg("rotate")}</span>Re-rank</button>
        <button class="dact remove" data-da="rmwatched"><span class="icw">${icSvg("x")}</span>Remove</button>
      </div>`;
  }else if(inWant){
    actionsHtml=`
      <div class="dstate want"><span class="icw">${icSvg("heart",true)}</span>Saved in your Want list</div>
      <div class="dactions">
        <button class="dact watch" data-da="watch"><span class="icw">${icSvg("star",true)}</span>Seen it — rank</button>
        <button class="dact remove" data-da="rmwant"><span class="icw">${icSvg("x")}</span>Remove</button>
      </div>`;
  }else{
    actionsHtml=`
      <div class="dactions">
        <button class="dact nope" data-da="nope"><span class="icw">${icSvg("x")}</span>Pass</button>
        <button class="dact want" data-da="want"><span class="icw">${icSvg("heart",true)}</span>Want</button>
        <button class="dact watch" data-da="watch"><span class="icw">${icSvg("star",true)}</span>Seen</button>
      </div>`;
  }

  $("#detailSheet").innerHTML=`
    <div class="dhead">${banner}<div class="dscrim"></div>${back}<button class="dnav dclose" id="dClose">${icSvg("x")}</button></div>
    <div class="dbody">
      <div class="dtitle">${mTitle(m)} ${scoreCol?`<span class="dscore" style="color:${scoreCol}">${icSvg("star",true)} ${(m.averageScore/10).toFixed(1)}</span>`:""}</div>
      <div class="dmeta">${meta}</div>
      ${m.next?`<div class="dairing"><span class="icw">${icSvg("flame")}</span>${airingText(m.next,m.status)}</div>`:""}
      ${m.description?`<div class="ddesc">${m.description}</div>`:""}
      ${actionsHtml}
      ${reel}
    </div>`;

  $("#dClose").onclick=closeDetail;
  enableDragScroll($("#detailSheet").querySelector(".charscroll"));
  enableDragScroll($("#detailSheet").querySelector(".recscroll"));
  const b=$("#dBack");if(b)b.onclick=()=>{_detailStack.pop();const prev=_detailStack[_detailStack.length-1];openDetails(prev,false);};
  $("#detailSheet").querySelectorAll(".dact").forEach(btn=>btn.onclick=()=>{
    const a=btn.dataset.da;
    if(a==="nope"||a==="want"||a==="watch"){closeDetail();detailAction(m,a);return;}
    if(a==="rerank"){const w=watched.find(x=>x.id===m.id);if(w){closeDetail();pendingWatch={rec:w,genres:w.genres||[]};$("#rateTitle").textContent=mTitle(m);$("#rateModal").classList.add("on");}return;}
    if(a==="rmwatched"){removeWatched(m.id);refreshCounts();closeDetail();toast("Removed from your tiers");return;}
    if(a==="rmwant"){removeWant(m.id);refreshCounts();closeDetail();toast("Removed from Want");return;}
  });
}

/* recommendation navigation + quick-add (delegated) */
document.addEventListener("click",e=>{
  if(!e.target.closest)return;
  const add=e.target.closest("[data-recwant]");
  if(add){
    e.stopPropagation();
    const cur=_detailStack[_detailStack.length-1];
    const r=(cur&&cur.recs||[]).find(x=>x.id==add.dataset.recwant);
    if(r){addWant(slim(r));bumpAffinity(r.genres,1.5);markSeen(r.id);add.classList.add("done");toast("Added to Want");refreshCounts();}
    return;
  }
  const cc=e.target.closest(".charcard");
  if(cc&&!cc.classList.contains("sk")&&$("#detailModal").classList.contains("on")){cc.classList.toggle("expanded");return;}
  const rec=e.target.closest("[data-rec]");
  if(rec&&$("#detailModal").classList.contains("on")){
    const cur=_detailStack[_detailStack.length-1];
    const r=(cur&&cur.recs||[]).find(x=>x.id==rec.dataset.rec);
    if(r)openDetails(r);
  }
});
