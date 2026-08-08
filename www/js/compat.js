/* taku · taste compatibility
   ============================================================================
   How close two people's taste is, computed entirely on-device from a profile
   code. No server, no accounts.

   THE METRIC, and why it is shaped this way.

   Two obvious approaches both fail on real data:

   · Rank correlation over shared shows alone. Correlation is invariant to
     level, so a superfan who tiered everything S/A and a cynic who tiered the
     same shows C/D come out a *perfect* match — they agree on the ordering and
     disagree on everything that matters. It is also undefined when either side
     has no variance, which is common (people do put five things in S).

   · Genre-vector cosine alone. Affinity is a monotone accumulator, so every
     vector drifts toward the same all-positive direction and everyone scores
     90%+. It measures how much someone swipes, not what they like.

   So: agreement on shared shows, blended into a genre prior, with the shared
   shows earning weight as there are more of them. Genre taste is the fallback
   because affinity has full coverage — it learns from every swipe, not only
   from the handful of shows someone bothered to tier. */

const TIER_VALUE={S:2,A:1,B:0,C:-1,D:-2};      // centred, so B is neutral
const COMPAT_K=6;                               // shared shows needed to carry half the weight
const COMPAT_CONFIDENT=8;                       // below this, a score cannot reach the top band

/* Mean-centring is the line that stops the "everyone is 94%" collapse: it
   removes each person's baseline enthusiasm and compares only the shape of
   their preferences. */
function _centredCosine(a,b){
  const keys=[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])];
  if(!keys.length)return 0;
  const mean=v=>{const k=Object.keys(v||{});return k.length?k.reduce((s,g)=>s+v[g],0)/k.length:0;};
  const ma=mean(a),mb=mean(b);
  let dot=0,na=0,nb=0;
  keys.forEach(g=>{
    const x=((a&&a[g])||0)-ma, y=((b&&b[g])||0)-mb;
    dot+=x*y;na+=x*x;nb+=y*y;
  });
  return (na&&nb)?dot/Math.sqrt(na*nb):0;
}

/* me / them: {shows:{id:tier}, aff:{genre:weight}} */
function compatScore(me,them){
  const mine=(me&&me.shows)||{}, theirs=(them&&them.shows)||{};
  let num=0,den=0,n=0;
  const agreed=[],split=[];
  for(const id in mine){
    if(!(id in theirs))continue;
    const a=TIER_VALUE[mine[id]], b=TIER_VALUE[theirs[id]];
    if(a===undefined||b===undefined)continue;    // untiered on either side proves nothing
    const gap=Math.abs(a-b);
    const agree=1-gap/4;                          // 0..1
    // a shared S or D is a stronger signal than a shared shrug
    const w=1+Math.max(Math.abs(a),Math.abs(b))/2;
    num+=w*agree;den+=w;n++;
    (gap<=1?agreed:split).push({id:+id,mine:mine[id],theirs:theirs[id],gap});
  }
  const shared=den?num/den:0;
  const prior=(_centredCosine(me&&me.aff,them&&them.aff)+1)/2;
  // shared-show evidence earns its weight instead of being trusted immediately:
  // at 2 shows it carries 25%, at 6 half, at 12 two thirds
  const k=n/(n+COMPAT_K);
  const raw=k*shared+(1-k)*prior;
  const cap=n>=COMPAT_CONFIDENT?1:0.85;           // the 90s have to be earned
  const pct=Math.round(Math.min(raw,cap)*20)*5;   // nearest 5 — false precision helps nobody
  split.sort((x,y)=>y.gap-x.gap);
  agreed.sort((x,y)=>Math.abs(TIER_VALUE[y.mine])-Math.abs(TIER_VALUE[x.mine]));
  return {pct,n,shared,prior,agreed,split,
          basis:n>=COMPAT_CONFIDENT?"shows":"genre"};
}
function compatLabel(r){
  if(!r)return "";
  return r.n>=COMPAT_CONFIDENT
    ? r.n+" shows you've both rated"
    : (r.n?r.n+" show"+(r.n>1?"s":"")+" in common · mostly genre taste":"based on genre taste");
}
function compatTone(pct){return pct>=80?"hi":pct>=55?"mid":"lo";}

/* ---- profile code v2 ----
   v1 carried only display fields, so compatibility was uncomputable from it.
   v2 adds taste. Kept compact deliberately: ids in base36, tiers as one letter,
   affinity as a fixed-order array so the genre names never travel. */
const COMPAT_GENRES=["Action","Adventure","Comedy","Drama","Ecchi","Fantasy","Horror",
  "Mahou Shoujo","Mecha","Music","Mystery","Psychological","Romance","Sci-Fi",
  "Slice of Life","Sports","Supernatural","Thriller"];
const CODE_SHOW_CAP=60;      // bounds the code length; newest ratings win

function myTaste(){
  const shows={};
  watched.filter(m=>m.status!=="watching"&&m.tier)
    .slice(0,CODE_SHOW_CAP)
    .forEach(m=>{shows[m.id]=m.tier;});
  const aff={};
  COMPAT_GENRES.forEach(g=>{if(affinity[g]!==undefined)aff[g]=affinity[g];});
  return {shows,aff};
}
function packTaste(t){
  const sh=Object.keys(t.shows).map(id=>(+id).toString(36)+t.shows[id]).join(".");
  const af=COMPAT_GENRES.map(g=>Math.round(((t.aff[g]||0))*10)/10);
  return {sh,af};
}
function unpackTaste(d){
  const shows={},aff={};
  if(typeof d.sh==="string"&&d.sh){
    d.sh.split(".").slice(0,CODE_SHOW_CAP).forEach(chunk=>{
      const tier=chunk.slice(-1), id=parseInt(chunk.slice(0,-1),36);
      if(TIER_VALUE[tier]!==undefined&&Number.isFinite(id))shows[id]=tier;
    });
  }
  if(Array.isArray(d.af))COMPAT_GENRES.forEach((g,i)=>{
    const v=+d.af[i];
    if(Number.isFinite(v))aff[g]=Math.max(-6,Math.min(10,v));
  });
  return {shows,aff};
}

/* ---- duel sheet ---- */
let _duelFriend=null;
function openDuel(friendId){
  const f=friends.find(x=>x.id===friendId);
  if(!f)return;
  _duelFriend=f;
  const sheet=$("#duelSheet");if(!sheet)return;
  const body=$("#duelBody");
  if(!f.taste||!f.taste.shows){
    body.innerHTML=`<div class="duelempty">
      <b>${escHTML(f.name)} shared an older code.</b>
      <span>Codes only started carrying taste data recently. Ask them to send a fresh one and this fills in.</span></div>`;
    sheet.classList.add("on");return;
  }
  const me=myTaste();
  const r=compatScore(me,f.taste);
  const nameOf=id=>{const w=watched.find(m=>m.id===id);return w?w.title:"#"+id;};
  const row=(x,cls)=>`<div class="duelrow ${cls}">
      <span class="dtier t${x.mine}">${x.mine}</span>
      <span class="dname">${escHTML(nameOf(x.id))}</span>
      <span class="dtier t${x.theirs}">${x.theirs}</span>
    </div>`;
  body.innerHTML=`
    <div class="duelscore ${compatTone(r.pct)}">
      <b>${r.pct}%</b><span>match</span>
    </div>
    <div class="duelbasis">${escHTML(compatLabel(r))}</div>
    <div class="duelheads"><span>You</span><span>${escHTML(f.name)}</span></div>
    ${r.agreed.length?`<div class="duelsec">Where you agree</div>
      ${r.agreed.slice(0,4).map(x=>row(x,"ok")).join("")}`:""}
    ${r.split.length?`<div class="duelsec">Where you'd argue</div>
      ${r.split.slice(0,4).map(x=>row(x,"vs")).join("")}`:""}
    ${!r.agreed.length&&!r.split.length?`<div class="duelempty">
      <b>No shows in common yet.</b>
      <span>This score is from your genre taste alone. Rate a few of the same shows and it sharpens.</span></div>`:""}`;
  sheet.classList.add("on");
}
