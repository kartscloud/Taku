/* taku · generated art  ——  banners and crests, drawn in code
   ============================================================================
   WHY THIS IS DRAWN AND NOT SHIPPED AS IMAGES

   Anime characters are copyrighted. Cover art from AniList is licensed to
   AniList for catalog use, not to us as decoration. A preset gallery built from
   either is straightforward infringement and an App Store rejection under 5.2.

   So everything here is generated from primitives: gradients, geometry, noise.
   It borrows the visual GRAMMAR of the medium — the dusk rooftop, the impact
   frame's speed lines, manga screentone, drifting petals — none of which any
   studio owns. Nothing traced, nothing sampled, no character depicted.

   Practical benefits that fall out of that choice: a banner costs 6 bytes of
   storage (its id, regenerated on demand) instead of ~40KB of data URI, it is
   sharp at any size on any screen, and it themes with the app. */

/* deterministic PRNG so a banner looks identical every time it is painted —
   Math.random would reshuffle the petals on every render */
function _rng(seed){
  let a=seed>>>0;
  return function(){
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function _grad(ctx,w,h,stops,vertical){
  const g=vertical===false?ctx.createLinearGradient(0,0,w,0):ctx.createLinearGradient(0,0,0,h);
  stops.forEach(s=>g.addColorStop(s[0],s[1]));
  return g;
}

/* Each recipe paints into a 2D context sized w×h. Kept deliberately small and
   readable — these are compositions, not engines. */
const BANNER_ART={

  dusk:{name:"Rooftop dusk",tone:"warm",paint(ctx,w,h){
    ctx.fillStyle=_grad(ctx,w,h,[[0,"#2b1b4d"],[.45,"#8e3b6b"],[.78,"#e2705a"],[1,"#f7b267"]]);
    ctx.fillRect(0,0,w,h);
    // low sun
    const sx=w*.74, sy=h*.72;
    const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,h*.5);
    sg.addColorStop(0,"rgba(255,236,180,.95)");sg.addColorStop(1,"rgba(255,200,120,0)");
    ctx.fillStyle=sg;ctx.fillRect(0,0,w,h);
    // cloud bands
    const r=_rng(7);
    ctx.globalAlpha=.22;ctx.fillStyle="#1d1233";
    for(let i=0;i<7;i++){
      const y=h*(.2+r()*.45), bh=h*(.012+r()*.03), x=-w*.1+r()*w*.5, bw=w*(.35+r()*.6);
      ctx.beginPath();ctx.ellipse(x+bw/2,y,bw/2,bh,0,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // rooftop + railing silhouette
    ctx.fillStyle="#160f28";
    ctx.fillRect(0,h*.82,w,h*.18);
    ctx.fillRect(0,h*.80,w,h*.022);
    for(let x=w*.04;x<w;x+=w*.052){ctx.fillRect(x,h*.68,Math.max(1,w*.005),h*.14);}
    ctx.fillRect(0,h*.675,w,Math.max(1,h*.012));
  }},

  impact:{name:"Impact frame",tone:"loud",paint(ctx,w,h){
    ctx.fillStyle="#12101c";ctx.fillRect(0,0,w,h);
    const cx=w*.32, cy=h*.5, r=_rng(3);
    // radial speed lines, the shonen "something just happened" frame
    for(let i=0;i<190;i++){
      const a=r()*Math.PI*2, inner=h*(.18+r()*.5), outer=Math.max(w,h)*1.2;
      const wd=.4+r()*2.6;
      ctx.strokeStyle=i%9===0?"rgba(236,72,153,.5)":"rgba(255,255,255,"+(.05+r()*.3)+")";
      ctx.lineWidth=wd;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(a)*inner,cy+Math.sin(a)*inner);
      ctx.lineTo(cx+Math.cos(a)*outer,cy+Math.sin(a)*outer);
      ctx.stroke();
    }
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,h*.42);
    g.addColorStop(0,"rgba(255,255,255,.9)");g.addColorStop(.35,"rgba(167,139,250,.35)");
    g.addColorStop(1,"rgba(18,16,28,0)");
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }},

  screentone:{name:"Screentone",tone:"ink",paint(ctx,w,h){
    ctx.fillStyle="#f4f1ee";ctx.fillRect(0,0,w,h);
    // halftone dots thinning left→right, the way a manga gradient is printed
    const step=Math.max(5,h*.045);
    ctx.fillStyle="#14121a";
    for(let y=step/2;y<h;y+=step){
      for(let x=step/2;x<w;x+=step){
        const t=1-(x/w);
        const rad=step*.46*Math.max(0,t*1.25-.06);
        if(rad<=.2)continue;
        ctx.beginPath();ctx.arc(x,y+((Math.round(x/step)%2)?step/2:0),rad,0,Math.PI*2);ctx.fill();
      }
    }
    // one ink slash across it
    ctx.fillStyle="#14121a";
    ctx.beginPath();
    ctx.moveTo(w*.52,0);ctx.lineTo(w*.66,0);ctx.lineTo(w*.42,h);ctx.lineTo(w*.28,h);
    ctx.closePath();ctx.fill();
  }},

  sakura:{name:"Sakura drift",tone:"soft",paint(ctx,w,h){
    ctx.fillStyle=_grad(ctx,w,h,[[0,"#ffd9ec"],[.55,"#f3b6d8"],[1,"#c98bc4"]]);
    ctx.fillRect(0,0,w,h);
    const r=_rng(11);
    for(let i=0;i<46;i++){
      const x=r()*w, y=r()*h, s=h*(.018+r()*.05), rot=r()*Math.PI*2;
      ctx.save();ctx.translate(x,y);ctx.rotate(rot);
      ctx.globalAlpha=.25+r()*.6;
      ctx.fillStyle=i%4===0?"#fff":"#ffeef7";
      // a petal: two arcs meeting at a notch
      ctx.beginPath();
      ctx.moveTo(0,-s);
      ctx.bezierCurveTo(s*.9,-s*.5,s*.7,s*.7,0,s);
      ctx.bezierCurveTo(-s*.7,s*.7,-s*.9,-s*.5,0,-s);
      ctx.closePath();ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }},

  torii:{name:"Torii",tone:"warm",paint(ctx,w,h){
    ctx.fillStyle=_grad(ctx,w,h,[[0,"#f6c9a0"],[.5,"#e88f6f"],[1,"#7d3b63"]]);
    ctx.fillRect(0,0,w,h);
    const sx=w*.5, sy=h*.58, sr=h*.30;
    ctx.fillStyle="rgba(255,247,220,.85)";
    ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
    // gate, drawn as plain rectangles — a shape, not anyone's artwork
    ctx.fillStyle="#2a1024";
    const pw=Math.max(3,w*.021), gx1=w*.34, gx2=w*.66, top=h*.20;
    ctx.fillRect(gx1-pw/2,top,pw,h*.72);
    ctx.fillRect(gx2-pw/2,top,pw,h*.72);
    ctx.fillRect(w*.26,top,w*.48,h*.055);                 // kasagi
    ctx.fillRect(w*.245,top-h*.045,w*.51,h*.045);         // upper lintel
    ctx.fillRect(w*.30,top+h*.15,w*.40,h*.035);           // nuki
    ctx.fillStyle="rgba(42,16,36,.9)";
    ctx.fillRect(0,h*.88,w,h*.12);
  }},

  train:{name:"Night line",tone:"cool",paint(ctx,w,h){
    ctx.fillStyle=_grad(ctx,w,h,[[0,"#080b1e"],[.6,"#141a3d"],[1,"#25325e"]]);
    ctx.fillRect(0,0,w,h);
    const r=_rng(29);
    ctx.fillStyle="#fff";
    for(let i=0;i<120;i++){
      const x=r()*w,y=r()*h*.62,s=r()*1.5+.3;
      ctx.globalAlpha=.15+r()*.6;
      ctx.fillRect(x,y,s,s);
    }
    ctx.globalAlpha=1;
    // carriage windows streaking past
    const wy=h*.52, wh=h*.16;
    for(let i=0;i<9;i++){
      const x=w*.04+i*w*.108, ww=w*.072;
      const g=ctx.createLinearGradient(x,0,x+ww,0);
      g.addColorStop(0,"rgba(255,214,140,0)");g.addColorStop(.5,"rgba(255,214,140,.75)");
      g.addColorStop(1,"rgba(255,214,140,0)");
      ctx.fillStyle=g;ctx.fillRect(x,wy,ww,wh);
    }
    ctx.fillStyle="rgba(4,6,16,.95)";ctx.fillRect(0,h*.78,w,h*.22);
    ctx.fillStyle="rgba(255,214,140,.10)";ctx.fillRect(0,h*.78,w,h*.03);
  }},

  crt:{name:"OVA tape",tone:"retro",paint(ctx,w,h){
    ctx.fillStyle=_grad(ctx,w,h,[[0,"#1b0f2b"],[.5,"#3a1750"],[1,"#12203f"]]);
    ctx.fillRect(0,0,w,h);
    const r=_rng(41);
    // chromatic offset bands, the VHS tracking error
    for(let i=0;i<5;i++){
      const y=r()*h, bh=h*(.02+r()*.06);
      ctx.globalAlpha=.4;
      ctx.fillStyle=i%2?"#ff4d6d":"#4dd6ff";
      ctx.fillRect(r()*w*.2-w*.05,y,w*1.1,bh);
    }
    ctx.globalAlpha=1;
    // scanlines
    ctx.fillStyle="rgba(0,0,0,.28)";
    for(let y=0;y<h;y+=3)ctx.fillRect(0,y,w,1.4);
    const vg=ctx.createRadialGradient(w/2,h/2,h*.2,w/2,h/2,w*.7);
    vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.55)");
    ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);
  }},

  horizon:{name:"Summer horizon",tone:"cool",paint(ctx,w,h){
    ctx.fillStyle=_grad(ctx,w,h,[[0,"#bff0ff"],[.42,"#7fd4f0"],[.44,"#1a7fae"],[1,"#08405f"]]);
    ctx.fillRect(0,0,w,h);
    const sx=w*.5,sy=h*.30,sr=h*.16;
    ctx.fillStyle="rgba(255,255,255,.92)";
    ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
    // glitter path on the water
    const r=_rng(17);
    ctx.fillStyle="rgba(255,255,255,.75)";
    for(let i=0;i<70;i++){
      const t=r(), y=h*.45+t*h*.55;
      const spread=w*.04+t*w*.20;
      const x=sx-spread/2+r()*spread;
      ctx.globalAlpha=(1-t)*.8;
      ctx.fillRect(x,y,w*(.006+r()*.03),Math.max(1,h*.008));
    }
    ctx.globalAlpha=1;
  }},

  neon:{name:"Neon block",tone:"loud",paint(ctx,w,h){
    ctx.fillStyle=_grad(ctx,w,h,[[0,"#07040f"],[1,"#1a0b2e"]]);
    ctx.fillRect(0,0,w,h);
    const r=_rng(23), cols=["#ff3d7f","#00e5ff","#b06bff","#ffd166"];
    for(let i=0;i<26;i++){
      const x=r()*w, ww=w*(.004+r()*.012), hh=h*(.14+r()*.6), y=r()*h*.5;
      const c=cols[(r()*cols.length)|0];
      ctx.globalAlpha=.55+r()*.45;
      ctx.shadowColor=c;ctx.shadowBlur=h*.09;
      ctx.fillStyle=c;ctx.fillRect(x,y,ww,hh);
    }
    ctx.shadowBlur=0;ctx.globalAlpha=1;
    // wet-street reflection
    const g=ctx.createLinearGradient(0,h*.66,0,h);
    g.addColorStop(0,"rgba(255,255,255,.10)");g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=g;ctx.fillRect(0,h*.66,w,h*.34);
  }},

  grid:{name:"Mecha grid",tone:"cool",paint(ctx,w,h){
    ctx.fillStyle=_grad(ctx,w,h,[[0,"#050a18"],[.55,"#0b1836"],[1,"#3d1d5e"]]);
    ctx.fillRect(0,0,w,h);
    const hz=h*.52;
    const g=ctx.createLinearGradient(0,hz-h*.18,0,hz);
    g.addColorStop(0,"rgba(120,80,255,0)");g.addColorStop(1,"rgba(180,120,255,.55)");
    ctx.fillStyle=g;ctx.fillRect(0,hz-h*.18,w,h*.18);
    ctx.strokeStyle="rgba(150,200,255,.45)";ctx.lineWidth=Math.max(1,h*.004);
    // perspective lines converging on the vanishing point
    for(let i=-14;i<=14;i++){
      ctx.beginPath();ctx.moveTo(w/2+i*w*.13,h);ctx.lineTo(w/2,hz);ctx.stroke();
    }
    for(let i=1;i<=9;i++){
      const t=i/9, y=hz+(h-hz)*t*t;
      ctx.globalAlpha=.5*(1-t)+.15;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }}
};
const BANNER_IDS=Object.keys(BANNER_ART);

/* Painted on demand from the id, so a chosen banner costs a few bytes of
   storage rather than a base64 image — which matters, because localStorage is
   the same budget the user's whole library lives in. */
function paintBannerTo(canvas,id,w,h){
  const art=BANNER_ART[id];if(!canvas||!art)return false;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  canvas.style.width=w+"px";canvas.style.height=h+"px";
  const ctx=canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  art.paint(ctx,w,h);
  return true;
}
function bannerDataURL(id,w,h){
  const c=document.createElement("canvas");
  if(!paintBannerTo(c,id,w||600,h||200))return "";
  return c.toDataURL("image/png");
}

/* ---- crests: generated avatars, an alternative to the emoji set ----
   A crest is a small symmetric mark derived from its id. Same reasoning as the
   banners: original geometry, nobody's character. */
const CREST_PALETTES=[
  ["#8b5cf6","#ec4899"],["#22c55e","#0ea5e9"],["#f59e0b","#ef4444"],
  ["#06b6d4","#6366f1"],["#f43f5e","#fb923c"],["#a3e635","#14b8a6"],
  ["#e879f9","#7c3aed"],["#fbbf24","#f472b6"],["#38bdf8","#818cf8"],
  ["#fb7185","#c084fc"],["#34d399","#facc15"],["#60a5fa","#f0abfc"]
];
function paintCrestTo(canvas,idx,size){
  if(!canvas)return false;
  const dpr=Math.min(2,window.devicePixelRatio||1), s=size||64;
  canvas.width=Math.round(s*dpr);canvas.height=Math.round(s*dpr);
  canvas.style.width=s+"px";canvas.style.height=s+"px";
  const ctx=canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const pal=CREST_PALETTES[idx%CREST_PALETTES.length];
  const r=_rng(idx*2654435761+13);
  const g=ctx.createLinearGradient(0,0,s,s);
  g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);
  ctx.fillStyle=g;ctx.fillRect(0,0,s,s);
  // mirrored blocks — a sigil rather than a face
  ctx.fillStyle="rgba(255,255,255,.85)";
  const cells=5, cs=s/cells;
  for(let y=0;y<cells;y++){
    for(let x=0;x<Math.ceil(cells/2);x++){
      if(r()<.45)continue;
      ctx.fillRect(x*cs,y*cs,cs,cs);
      ctx.fillRect((cells-1-x)*cs,y*cs,cs,cs);
    }
  }
  ctx.globalCompositeOperation="destination-in";
  ctx.beginPath();ctx.arc(s/2,s/2,s/2,0,Math.PI*2);ctx.fill();
  ctx.globalCompositeOperation="source-over";
  return true;
}
function crestDataURL(idx,size){
  const c=document.createElement("canvas");
  paintCrestTo(c,idx,size||96);
  return c.toDataURL("image/png");
}
const CREST_COUNT=12;

/* ---- photo import ----
   Downscaled and re-encoded before it is ever stored. A modern phone photo is
   3-8MB; localStorage gives the whole app about 5MB, so storing one raw would
   evict the user's entire library. 256px square at JPEG 0.82 lands around 25KB.
   Also drops EXIF (including GPS) as a side effect of the canvas round-trip. */
function importPhoto(file,maxPx,cb){
  const MAX=maxPx||256;
  if(!file||!/^image\//.test(file.type)){cb(null,"That isn't an image file.");return;}
  if(file.size>12*1024*1024){cb(null,"That image is too large — try one under 12MB.");return;}
  const fr=new FileReader();
  fr.onerror=()=>cb(null,"Couldn't read that file.");
  fr.onload=()=>{
    const img=new Image();
    img.onerror=()=>cb(null,"That image couldn't be opened.");
    img.onload=()=>{
      const side=Math.min(img.width,img.height);          // centre-crop to square
      const sx=(img.width-side)/2, sy=(img.height-side)/2;
      const c=document.createElement("canvas");
      c.width=c.height=MAX;
      const ctx=c.getContext("2d");
      ctx.imageSmoothingQuality="high";
      ctx.drawImage(img,sx,sy,side,side,0,0,MAX,MAX);
      cb(c.toDataURL("image/jpeg",.82),null);
    };
    img.src=fr.result;
  };
  fr.readAsDataURL(file);
}
/* Banners are wide, so they crop to 3:1 rather than square. */
function importBannerPhoto(file,cb){
  if(!file||!/^image\//.test(file.type)){cb(null,"That isn't an image file.");return;}
  if(file.size>12*1024*1024){cb(null,"That image is too large — try one under 12MB.");return;}
  const fr=new FileReader();
  fr.onerror=()=>cb(null,"Couldn't read that file.");
  fr.onload=()=>{
    const img=new Image();
    img.onerror=()=>cb(null,"That image couldn't be opened.");
    img.onload=()=>{
      const W=720,H=240;
      const scale=Math.max(W/img.width,H/img.height);
      const dw=img.width*scale, dh=img.height*scale;
      const c=document.createElement("canvas");c.width=W;c.height=H;
      const ctx=c.getContext("2d");ctx.imageSmoothingQuality="high";
      ctx.drawImage(img,(W-dw)/2,(H-dh)/2,dw,dh);
      cb(c.toDataURL("image/jpeg",.8),null);
    };
    img.src=fr.result;
  };
  fr.readAsDataURL(file);
}

/* ============================================================ look sheet ==== */
/* Picture and banner live in their own sheet rather than the edit form: an
   emoji grid, twelve generated crests, a photo import, and ten banners. */
let _avTab="emoji";

function currentBanner(){return store.get("banner",null);}   // {id} | {img:dataURI} | null
function paintIdBanner(){
  const cv=$("#idBanner"),card=$("#idCard");
  if(!cv||!card)return;
  const b=currentBanner();
  const W=card.clientWidth||360,H=card.clientHeight||96;
  if(!b){cv.style.display="none";card.classList.remove("hasbanner");return;}
  cv.style.display="block";card.classList.add("hasbanner");
  if(b.img){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";
    const c=cv.getContext("2d");c.setTransform(dpr,0,0,dpr,0,0);
    const im=new Image();
    im.onload=()=>{
      const sc=Math.max(W/im.width,H/im.height);
      c.drawImage(im,(W-im.width*sc)/2,(H-im.height*sc)/2,im.width*sc,im.height*sc);
    };
    im.src=b.img;
    return;
  }
  paintBannerTo(cv,b.id,W,H);
}
function _avPanel(){
  const host=$("#avPanel");if(!host)return;
  if(_avTab==="emoji"){
    host.innerHTML=`<div class="avpick">${AVATARS.map(a=>
      `<button class="avopt${(!profile.avatarImg&&a===(profile.avatar||"🍥"))?' sel':''}" data-lav="${a}">${a}</button>`).join("")}</div>`;
  }else if(_avTab==="crest"){
    host.innerHTML=`<div class="crestgrid">${Array.from({length:CREST_COUNT},(_,i)=>
      `<button class="crestopt${profile.crest===i?' sel':''}" data-crest="${i}"><canvas data-ci="${i}"></canvas></button>`).join("")}</div>`;
    host.querySelectorAll("canvas[data-ci]").forEach(cv=>paintCrestTo(cv,+cv.dataset.ci,52));
  }else{
    host.innerHTML=`<div class="photopick">
      ${profile.avatarImg?`<img class="photoprev" src="${profile.avatarImg}" alt="Your picture" />`
        :`<div class="photoempty">No photo yet</div>`}
      <button class="savebtn ghostbtn" id="pickPhoto"><span class="icw">${icSvg("upload")}</span>${profile.avatarImg?"Change photo":"Choose a photo"}</button>
      ${profile.avatarImg?`<button class="skip" id="dropPhoto">Remove photo</button>`:""}
      <p class="setnote">Cropped square and shrunk to 256px before it is saved — a full-size photo would use more storage than your entire library. Location data in the file is dropped in the process.</p>
    </div>`;
  }
  document.querySelectorAll("#avTabs .seg").forEach(b=>b.classList.toggle("on",b.dataset.av===_avTab));
}
function _bannerGrid(){
  const g=$("#bannerGrid");if(!g)return;
  const cur=currentBanner();
  g.innerHTML=`<button class="bopt${!cur?' sel':''}" data-banner="">
      <span class="bnone">None</span></button>`+
    BANNER_IDS.map(id=>`<button class="bopt${cur&&cur.id===id?' sel':''}" data-banner="${id}">
      <canvas data-bi="${id}"></canvas><span class="blabel">${BANNER_ART[id].name}</span></button>`).join("")+
    (cur&&cur.img?`<button class="bopt sel" data-banner="__own"><img src="${cur.img}" alt="" /><span class="blabel">Yours</span></button>`:"");
  g.querySelectorAll("canvas[data-bi]").forEach(cv=>paintBannerTo(cv,cv.dataset.bi,132,44));
}
function openLook(){
  const sh=$("#lookSheet");if(!sh)return;
  _avPanel();_bannerGrid();
  sh.classList.add("on");
}
function initLook(){
  if(!$("#lookSheet"))return;
  $("#openLook").onclick=()=>openLook();
  $("#lookDone").onclick=()=>{$("#lookSheet").classList.remove("on");renderProfile();};
  document.querySelectorAll("#avTabs .seg").forEach(b=>b.onclick=()=>{_avTab=b.dataset.av;_avPanel();buzz(6);});

  document.addEventListener("click",e=>{
    if(!e.target.closest)return;
    const em=e.target.closest("[data-lav]");
    if(em){profile.avatar=em.dataset.lav;profile.avatarImg=null;profile.crest=null;
      store.set("profile",profile);_avPanel();renderProfile();buzz(6);return;}
    const cr=e.target.closest("[data-crest]");
    if(cr){const i=+cr.dataset.crest;
      profile.crest=i;profile.avatarImg=crestDataURL(i,96);
      store.set("profile",profile);_avPanel();renderProfile();buzz(6);return;}
    if(e.target.closest("#pickPhoto")){$("#avatarFile").click();return;}
    if(e.target.closest("#dropPhoto")){
      profile.avatarImg=null;profile.crest=null;store.set("profile",profile);
      _avPanel();renderProfile();return;}
    if(e.target.closest("#bannerUpload")){$("#bannerFile").click();return;}
    const bo=e.target.closest("[data-banner]");
    if(bo){
      const v=bo.dataset.banner;
      if(v==="__own"){return;}                       // already selected
      store.set("banner",v?{id:v}:null);
      _bannerGrid();paintIdBanner();buzz(6);return;}
  });

  $("#avatarFile").addEventListener("change",e=>{
    const f=e.target.files&&e.target.files[0];e.target.value="";
    if(!f)return;
    importPhoto(f,256,(uri,err)=>{
      if(err){toast(err);return;}
      profile.avatarImg=uri;profile.crest=null;
      if(!store.set("profile",profile)){toast("Not enough space to save that picture");return;}
      _avPanel();renderProfile();toast("Picture updated");
    });
  });
  $("#bannerFile").addEventListener("change",e=>{
    const f=e.target.files&&e.target.files[0];e.target.value="";
    if(!f)return;
    importBannerPhoto(f,(uri,err)=>{
      if(err){toast(err);return;}
      if(!store.set("banner",{img:uri})){toast("Not enough space to save that banner");return;}
      _bannerGrid();paintIdBanner();toast("Banner updated");
    });
  });
  window.addEventListener("resize",()=>{if(currentView==="profile")paintIdBanner();});
}
