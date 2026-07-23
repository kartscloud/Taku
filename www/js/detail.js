/* naku · full anime info page — synopsis, characters (+MBTI), tags, "more like this" */
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
    const chars=(m.characters||[]).filter(c=>c.role!=="BACKGROUND").slice(0,10).map(c=>{
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

  $("#detailSheet").innerHTML=`
    <div class="dhead">${banner}<div class="dscrim"></div>${back}<button class="dnav dclose" id="dClose">${icSvg("x")}</button></div>
    <div class="dbody">
      <div class="dtitle">${mTitle(m)} ${scoreCol?`<span class="dscore" style="color:${scoreCol}">${icSvg("star",true)} ${(m.averageScore/10).toFixed(1)}</span>`:""}</div>
      <div class="dmeta">${meta}</div>
      ${m.description?`<div class="ddesc">${m.description}</div>`:""}
      <div class="dactions">
        <button class="dact nope" data-d="nope"><span class="icw">${icSvg("x")}</span>Pass</button>
        <button class="dact want" data-d="want"><span class="icw">${icSvg("heart",true)}</span>Want</button>
        <button class="dact watch" data-d="watch"><span class="icw">${icSvg("star",true)}</span>Seen</button>
      </div>
      ${reel}
    </div>`;

  $("#dClose").onclick=closeDetail;
  const b=$("#dBack");if(b)b.onclick=()=>{_detailStack.pop();const prev=_detailStack[_detailStack.length-1];openDetails(prev,false);};
  $("#detailSheet").querySelectorAll(".dact").forEach(btn=>btn.onclick=()=>{closeDetail();detailAction(m,btn.dataset.d);});
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
