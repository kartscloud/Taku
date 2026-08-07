/* taku · share-card export + data backup/restore */

/* ---------- rank share card (1080×1920 story PNG) ---------- */
function _rr(ctx,x,y,w,h,r){ // roundRect fallback
  if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);return;}
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function _loadImg(src,ms){
  const attempt=u=>new Promise(res=>{
    const img=new Image();img.crossOrigin="anonymous";
    const t=setTimeout(()=>res(null),ms||4000);
    img.onload=()=>{clearTimeout(t);res(img);};
    img.onerror=()=>{clearTimeout(t);res(null);};
    img.src=u;
  });
  // retry once with a cache-buster: dodges poisoned/non-CORS CDN edge entries
  return attempt(src).then(r=>r||attempt(src+(src.includes("?")?"&":"?")+"cb=1"));
}
function _wrapText(ctx,text,maxW){
  const words=(text||"").split(" "),lines=[];let line="";
  words.forEach(w=>{const test=line?line+" "+w:w;if(ctx.measureText(test).width>maxW&&line){lines.push(line);line=w;}else line=test;});
  if(line)lines.push(line);return lines;
}

async function buildShareCard(prof){
  const W=1080,H=1920;
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  const color=prof.arch.color;

  // background
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#241a3a");bg.addColorStop(.45,"#0d0b14");bg.addColorStop(1,"#0d0b14");
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // faint neural web
  ctx.strokeStyle="rgba(139,92,246,.07)";ctx.lineWidth=2;
  for(let i=0;i<26;i++){const x1=(i*173)%W,y1=(i*271)%620,x2=((i+7)*231)%W,y2=((i+3)*197)%700;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  for(let i=0;i<34;i++){const x=(i*157)%W,y=(i*211)%680;ctx.fillStyle="rgba(190,180,230,"+(0.10+(i%5)*0.05)+")";ctx.beginPath();ctx.arc(x,y,3+(i%3)*2,0,7);ctx.fill();}

  // wordmark
  const wm=ctx.createLinearGradient(W/2-110,0,W/2+110,0);
  wm.addColorStop(0,"#8b5cf6");wm.addColorStop(1,"#ec4899");
  ctx.textAlign="center";ctx.fillStyle=wm;
  ctx.font="800 88px -apple-system,'Segoe UI',Roboto,sans-serif";
  const wmCx=W/2-14, wmW=ctx.measureText("taku").width;
  ctx.fillText("taku",wmCx,150);
  ctx.fillStyle="#ec4899";ctx.beginPath();ctx.arc(wmCx+wmW/2+20,142,11,0,7);ctx.fill(); // dot anchored to text edge

  // avatar in ring
  ctx.strokeStyle=color;ctx.lineWidth=10;ctx.shadowColor=color;ctx.shadowBlur=44;
  ctx.beginPath();ctx.arc(W/2,382,128,0,7);ctx.stroke();ctx.shadowBlur=0;
  ctx.font="150px 'Segoe UI Emoji','Apple Color Emoji',serif";
  ctx.fillText(profile.avatar||"🍥",W/2,436);

  // name + handle
  ctx.fillStyle="#f4f1ff";ctx.font="800 62px -apple-system,'Segoe UI',Roboto,sans-serif";
  ctx.fillText(profile.name||"Nameless Otaku",W/2,610);
  ctx.fillStyle=color;ctx.font="600 34px ui-monospace,Consolas,monospace";
  ctx.fillText("@"+(profile.handle||"you")+"  ·  "+prof.tierName,W/2,668);

  // eyebrow
  ctx.fillStyle=prof.legendUnlocked?"#ffd23f":"#a79fc4";
  ctx.font="700 30px ui-monospace,Consolas,monospace";
  const eyebrow=prof.legendUnlocked?"✦  L E G E N D A R Y   C L A S S  ✦":"C L A S S I F I C A T I O N";
  ctx.fillText(eyebrow,W/2,790);

  // archetype title (shrink to fit)
  let size=170;ctx.font="900 "+size+"px -apple-system,'Segoe UI',Roboto,sans-serif";
  while(ctx.measureText(prof.title).width>W-120&&size>70){size-=8;ctx.font="900 "+size+"px -apple-system,'Segoe UI',Roboto,sans-serif";}
  ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=60;
  ctx.fillText(prof.title,W/2,810+size);
  ctx.shadowBlur=0;

  // blurb
  ctx.fillStyle="#a79fc4";ctx.font="400 34px -apple-system,'Segoe UI',Roboto,sans-serif";
  const lines=_wrapText(ctx,prof.arch.blurb,W-260).slice(0,3);
  lines.forEach((l,i)=>ctx.fillText(l,W/2,1060+i*48));

  // stats row — days-of-anime framing
  const days=prof.hours/24;
  const dayVal=days>=1?(days>=10?Math.round(days):days.toFixed(1)):Math.round(prof.hours);
  const dayLabel=days>=1?"DAYS OF ANIME":"HOURS OF ANIME";
  const stats=[[prof.power.toLocaleString(),"NEURAL INDEX"],[String(dayVal),dayLabel],[String(prof.count),"TITLES RANKED"]];
  const colW=(W-160)/3;
  stats.forEach(([v,l],i)=>{
    const cx=80+colW*i+colW/2;
    ctx.fillStyle="rgba(255,255,255,.05)";_rr(ctx,80+colW*i+10,1210,colW-20,190,24);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.10)";ctx.lineWidth=2;_rr(ctx,80+colW*i+10,1210,colW-20,190,24);ctx.stroke();
    ctx.fillStyle="#f4f1ff";ctx.font="800 74px -apple-system,'Segoe UI',Roboto,sans-serif";ctx.fillText(v,cx,1315);
    ctx.fillStyle="#a79fc4";ctx.font="600 22px ui-monospace,Consolas,monospace";ctx.fillText(l,cx,1368);
  });

  // genre bars (top 3)
  const bars=prof.genres.slice(0,3),maxW2=bars.length?bars[0][1]:1;
  ctx.textAlign="left";
  bars.forEach(([g,wv],i)=>{
    const y=1466+i*72;
    ctx.fillStyle="#a79fc4";ctx.font="600 30px ui-monospace,Consolas,monospace";
    ctx.fillText(g.length>16?g.slice(0,15)+"…":g,90,y+12);
    ctx.fillStyle="rgba(255,255,255,.07)";_rr(ctx,400,y-14,590,30,15);ctx.fill();
    ctx.fillStyle=color;_rr(ctx,400,y-14,Math.max(50,590*(wv/maxW2)),30,15);ctx.fill();
  });

  // top-rated covers (up to 3, best tiers first) — y1662..1902
  const top=[...watched].slice(0,3);
  const imgs=await Promise.all(top.map(m=>m.img&&m.img!=="x"?_loadImg(m.ximg||hiRes(m.img),6500):Promise.resolve(null)));
  const cw=143,ch=200,gap=34,CY=1656,totalW=imgs.filter(Boolean).length*(cw+gap)-gap; // bars end 1626, footer top ~1879
  let x=(W-Math.max(totalW,0))/2;
  imgs.forEach((img,i)=>{
    if(!img)return;
    ctx.save();_rr(ctx,x,CY,cw,ch,16);ctx.clip();
    try{ctx.drawImage(img,x,CY,cw,ch);}catch(e){}
    ctx.restore();
    ctx.strokeStyle="rgba(255,255,255,.18)";ctx.lineWidth=3;_rr(ctx,x,CY,cw,ch,16);ctx.stroke();
    const t=top[i].tier;
    if(t){ctx.fillStyle=({S:"#ff4d6d",A:"#ff9a3c",B:"#ffd23f",C:"#4ade80",D:"#60a5fa"})[t]||"#8b5cf6";_rr(ctx,x+9,CY+9,42,42,10);ctx.fill();ctx.fillStyle="#0d0b14";ctx.font="900 28px -apple-system,sans-serif";ctx.textAlign="center";ctx.fillText(t,x+30,CY+39);ctx.textAlign="left";}
    x+=cw+gap;
  });

  // footer — single line, inside canvas
  ctx.textAlign="center";
  ctx.fillStyle="#6e6590";ctx.font="600 24px ui-monospace,Consolas,monospace";
  ctx.fillText("swipe your next anime  ·  data: AniList",W/2,1888);
  return canvas;
}

async function shareRankCard(){
  try{
    toast("Building your card…");
    const prof=window._lastProf||computeProfile();
    if(!prof.count){toast("Rate a few anime first — your card needs a rank");return;}
    const canvas=await buildShareCard(prof);
    const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));
    if(!blob)throw new Error("render failed");
    const file=new File([blob],"taku-rank.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
      await navigator.share({files:[file],title:"my taku rank"});
    }else{
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="taku-rank.png";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      toast("Card saved as an image");
    }
    buzz([10,30,10]);
  }catch(e){
    if(e&&e.name==="AbortError")return;           // user closed the share sheet
    console.error(e);toast("Couldn't build the card — try again");
  }
}

/* ---------- data backup / restore (iOS eviction shield) ---------- */
function exportData(){
  try{
    const data={_taku:1,exported:new Date().toISOString()};
    Object.keys(localStorage).forEach(k=>{
      if(k.startsWith("taku_")&&!k.startsWith("taku_cache"))data[k]=localStorage.getItem(k);
    });
    const blob=new Blob([JSON.stringify(data,null,1)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download="taku-backup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    toast("Backup saved — keep it somewhere safe");
  }catch(e){toast("Backup failed — try again");}
}
function importData(file){
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const data=JSON.parse(rd.result);
      if(!data||data._taku!==1)throw new Error("not a taku backup");
      let n=0;
      Object.keys(data).forEach(k=>{if(k.startsWith("taku_")&&!k.startsWith("taku_cache")){localStorage.setItem(k,data[k]);n++;}});
      if(!n)throw new Error("empty");
      toast("Restored — reloading");
      setTimeout(()=>location.reload(),700);
    }catch(e){toast("That file isn't a taku backup");}
  };
  rd.onerror=()=>toast("Couldn't read that file");
  rd.readAsText(file);
}
