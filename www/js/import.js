/* taku · import an existing list
   ============================================================================
   WHAT IS POSSIBLE, and why it is shaped this way.

   MyAnimeList by username does NOT work and cannot be made to. Jikan's
   /users/{name}/animelist endpoint returns 504 for every user — MAL blocked the
   scrape it depended on. MAL's official API requires OAuth with a client
   secret, which requires a server taku does not have. So MAL is imported from
   the export FILE, which needs no API, no auth and no network at all to read.

   AniList by username DOES work: MediaListCollection is public for public
   profiles and needs no token. Verified against a real 352-entry list.

   MAL entries carry a MAL id, which AniList maps with idMal_in — 50 per query,
   so a 350-show list resolves in seven requests. */

const IMPORT_BATCH=50;

/* MAL and AniList both score out of 10. Anything scored lands in a tier
   immediately; anything UNSCORED lands untiered, which is precisely the
   "ready to rank" pile — it feeds the "N shows need a tier" banner. */
function scoreToTier(s){
  const n=+s||0;
  if(n>=9)return "S";
  if(n>=8)return "A";
  if(n>=7)return "B";
  if(n>=5)return "C";
  if(n>=1)return "D";
  return null;                       // unscored → rank it yourself
}
/* Both services' statuses collapse onto taku's three destinations. On-hold
   counts as watching: it is unfinished, not abandoned. */
const STATUS_MAP={
  COMPLETED:"watched", CURRENT:"watching", PAUSED:"watching",
  DROPPED:"dropped",   PLANNING:"want",
  "Completed":"watched", "Watching":"watching", "On-Hold":"watching",
  "Dropped":"dropped",  "Plan to Watch":"want"
};

/* ---- AniList: one query, no auth ---- */
async function fetchAniListUser(username){
  const q=`query($u:String){MediaListCollection(userName:$u,type:ANIME){lists{status entries{
    status score(format:POINT_10) media{${MEDIA_FIELDS} idMal}}}}}`;
  const data=await gql(q,{u:String(username||"").trim()});
  const lists=(data.MediaListCollection&&data.MediaListCollection.lists)||[];
  const out=[];
  lists.forEach(l=>(l.entries||[]).forEach(e=>{
    if(!e.media)return;
    out.push({media:trimMedia(e.media), score:e.score, status:STATUS_MAP[e.status]||"watched"});
  }));
  return out;
}

/* ---- MAL: the export file ---- */
async function readMalFile(file){
  let text;
  const gz=/\.gz$/i.test(file.name)||file.type==="application/gzip";
  if(gz){
    if(typeof DecompressionStream!=="function")
      throw new Error("This browser can't unzip that file — unzip it first and pick the .xml.");
    const ds=new DecompressionStream("gzip");
    text=await new Response(file.stream().pipeThrough(ds)).text();
  }else{
    text=await file.text();
  }
  const doc=new DOMParser().parseFromString(text,"application/xml");
  if(doc.querySelector("parsererror"))throw new Error("That file isn't readable as XML.");
  const nodes=[...doc.querySelectorAll("anime")];
  if(!nodes.length)throw new Error("No anime found in that file — is it a MyAnimeList export?");
  const pick=(el,tag)=>{const n=el.querySelector(tag);return n?n.textContent.trim():"";};
  return nodes.map(a=>({
    idMal:+pick(a,"series_animedb_id")||0,
    title:pick(a,"series_title"),
    score:+pick(a,"my_score")||0,
    status:STATUS_MAP[pick(a,"my_status")]||"watched"
  })).filter(x=>x.idMal);
}
/* MAL gives ids, not artwork or genres — AniList fills those in, 50 at a time. */
async function resolveMalIds(rows,onProgress){
  const byMal=new Map(rows.map(r=>[r.idMal,r]));
  const ids=[...byMal.keys()];
  const out=[];
  for(let i=0;i<ids.length;i+=IMPORT_BATCH){
    const chunk=ids.slice(i,i+IMPORT_BATCH);
    const q=`query($ids:[Int]){Page(perPage:${IMPORT_BATCH}){media(idMal_in:$ids,type:ANIME){${MEDIA_FIELDS} idMal}}}`;
    try{
      const d=await gql(q,{ids:chunk});
      (d.Page.media||[]).forEach(m=>{
        const row=byMal.get(m.idMal);
        if(row)out.push({media:trimMedia(m),score:row.score,status:row.status});
      });
    }catch(e){console.warn("taku: import batch failed",e);}
    if(onProgress)onProgress(Math.min(ids.length,i+IMPORT_BATCH),ids.length);
  }
  return out;
}

/* ---- applying an import ----
   Never overwrites: a show already in your lists is left exactly as it is, so
   re-importing is safe and your own ratings always win over the imported ones. */
function applyImport(entries){
  const haveW=new Set(watched.map(m=>m.id));
  const haveWant=new Set(want.map(m=>m.id));
  const haveTrash=new Set(trash.map(m=>m.id));
  const res={watched:0,watching:0,want:0,dropped:0,skipped:0,tiered:0,toRank:0};
  const genreHits={};
  entries.forEach(e=>{
    const m=e.media;if(!m||!m.id)return;
    if(haveW.has(m.id)||haveWant.has(m.id)||haveTrash.has(m.id)){res.skipped++;return;}
    const rec=slim(m);
    const dest=e.status;
    if(dest==="want"){ want.unshift(rec); haveWant.add(m.id); res.want++; }
    else if(dest==="dropped"){
      trash.unshift({...rec,from:"watched",suggest:false,trashedAt:Date.now()});
      haveTrash.add(m.id); res.dropped++;
    }else{
      const tier=dest==="watching"?null:scoreToTier(e.score);
      watched.push({...rec,tier,status:dest==="watching"?"watching":"watched"});
      haveW.add(m.id);
      if(dest==="watching")res.watching++;else res.watched++;
      if(tier)res.tiered++;else if(dest!=="watching")res.toRank++;
    }
    seen.add(m.id);
    /* Teach the feed, but gently: a 300-show import at full swipe weight would
       peg every genre at the ceiling and flatten recommendations entirely. */
    if(dest!=="dropped")(m.genres||[]).forEach(g=>{genreHits[g]=(genreHits[g]||0)+(TIER_AFFINITY[scoreToTier(e.score)]||0.5);});
  });
  const keys=Object.keys(genreHits);
  if(keys.length){
    const scale=1/Math.max(1,Math.sqrt(entries.length));
    keys.forEach(g=>{affinity[g]=Math.max(-6,Math.min(10,(affinity[g]||0)+genreHits[g]*scale));});
    store.set("affinity",affinity);
  }
  sortWatched();
  store.set("watched",watched);store.set("want",want);store.set("trash",trash);
  store.set("seen",[...seen]);
  return res;
}

/* ---- sheet ---- */
let _importStaged=null;
function _impMsg(html,cls){
  const el=$("#impStatus");if(!el)return;
  el.className="impstatus"+(cls?" "+cls:"");el.innerHTML=html;
}
function _impBusy(on,label){
  const b=$("#impRun");if(b){b.disabled=on;b.textContent=on?(label||"Working…"):"Import";}
}
function openImport(){
  const sh=$("#importSheet");if(!sh)return;
  _importStaged=null;
  _impMsg("");
  $("#impConfirm").hidden=true;
  sh.classList.add("on");
}
function _stage(entries,sourceLabel){
  if(!entries.length){_impMsg("Nothing found in that list.","warn");return;}
  const haveAny=new Set([...watched.map(m=>m.id),...want.map(m=>m.id),...trash.map(m=>m.id)]);
  const fresh=entries.filter(e=>e.media&&!haveAny.has(e.media.id));
  const dup=entries.length-fresh.length;
  const n=k=>fresh.filter(e=>e.status===k).length;
  const toRank=fresh.filter(e=>e.status==="watched"&&!scoreToTier(e.score)).length;
  _importStaged=entries;
  $("#impConfirm").hidden=false;
  $("#impSummary").innerHTML=
    `<b>${fresh.length}</b> new from ${escHTML(sourceLabel)}`+
    (dup?` · ${dup} already in your lists, left untouched`:"")+
    `<div class="impbreak">
       <span>${n("watched")} watched</span><span>${n("watching")} watching</span>
       <span>${n("want")} want</span><span>${n("dropped")} dropped</span>
     </div>`+
    (toRank?`<div class="impnote"><b>${toRank}</b> came across unscored — they land in Watched with no tier, ready to rank.</div>`:"");
  _impMsg("");
}
function initImport(){
  if(!$("#importSheet"))return;
  $("#impOpen")&&($("#impOpen").onclick=()=>{$("#settingsSheet").classList.remove("on");openImport();});
  /* Two more ways in, because one row inside a settings sheet is not findable:
     the Tiers header — where you go looking for "my list" — and onboarding, the
     moment someone with an existing list most wants it. */
  $("#tiersImport")&&($("#tiersImport").onclick=()=>openImport());
  $("#obImport")&&($("#obImport").onclick=()=>openImport());
  $("#impClose").onclick=()=>$("#importSheet").classList.remove("on");
  document.querySelectorAll("#impTabs .seg").forEach(b=>b.onclick=()=>{
    const src=b.dataset.imp;
    document.querySelectorAll("#impTabs .seg").forEach(x=>x.classList.toggle("on",x===b));
    $("#impAniList").hidden=src!=="anilist";
    $("#impMal").hidden=src!=="mal";
    $("#impConfirm").hidden=true;_impMsg("");buzz(6);
  });
  $("#impRun").onclick=async()=>{
    const src=(document.querySelector("#impTabs .seg.on")||{dataset:{}}).dataset.imp;
    try{
      if(src==="anilist"){
        const u=($("#impUser").value||"").trim();
        if(!u){_impMsg("Type your AniList username.","warn");return;}
        _impBusy(true,"Fetching…");
        const rows=await fetchAniListUser(u);
        _impBusy(false);
        _stage(rows,"AniList · "+u);
      }else{
        const f=$("#impFile").files&&$("#impFile").files[0];
        if(!f){_impMsg("Choose your export file first.","warn");return;}
        _impBusy(true,"Reading…");
        const rows=await readMalFile(f);
        _impMsg(`Read <b>${rows.length}</b> entries — matching them against AniList…`);
        const resolved=await resolveMalIds(rows,(done,total)=>
          _impMsg(`Matching ${done} of ${total}…`));
        _impBusy(false);
        const lost=rows.length-resolved.length;
        _stage(resolved,"MyAnimeList"+(lost?` (${lost} had no AniList match)`:""));
      }
    }catch(e){
      _impBusy(false);
      _impMsg(escHTML(e.message||"That didn't work."),"warn");
    }
  };
  $("#impPick").onclick=()=>$("#impFile").click();
  $("#impFile").addEventListener("change",()=>{
    const f=$("#impFile").files&&$("#impFile").files[0];
    $("#impFileName").textContent=f?f.name:"No file chosen";
    $("#impConfirm").hidden=true;
  });
  $("#impApply").onclick=()=>{
    if(!_importStaged)return;
    const r=applyImport(_importStaged);
    _importStaged=null;
    $("#impConfirm").hidden=true;
    $("#importSheet").classList.remove("on");
    refreshCounts();
    if(currentView==="watched")renderWatched();
    if(currentView==="profile")renderProfile();
    applyGenreFilter();                  // the deck must drop anything just imported
    buzz([10,40,10]);
    toast(r.toRank?`Imported — ${r.toRank} ready to rank`:`Imported ${r.watched+r.watching+r.want} shows`);
  };
  $("#impCancel").onclick=()=>{_importStaged=null;$("#impConfirm").hidden=true;};
}

/* ---- the one-time pointer ----
   Shown once, on the view where importing makes sense, and only to someone who
   plausibly has a list elsewhere. Dismissing it — by either button, by opening
   import, or by tapping away — retires it permanently. A hint that reappears is
   an annoyance, not a hint. */
function importTipDone(){store.set("importTipSeen",true);const t=$("#importTip");if(t)t.hidden=true;}
function maybeShowImportTip(){
  const t=$("#importTip");
  if(!t||store.get("importTipSeen",false))return;
  if(currentView!=="watched")return;
  t.hidden=false;
  if(!t._bound){
    t._bound=true;
    $("#tipDismiss").onclick=()=>{importTipDone();buzz(6);};
    $("#tipImport").onclick=()=>{importTipDone();openImport();};
    /* tapping anywhere outside also counts as "seen" */
    setTimeout(()=>document.addEventListener("click",function away(e){
      if(!t.hidden&&!e.target.closest("#importTip")&&!e.target.closest("#tiersImport")){
        importTipDone();document.removeEventListener("click",away);
      }
    }),0);
  }
}
