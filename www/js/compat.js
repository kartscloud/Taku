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
/* Tapping a squad member opens THEIR profile. The score is deliberately not on
   it — you ask for it, and the asking is what makes the number feel earned. */
function openDuel(friendId){openFriendProfile(friendId);}
function openFriendProfile(id){
  const f=friends.find(x=>x.id===id);
  if(!f)return;
  _fpFriend=f;
  const body=$("#fpBody");if(!body)return;
  const tag=friendTag(f);
  body.innerHTML=`
    <div class="fpav" style="box-shadow:0 0 0 3px ${safeColor(f.color)},0 0 30px ${safeColor(f.color)}55">${escHTML(f.avatar)}</div>
    <div class="fpname">${escHTML(f.name)}${f.sample?' <span class="fpsample">SAMPLE</span>':''}</div>
    <div class="fphandle" style="color:${safeColor(f.color)}">@${escHTML(f.handle)}${tag?" · "+escHTML(tag):""}</div>
    <div class="fpstats">
      <div class="fpstat"><b>${(+f.power||0).toLocaleString()}</b><span>NEURAL INDEX</span></div>
      <div class="fpstat"><b>${escHTML(f.tier||"—")}</b><span>TIER</span></div>
      <div class="fpstat"><b>${escHTML(f.genre||"—")}</b><span>TOP GENRE</span></div>
    </div>
    <div class="fptitle" style="color:${safeColor(f.color)}">${escHTML(f.title||"UNTRACED")}</div>
    ${f.taste&&f.taste.shows
      ? `<button class="compatbtn" id="fpCompat"><span class="icw">${icSvg("share")}</span>Check compatibility</button>`
      : `<div class="duelempty" style="margin-top:20px"><b>Older code — no taste data.</b>
           <span>Ask ${escHTML(f.name)} for a fresh link and you can compare properly.</span></div>`}`;
  $("#fpSheet").classList.add("on");
}
let _fpFriend=null;

/* ---- sharing a code as a link ----
   A v2 code runs ~640 characters. Nobody pastes that into a chat, and a code
   that is annoying to send is a feature that never gets used. A link is the
   fix: it carries the payload in the fragment, which — unlike a query string —
   is never sent to any server, so a profile never leaves the two devices. */
const TAKU_WEB="https://kartscloud.github.io/Taku/";
function shareBase(){
  // file:// has no shareable origin, so fall back to the published address
  if(location.protocol==="http:"||location.protocol==="https:"){
    if(/^localhost|^127\.0\.0\.1|^\[::1\]/.test(location.hostname))return location.origin+location.pathname;
    return location.origin+location.pathname;
  }
  return TAKU_WEB;
}
/* base64 from btoa contains + / =, which are not safe unescaped in a URL
   fragment. base64url swaps them and drops the padding. */
function b64url(s){return s.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function unb64url(s){
  s=String(s||"").replace(/-/g,"+").replace(/_/g,"/");
  while(s.length%4)s+="=";
  return s;
}
function myShareURL(){
  const code=myCode(window._lastProf||computeProfile());
  return shareBase()+"#f="+b64url(code);
}

/* Read an inbound link once, then scrub the fragment so a refresh cannot
   re-prompt and the code does not linger in the address bar. */
function pendingFriendFromURL(){
  const m=/[#&?]f=([A-Za-z0-9\-_]+)/.exec(location.hash||"")||/[?&]f=([A-Za-z0-9\-_]+)/.exec(location.search||"");
  if(!m)return null;
  try{history.replaceState(null,"",location.pathname+location.search.replace(/[?&]f=[^&]*/,""));}catch(e){}
  return decodeCode(unb64url(m[1]));
}
function initInboundFriend(){
  const f=pendingFriendFromURL();
  if(!f)return false;
  if(friends.some(x=>x.id===f.id)){toast(f.name+" is already in your squad");return false;}
  const body=$("#inviteBody");
  if(!body)return false;
  const r=f.taste?compatScore(myTaste(),f.taste):null;
  body.innerHTML=`
    <div class="invav" style="box-shadow:0 0 0 3px ${safeColor(f.color)}">${escHTML(f.avatar)}</div>
    <div class="invname">${escHTML(f.name)}</div>
    <div class="invsub">@${escHTML(f.handle)} · ${escHTML(f.title)}</div>
    ${r?`<div class="duelscore ${compatTone(r.pct)}" style="margin-top:18px"><b>${r.pct}%</b><span>match</span></div>
        <div class="duelbasis">${escHTML(compatLabel(r))}</div>`
      :`<div class="duelbasis" style="margin-top:16px">Their code is an older version, so there's no match score yet.</div>`}`;
  $("#inviteAdd").onclick=()=>{
    if(!friends.some(x=>x.id===f.id)){friends.push(f);store.set("friends",friends);}
    $("#inviteSheet").classList.remove("on");
    toast(f.name+" joined your squad");
    if(currentView==="profile")renderProfile();
  };
  $("#inviteSheet").classList.add("on");
  return true;
}

/* ---- taku tag ----
   A short, stable handle for a person: RONIT#7K2Q. Generated once and kept, so
   it survives renames and reinstalls-from-backup.

   Honest limit worth stating in the UI: with no server there is nothing to
   check a tag against, so uniqueness cannot be guaranteed and a tag cannot be
   looked up. It is an identity LABEL — it tells two people they have the right
   person. Actually finding someone by it needs the accounts backend, where the
   usernames collection already enforces uniqueness (see firestore.rules).

   Crockford-style alphabet: no I, L, O or U, so the tag can be read aloud or
   copied off a screen without 0/O and 1/I confusion. */
const TAG_ALPHA="0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function myTag(){
  if(!profile.code){
    let c="";
    const buf=new Uint8Array(4);
    (crypto&&crypto.getRandomValues)?crypto.getRandomValues(buf)
      :buf.forEach((_,i)=>{buf[i]=(Date.now()*(i+7))&255;});
    for(let i=0;i<4;i++)c+=TAG_ALPHA[buf[i]%TAG_ALPHA.length];
    profile.code=c;store.set("profile",profile);
  }
  return (profile.handle||"you").toUpperCase()+"#"+profile.code;
}
function friendTag(f){
  return f&&f.code?String(f.handle||"friend").toUpperCase()+"#"+f.code:null;
}

/* ---- compare any two people in the squad ----
   Everyone's taste already lives on this device, so a friend-vs-friend duel
   needs no server — and it is the argument people actually want to have. */
function duelPair(aId,bId){
  const me={id:"me",name:profile.name||"You",avatar:profile.avatar||"\ud83c\udf65",
            color:(window._lastProf&&window._lastProf.arch.color)||"#8b5cf6",taste:myTaste()};
  const pick=id=>id==="me"?me:friends.find(x=>x.id===id);
  const A=pick(aId),B=pick(bId);
  if(!A||!B)return null;
  if(!A.taste||!B.taste)return {A,B,noTaste:true};
  return {A,B,r:compatScore(A.taste,B.taste)};
}
function renderDuel(aId,bId){
  const d=duelPair(aId,bId);
  const body=$("#duelBody");if(!body||!d)return;
  _duelA=aId;_duelB=bId;
  const who=x=>`<option value="${escHTML(x.id)}"${x.id===aId?" selected":""}>${escHTML(x.name)}</option>`;
  const whoB=x=>`<option value="${escHTML(x.id)}"${x.id===bId?" selected":""}>${escHTML(x.name)}</option>`;
  const meOpt={id:"me",name:"You"};
  const all=[meOpt,...friends.map(f=>({id:f.id,name:f.name}))];
  const picker=`<div class="duelpick">
      <select class="inp" id="duelA">${all.map(who).join("")}</select>
      <span class="vsmark">vs</span>
      <select class="inp" id="duelB">${all.map(whoB).join("")}</select>
    </div>`;
  if(d.noTaste){
    body.innerHTML=picker+`<div class="duelempty">
      <b>No taste data for one of them.</b>
      <span>Older codes carried only a rank. Ask for a fresh link and this fills in.</span></div>`;
    _bindDuelPickers();return;
  }
  const r=d.r;
  const nameOf=id=>{const w=watched.find(m=>m.id===id);return w?w.title:"#"+id;};
  const row=(x,cls)=>`<div class="duelrow ${cls}">
      <span class="dtier t${x.mine}">${x.mine}</span>
      <span class="dname">${escHTML(nameOf(x.id))}</span>
      <span class="dtier t${x.theirs}">${x.theirs}</span>
    </div>`;
  body.innerHTML=picker+`
    <div class="duelscore ${compatTone(r.pct)}"><b>${r.pct}%</b><span>match</span></div>
    <div class="duelbasis">${escHTML(compatLabel(r))}</div>
    <div class="duelheads"><span>${escHTML(d.A.name)}</span><span>${escHTML(d.B.name)}</span></div>
    ${r.agreed.length?`<div class="duelsec">Where they agree</div>
      ${r.agreed.slice(0,4).map(x=>row(x,"ok")).join("")}`:""}
    ${r.split.length?`<div class="duelsec">Where they'd argue</div>
      ${r.split.slice(0,4).map(x=>row(x,"vs")).join("")}`:""}
    ${!r.agreed.length&&!r.split.length?`<div class="duelempty">
      <b>No shows in common.</b>
      <span>This score comes from genre taste alone.</span></div>`:""}`;
  _bindDuelPickers();
}
let _duelA="me",_duelB=null;
function _bindDuelPickers(){
  const a=$("#duelA"),b=$("#duelB");
  if(a)a.onchange=()=>renderDuel(a.value,_duelB);
  if(b)b.onchange=()=>renderDuel(_duelA,b.value);
}

/* ---- finding someone by username or tag ----
   This is the one part of the request that cannot work on-device. A tag is a
   label, not a container: RONIT#7K2Q is six characters and a taste profile is
   hundreds. Resolving one to a person needs a directory, and a directory needs
   a server. The Firestore `usernames` collection already exists for exactly
   this (firestore.rules) — so the lookup is written now and starts working the
   moment accounts are switched on, with no further changes here. */
async function lookupPerson(q){
  const raw=String(q||"").trim();
  if(!raw)return {err:"Type a username or tag."};
  const username=raw.split("#")[0].replace(/^@/,"").toLowerCase();
  if(!/^[a-z0-9_]{3,18}$/.test(username))return {err:"That doesn't look like a username or tag."};
  if(typeof authEnabled!=="function"||!authEnabled())
    return {err:"off",need:"Searching for people needs accounts switched on — there has to be somewhere to look them up. Until then, ask them for their link."};
  if(typeof authIsMock==="function"&&authIsMock())
    return {err:"off",need:"Accounts are in test mode, so there is no directory to search yet. Paste their link instead."};
  try{
    const fb=await FirebaseAuth._init();
    const snap=await fb.firestore().collection("usernames").doc(username).get();
    if(!snap.exists)return {err:"Nobody is using that username."};
    const uid=snap.data().uid;
    const u=await fb.firestore().collection("users").doc(uid).get();
    if(!u.exists)return {err:"That account has no profile yet."};
    return {found:u.data()};
  }catch(e){return {err:"Couldn't search right now."};}
}
function initCompatUI(){
  const tag=$("#pfTag");
  if(tag)tag.onclick=async()=>{
    try{await navigator.clipboard.writeText(myTag());toast("Tag copied");}
    catch(e){toast(myTag());}
  };
  const lk=$("#doLookup");
  if(lk)lk.onclick=async()=>{
    const note=$("#lookupNote");
    note.textContent="Searching…";
    const r=await lookupPerson($("#inLookup").value);
    if(r.err){note.textContent=r.need||r.err;return;}
    note.textContent="Found "+(r.found.name||r.found.username)+" — ask them to send you their link so their taste comes with it.";
  };
  const note=$("#lookupNote");
  if(note&&(typeof authEnabled!=="function"||!authEnabled()))
    note.textContent="Needs accounts switched on — there has to be a directory to search. For now, use their link.";
}

/* ---- the compatibility reveal ----
   A synaptic link, not a progress bar. taku already frames taste as a "neural
   signature" on the profile, so a compatibility check reads as two of those
   signatures trying to connect: your node on the left, theirs on the right, a
   lattice between them, one strand lighting per five percent.

   The reason it beats a ring: a 50% match visibly FAILS to connect half its
   paths. Half a circle is an abstraction; ten dead strands is a picture of what
   the number means. */
const LINK_STRANDS=20;
/* local so this file does not depend on art.js being loaded */
function _crng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;};}
function _linkLattice(w,h){
  const r=_crng(97),cols=3,nodes=[];
  for(let c=0;c<cols;c++){
    const per=c===1?4:3,x=w*(.30+c*.20);
    for(let i=0;i<per;i++)nodes.push({x,y:h*(.22+(i+.5)*(.56/per))+(r()-.5)*h*.06,c});
  }
  const A={x:w*.13,y:h/2},B={x:w*.87,y:h/2};
  const col=c=>nodes.filter(n=>n.c===c);
  const strands=[];
  for(let i=0;i<LINK_STRANDS;i++)
    strands.push([A,col(0)[i%col(0).length],col(1)[(i*3+1)%col(1).length],
                  col(2)[(i*2+2)%col(2).length],B]);
  return {A,B,nodes,strands};
}
function _pathAt(pts,t){
  const segs=pts.length-1,s=Math.min(segs-1,Math.floor(t*segs)),lt=t*segs-s;
  const a=pts[s],b=pts[s+1];
  return {x:a.x+(b.x-a.x)*lt,y:a.y+(b.y-a.y)*lt};
}
function drawCompatLink(canvas,st){
  const W=st.w,H=st.h,dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=W*dpr;canvas.height=H*dpr;
  canvas.style.width=W+"px";canvas.style.height=H+"px";
  const c=canvas.getContext("2d");
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
  const L=st.lattice,t=st.t,lit=Math.round(LINK_STRANDS*(st.pct/100));

  L.strands.forEach((pts,i)=>{
    c.beginPath();c.moveTo(pts[0].x,pts[0].y);
    for(let k=1;k<pts.length;k++)c.lineTo(pts[k].x,pts[k].y);
    c.strokeStyle="rgba(255,255,255,.05)";c.lineWidth=1;c.stroke();
    const on=i<lit,prog=Math.max(0,Math.min(1,(t*1.35)-(i/LINK_STRANDS)*.35));
    if(!on||prog<=0)return;
    const end=_pathAt(pts,prog);
    c.beginPath();c.moveTo(pts[0].x,pts[0].y);
    for(let k=1;k<pts.length;k++)if(k/(pts.length-1)<=prog)c.lineTo(pts[k].x,pts[k].y);
    c.lineTo(end.x,end.y);
    c.strokeStyle=st.col[0];c.globalAlpha=.55;c.lineWidth=1.4;
    c.shadowColor=st.col[0];c.shadowBlur=7;c.stroke();
    c.globalAlpha=1;c.shadowBlur=0;
    if(prog<1){c.beginPath();c.arc(end.x,end.y,2.1,0,7);
      c.fillStyle="#fff";c.shadowColor=st.col[0];c.shadowBlur=10;c.fill();c.shadowBlur=0;}
  });

  L.nodes.forEach(n=>{
    const on=t>.2+(n.c*.16);
    c.beginPath();c.arc(n.x,n.y,on?2.6:1.8,0,7);
    c.fillStyle=on?st.col[0]:"rgba(190,180,230,.28)";
    if(on){c.shadowColor=st.col[0];c.shadowBlur=8;}
    c.fill();c.shadowBlur=0;
  });

  const node=(p,color,glyph,pulse)=>{
    const R=25+pulse*3;
    const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,R*2.1);
    g.addColorStop(0,color+"55");g.addColorStop(1,color+"00");
    c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,R*2.1,0,7);c.fill();
    c.beginPath();c.arc(p.x,p.y,R,0,7);
    c.fillStyle="rgba(12,10,20,.92)";c.fill();
    c.lineWidth=2;c.strokeStyle=color;c.shadowColor=color;c.shadowBlur=14;c.stroke();c.shadowBlur=0;
    c.font="20px system-ui,'Apple Color Emoji','Segoe UI Emoji'";
    c.textAlign="center";c.textBaseline="middle";
    c.fillText(glyph,p.x,p.y+1);
  };
  const pulse=Math.sin(t*Math.PI*3)*.5+.5;
  node(L.A,st.colA,st.glyphA,t<1?pulse:0);
  node(L.B,st.colB,st.glyphB,t<1?pulse:0);

  if(st.land>0&&st.land<1){          // one shockwave as it lands
    c.beginPath();c.arc(W/2,H/2,st.land*Math.max(W,H)*.55,0,7);
    c.strokeStyle=st.col[0];c.globalAlpha=(1-st.land)*.5;c.lineWidth=2.5;c.stroke();
    c.globalAlpha=1;
  }
}
const COMPAT_COLORS={hi:["#34d399","#22c55e"],mid:["#fbbf24","#f59e0b"],lo:["#fb7185","#ef4444"]};
function revealCompat(){
  const f=_fpFriend;if(!f||!f.taste)return;
  const r=compatScore(myTaste(),f.taste);
  const tone=compatTone(r.pct), col=COMPAT_COLORS[tone];
  const body=$("#fpBody");
  const nameOf=id=>{
    const w=watched.find(m=>m.id===id);
    if(w)return w.title;
    const p=passed.find(m=>m.id===id)||want.find(m=>m.id===id);
    return p?p.title:"#"+id;      // only shared shows reach here, so this is rare
  };
  const row=(x,cls)=>`<div class="duelrow ${cls}">
      <span class="dtier t${x.mine}">${x.mine}</span>
      <span class="dname">${escHTML(nameOf(x.id))}</span>
      <span class="dtier t${x.theirs}">${x.theirs}</span>
    </div>`;
  body.innerHTML=`
    <div class="reveal">
      <div class="linkwrap">
        <canvas id="compatLink"></canvas>
        <div class="linknum ${tone}"><b id="compatNum">0</b><i>%</i></div>
      </div>
      <div class="linkstrands" id="compatStrands"></div>
      <div class="revealwho">You <span>vs</span> ${escHTML(f.name)}</div>
      <div class="duelbasis" id="compatBasis" style="opacity:0">${escHTML(compatLabel(r))}</div>
      <div class="revealrest" id="compatRest" style="opacity:0">
        <div class="duelheads"><span>You</span><span>${escHTML(f.name)}</span></div>
        ${r.agreed.length?`<div class="duelsec">Where you agree</div>
          ${r.agreed.slice(0,4).map(x=>row(x,"ok")).join("")}`:""}
        ${r.split.length?`<div class="duelsec">Where you'd argue</div>
          ${r.split.slice(0,4).map(x=>row(x,"vs")).join("")}`:""}
        ${!r.agreed.length&&!r.split.length?`<div class="duelempty">
          <b>No shows in common yet.</b>
          <span>This is from genre taste alone — rate a few of the same shows and it sharpens.</span></div>`:""}
      </div>
    </div>`;
  const canvas=$("#compatLink"), num=$("#compatNum"), strandLbl=$("#compatStrands");
  const W=Math.max(260,Math.min(340,body.clientWidth||320)), H=214;
  const st={w:W,h:H,pct:r.pct,col,t:0,land:0,
    colA:(window._lastProf&&window._lastProf.arch.color)||"#8b5cf6",
    colB:safeColor(f.color),
    glyphA:profile.avatar||"?", glyphB:f.avatar||"?",
    lattice:_linkLattice(W,H)};
  const lit=Math.round(LINK_STRANDS*(r.pct/100));
  const finish=()=>{
    num.textContent=r.pct;
    strandLbl.textContent=lit+" of "+LINK_STRANDS+" links connected";
    $("#compatBasis").style.opacity="1";
    setTimeout(()=>{$("#compatRest").style.opacity="1";},180);
  };
  const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion:reduce)").matches;
  if(reduce){st.t=1;drawCompatLink(canvas,st);finish();return;}
  const DUR=1450, t0=performance.now();
  buzz(10);
  (function step(now){
    const p=Math.min(1,(now-t0)/DUR);
    st.t=1-Math.pow(1-p,2.6);                  // ease-out: fast, then settles
    num.textContent=Math.round(r.pct*st.t);
    drawCompatLink(canvas,st);
    if(p<1)return requestAnimationFrame(step);
    buzz([10,45,10]);
    const l0=performance.now();
    (function land(n){                          // shockwave after the strands land
      st.land=Math.min(1,(n-l0)/520);
      drawCompatLink(canvas,st);
      if(st.land<1)requestAnimationFrame(land);
    })(l0);
    finish();
  })(t0);
}
document.addEventListener("click",e=>{
  if(e.target.closest&&e.target.closest("#fpCompat"))revealCompat();
});
