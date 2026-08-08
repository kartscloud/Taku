/* taku · profile: neural rank, identity, squad */
function computeProfile(){
  const list=watched.filter(m=>m.status!=="watching"),count=list.length,gcount={}; // in-progress shows don't count toward the rank
  let minutes=0;
  list.forEach(m=>{
    minutes+=(m.eps||12)*(m.dur||23);
    // count each genre once — position in this array is alphabetical, not
    // importance, so the old 1/(i+1) made the genre bars and the archetype
    // that derives from them alphabetically biased
    (m.genres||[]).forEach(g=>{gcount[g]=(gcount[g]||0)+1;});
  });
  const hours=minutes/60;
  const genres=Object.entries(gcount).sort((a,b)=>b[1]-a[1]);
  const topGenre=genres.length?genres[0][0]:null;
  const power=Math.round(hours*10+count*45);
  const tierName=count?TIERS.find(t=>power>=t[1])[0]:"UNRANKED";
  const arch=ARCH[topGenre]||ARCH._default;
  const legendUnlocked=count>0&&LEGEND_TIERS.includes(tierName);
  const title=count===0?"UNTRACED":(legendUnlocked?arch.legend:arch.base);
  return{count,hours,power,tierName,topGenre,genres,arch,title,legendUnlocked};
}

let netRAF=null;
function stopNet(){if(netRAF)cancelAnimationFrame(netRAF);netRAF=null;}
function startNet(prof){
  const canvas=$("#net");if(!canvas)return;
  const ctx=canvas.getContext("2d"),color=prof.arch.color;
  const inputs=Math.max(3,Math.min(5,prof.genres.length||4));
  const layers=[inputs,6,5,1];
  const totW=prof.genres.slice(0,inputs).reduce((s,g)=>s+g[1],0)||1;
  const inputAct=Array.from({length:inputs},(_,i)=>prof.genres[i]?.25+.75*(prof.genres[i][1]/totW):.3);
  const pulses=Array.from({length:12},(_,i)=>({L:i%3,from:0,to:0,t:i/12,speed:.007+(i%5)*.003}));
  pulses.forEach(p=>{p.from=(p.L*3)%layers[p.L];p.to=(p.L*2)%layers[p.L+1];});
  let frame=0;
  function size(){const dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);return{w,h};}
  function pos(L,i,w,h){const padX=w*.14,pT=20,pB=20;const x=padX+(w-2*padX)*(L/(layers.length-1));const n=layers[L];const y=n>1?pT+(h-pT-pB)*(i/(n-1)):h/2;return{x,y};}
  function draw(){
    const{w,h}=size();ctx.clearRect(0,0,w,h);frame++;
    for(let L=0;L<layers.length-1;L++)for(let i=0;i<layers[L];i++){const a=pos(L,i,w,h);for(let j=0;j<layers[L+1];j++){const b=pos(L+1,j,w,h);ctx.strokeStyle="rgba(255,255,255,.045)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
    pulses.forEach(p=>{p.t+=p.speed;if(p.t>=1){p.t=0;p.L++;if(p.L>=layers.length-1){p.L=0;p.from=(frame+p.speed*999|0)%layers[0];}else{p.from=p.to;}p.to=(p.from+frame)%layers[p.L+1];}const a=pos(p.L,p.from,w,h),b=pos(p.L+1,p.to,w,h),x=a.x+(b.x-a.x)*p.t,y=a.y+(b.y-a.y)*p.t;ctx.beginPath();ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=10;ctx.arc(x,y,2.2,0,7);ctx.fill();ctx.shadowBlur=0;});
    for(let L=0;L<layers.length;L++)for(let i=0;i<layers[L];i++){const p=pos(L,i,w,h),isOut=L===layers.length-1;let act=L===0?inputAct[i]:.5+.5*Math.sin(frame*.05+L*1.3+i*.7);const r=isOut?11:3.2+act*3.2;ctx.beginPath();ctx.fillStyle=isOut?color:`rgba(190,180,230,${.3+act*.5})`;ctx.shadowColor=color;ctx.shadowBlur=isOut?24:0;ctx.arc(p.x,p.y,r,0,7);ctx.fill();ctx.shadowBlur=0;}
    ctx.font="9px ui-monospace,Menlo,monospace";ctx.fillStyle="rgba(200,192,224,.7)";ctx.textAlign="right";
    for(let i=0;i<layers[0];i++){const p=pos(0,i,w,h);const g=prof.genres[i]?prof.genres[i][0]:"—";ctx.fillText(g.length>12?g.slice(0,11)+"…":g,p.x-9,p.y+3);}
    netRAF=requestAnimationFrame(draw);
  }
  draw();
}

function hashStr(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h;}
function myCode(prof){const d={u:profile.name||"Nameless Otaku",h:profile.handle||"you",a:profile.avatar||"🍥",t:prof.title,tr:prof.tierName,p:prof.power,g:prof.topGenre||"—",c:prof.arch.color};return btoa(encodeURIComponent(JSON.stringify(d)));}
function decodeCode(s){try{const d=JSON.parse(decodeURIComponent(atob((s||"").trim())));if(!d||!d.u)return null;const cap=(v,n)=>String(v==null?"":v).slice(0,n);return{id:"f"+Math.abs(hashStr(s.trim())),name:cap(d.u,24)||"Friend",handle:cap(d.h,18)||"friend",avatar:cap(d.a,4)||"🙂",title:cap(d.t,28)||"UNTRACED",tier:cap(d.tr,18),power:Math.max(0,Math.min(9999999,+d.p||0)),genre:cap(d.g,24),color:safeColor(d.c)};}catch(e){return null;}}

function renderIdentity(prof){
  const av=$("#pfAvatar");
  av.textContent=profile.avatar||"🍥";
  av.style.boxShadow=`0 0 0 3px ${prof.arch.color}, 0 0 26px ${prof.arch.color}66`;
  $("#miniAv").textContent=profile.avatar||"🍥";
  $("#pfName").textContent=profile.name||"Nameless Otaku";
  const since=profile.created?new Date(profile.created).getFullYear():new Date().getFullYear();
  const h=$("#pfHandle");
  h.textContent="@"+(profile.handle||"you")+"  ·  "+(prof.count?prof.title:"unranked")+"  ·  since "+since;
  h.style.color=prof.arch.color;
  $("#pfBio").textContent=profile.bio||"No bio yet — tap edit to say who you are as a watcher.";
}
function renderFriends(prof){
  const me={me:true,id:"me",name:profile.name||"You",avatar:profile.avatar||"🍥",title:prof.count?prof.title:"UNTRACED",tier:prof.count?prof.tierName:"UNRANKED",power:prof.power,color:prof.arch.color};
  const board=[me,...friends].sort((a,b)=>b.power-a.power);
  $("#squadCount").textContent=friends.length+" friend"+(friends.length!==1?"s":"");
  $("#friendList").innerHTML=board.map((f,i)=>`
    <div class="frow${f.me?' me':''}">
      <span class="frank">${i+1}</span>
      <span class="fav" style="box-shadow:0 0 0 2px ${safeColor(f.color)}">${escHTML(f.avatar)}</span>
      <div class="fmeta">
        <div class="fn">${escHTML(f.name)}${f.me?' <em>YOU</em>':''}</div>
        <div class="fsub" style="color:${safeColor(f.color)}">${escHTML(f.title)} · ${escHTML(f.tier)}</div>
      </div>
      <div class="fpow">${(+f.power||0).toLocaleString()}<span>INDEX</span></div>
      ${f.me?'':`<button class="fx" data-friend-remove="${escHTML(f.id)}" title="Remove"><span class="icw">${icSvg("x")}</span></button>`}
    </div>`).join("");
}

function renderProfile(){
  if(typeof renderAuthZone==="function")renderAuthZone();
  const prof=computeProfile();
  window._lastProf=prof;
  renderIdentity(prof);renderFriends(prof);
  const t=$("#rankTitle");t.textContent=prof.title;t.style.color=prof.arch.color;t.style.textShadow=`0 0 34px ${prof.arch.color}88`;
  const eb=$("#rankEyebrow");
  if(prof.legendUnlocked){eb.textContent="✦ Legendary Class";eb.classList.add("legend");}else{eb.textContent="Classification";eb.classList.remove("legend");}
  $("#rankTier").textContent=prof.count?`${prof.tierName} · ${prof.topGenre} dominant`:"Unranked · feed the network";
  $("#rankBlurb").textContent=prof.count?prof.arch.blurb:"The network has nothing to study yet. Go rate the anime you've already seen and your class will emerge.";
  $("#stPower").textContent=prof.power.toLocaleString();
  $("#stHours").textContent=Math.round(prof.hours).toLocaleString();
  $("#stCount").textContent=prof.count;
  const bars=prof.genres.slice(0,5),max=bars.length?bars[0][1]:1;
  $("#genreBars").innerHTML=bars.length?bars.map(([g,w])=>`<div class="gbar"><span class="gname">${g}</span><span class="gtrack"><i style="width:${Math.max(8,(w/max)*100)}%;background:${prof.arch.color}"></i></span></div>`).join(""):`<div class="gbar" style="opacity:.5;font-size:12px">No genres tracked yet.</div>`;
  const rev=$("#rankReveal"),an=$("#analyzing");
  rev.classList.remove("show");an.classList.remove("hide");
  stopNet();startNet(prof);
  clearTimeout(window._revealT);
  window._revealT=setTimeout(()=>{an.classList.add("hide");rev.classList.add("show");},1350);
  clearTimeout(window._netStopT);window._netStopT=setTimeout(stopNet,5200);
}

function initProfile(){
  function openEdit(){
    $("#inName").value=profile.name;$("#inHandle").value=profile.handle;$("#inBio").value=profile.bio;$("#inAge").value=userAge()||"";
    $("#avPick").innerHTML=AVATARS.map(a=>`<button class="avopt${a===(profile.avatar||"🍥")?' sel':''}" data-av="${a}">${a}</button>`).join("");
    $("#editModal").classList.add("on");
  }
  $("#pfEdit").onclick=openEdit;$("#pfAvatar").onclick=openEdit;
  $("#avPick").onclick=e=>{const a=e.target.dataset.av;if(!a)return;profile.avatar=a;document.querySelectorAll("#avPick .avopt").forEach(b=>b.classList.toggle("sel",b.dataset.av===a));};
  $("#saveProfile").onclick=()=>{
    profile.name=$("#inName").value.trim().slice(0,20);
    profile.handle=$("#inHandle").value.trim().replace(/\s+/g,"").slice(0,18);
    profile.bio=$("#inBio").value.trim().slice(0,120);
    const age=parseInt($("#inAge").value,10);
    profile.age=Number.isFinite(age)&&age>0&&age<=120?age:null;
    if(!canAdult())store.set("searchAdult",false);   // dropping below 18 revokes it
    if(!profile.created)profile.created=Date.now();
    store.set("profile",profile);$("#editModal").classList.remove("on");
    const p=window._lastProf||computeProfile();renderIdentity(p);renderFriends(p);
    toast("Profile saved");
  };
  $("#editCancel").onclick=()=>$("#editModal").classList.remove("on");
  $("#addFriend").onclick=()=>{$("#inCode").value="";$("#friendModal").classList.add("on");};
  $("#friendCancel").onclick=()=>$("#friendModal").classList.remove("on");
  $("#doAddFriend").onclick=()=>{
    const f=decodeCode($("#inCode").value);
    if(!f){toast("That code didn't work — check you copied all of it");return;}
    if(friends.some(x=>x.id===f.id)){toast(f.name+" is already in your squad");$("#friendModal").classList.remove("on");return;}
    friends.push(f);store.set("friends",friends);$("#friendModal").classList.remove("on");
    renderFriends(window._lastProf||computeProfile());toast(f.name+" joined your squad");
  };
  $("#shareCode").onclick=async()=>{
    const code=myCode(window._lastProf||computeProfile());
    try{await navigator.clipboard.writeText(code);toast("Your code is copied — send it to a friend");}
    catch(e){window.prompt("Copy your taku code and send it to a friend:",code);}
  };
  document.addEventListener("click",e=>{const t=e.target.closest?e.target.closest("[data-friend-remove]"):null;if(t){friends=friends.filter(x=>x.id!==t.dataset.friendRemove);store.set("friends",friends);renderFriends(window._lastProf||computeProfile());}});
}
