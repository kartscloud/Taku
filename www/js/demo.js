/* taku · inline demos
   Every sheet that has a control people hesitate over gets a small looping
   demonstration instead of a paragraph explaining it. One engine, one skip:
   hitting Skip anywhere turns demos off everywhere and leaves a "Show me how"
   link behind, so nobody has to dismiss the same thing five times.

   A demo is a static stage plus a list of steps. JS only stamps
   stage.dataset.k — all motion and highlighting lives in CSS, keyed off that
   attribute. Adding a demo means adding markup + captions here, not new JS. */

const DEMOS={
  swipe:{
    stage:`<span class="gbub" data-g="left"><span class="icw" data-ic="x"></span>Pass</span>
           <span class="gbub" data-g="right"><span class="icw" data-ic="check"></span>Seen it</span>
           <span class="gbub" data-g="up"><span class="icw" data-ic="star"></span>Want</span>
           <span class="gbub" data-g="tap"><span class="icw" data-ic="tap"></span>Details</span>
           <div class="gcard"><span class="icw" data-ic="cards"></span></div>`,
    steps:[
      {k:"left", cap:"Swipe <b>left</b> to pass — it won't come back."},
      {k:"right",cap:"Swipe <b>right</b> for something you've seen."},
      {k:"up",   cap:"Swipe <b>up</b> to save it to Want."},
      {k:"tap",  cap:"<b>Tap</b> the card for cast, score and similar shows."}
    ]
  },
  rate:{
    stage:`<div class="dtiers">
             <span class="dt" data-t="S" style="background:var(--s)">S</span>
             <span class="dt" data-t="A" style="background:var(--a)">A</span>
             <span class="dt" data-t="B" style="background:var(--b)">B</span>
             <span class="dt" data-t="C" style="background:var(--c)">C</span>
             <span class="dt" data-t="D" style="background:var(--d)">D</span>
           </div>
           <div class="dalts">
             <span class="dalt" data-a="watching"><span class="icw" data-ic="play"></span>Still watching</span>
             <span class="dalt" data-a="notier">No tier</span>
           </div>`,
    steps:[
      {k:"tiers",   cap:"Tap a tier — <b>S</b> is peak, <b>D</b> is nah."},
      {k:"watching",cap:"Not finished? <b>Still watching</b> parks it — rank it later."},
      {k:"notier",  cap:"Can't decide? <b>No tier</b> saves it as watched, unranked."}
    ]
  },
  year:{
    stage:`<span class="dchip" data-c="popular">Most popular</span>
           <span class="dchip" data-c="rated">Highest rated</span>
           <span class="dchip" data-c="gems">Hidden gems</span>`,
    steps:[
      {k:"popular",cap:"<b>Most popular</b> — what everyone logged. Newer shows win."},
      {k:"rated",  cap:"<b>Highest rated</b> — best scored, however obscure."},
      {k:"gems",   cap:"<b>Hidden gems</b> — high scores, low view counts. The stuff you'd never find."}
    ]
  },
  filters:{
    stage:`<span class="dchip" data-c="origin">Japan</span>
           <span class="dchip" data-c="platform">Crunchyroll</span>
           <span class="dchip" data-c="format">TV</span>`,
    steps:[
      {k:"origin",  cap:"<b>Origin</b> — Japan only, or open it up to Chinese and Korean shows."},
      {k:"platform",cap:"<b>Platform</b> — only show what you can actually stream."},
      {k:"format",  cap:"<b>Format</b> — TV, films, ONAs. Filters stack, so picking all three narrows hard."}
    ]
  },
  rank:{
    stage:`<div class="drows">
             <span class="drow" data-r="1"><i>1</i>Frieren</span>
             <span class="drow" data-r="2"><i>2</i>Steins;Gate</span>
             <span class="drow" data-r="3"><i>3</i>Mushishi</span>
           </div>`,
    steps:[
      {k:"hold", cap:"<b>Press and hold</b> any row."},
      {k:"drag", cap:"<b>Drag</b> it up or down — the list opens as you go."},
      {k:"drop", cap:"<b>Let go</b> to drop it. Only the row you moved changes tier."}
    ]
  }
};

const DEMO_MS=2000;
let _demoTimers=[];

function demosOff(){return !!store.get("demosOff",false);}
function demoSeen(k){return (store.get("demoSeen",{})[k])|0;}
/* One view per session, not per render — renderRanked() reruns on every count
   refresh and would otherwise burn the whole allowance in a second. */
const _demoCounted=new Set();
function bumpDemoSeen(k){
  if(_demoCounted.has(k))return;
  _demoCounted.add(k);
  const m=store.get("demoSeen",{});m[k]=(m[k]|0)+1;store.set("demoSeen",m);
}

/* Build every <div class="demo" data-demo="key"> inside root. Safe to call
   repeatedly — it re-renders in place, which is how the Skip toggle repaints. */
function mountDemos(root){
  (root||document).querySelectorAll(".demo[data-demo]").forEach(host=>{
    const def=DEMOS[host.dataset.demo];
    if(!def)return;
    /* data-demo-max caps how many times a demo ever plays. The rate sheet uses
       it: it opens after every single swipe, so a permanent loop there would
       slow down the exact flow it is meant to teach. */
    const max=+(host.dataset.demoMax||0);
    if(max&&demoSeen(host.dataset.demo)>=max){
      /* Spent. Leave the link so it can be replayed — except where the host
         asks to disappear outright (the rate sheet, which must stay fast). */
      host.innerHTML=host.dataset.demoAfter==="hide"?""
        :`<button class="demoshow" data-demo-show data-demo-replay>Show me how ranking works</button>`;
      return;
    }
    if(demosOff()){
      host.innerHTML=`<button class="demoshow" data-demo-show>Show me how this works</button>`;
      return;
    }
    host.innerHTML=`
      <div class="demohead"><span>How it works</span><button class="demoskip" data-demo-skip>Skip</button></div>
      <div class="dstage d-${host.dataset.demo}">${def.stage}</div>
      <div class="democap"></div>
      <div class="demodots">${def.steps.map(()=>`<i></i>`).join("")}</div>`;
    host.querySelectorAll("[data-ic]").forEach(el=>{el.innerHTML=icSvg(el.dataset.ic);});
  });
}

/* Run the demos inside a container — a sheet or any element on the page. Each
   loop checks whether its host is still showing and kills itself if not, so no
   timer survives a dismissed modal or a re-rendered list. */
function startDemos(scopeId){
  stopDemos(scopeId);
  const root=$("#"+scopeId);
  if(!root||demosOff())return;
  const live=host=>root.classList.contains("modal")
    ? root.classList.contains("on")
    /* Test the host, not just the section: switching Tiers sub-tabs rewrites
       #watchedList and detaches the host while the section stays visible, which
       left the loop ticking against dead nodes until the user changed view. */
    : document.body.contains(host)&&root.offsetParent!==null;
  root.querySelectorAll(".demo[data-demo]").forEach(host=>{
    const def=DEMOS[host.dataset.demo];
    const stage=host.querySelector(".dstage"),cap=host.querySelector(".democap"),
          dots=host.querySelectorAll(".demodots i");
    if(!def||!stage)return;
    if(host.dataset.demoMax)bumpDemoSeen(host.dataset.demo);
    let i=-1;
    const step=()=>{
      if(!live(host)){stopDemos(scopeId);return;}
      i=(i+1)%def.steps.length;
      stage.dataset.k=def.steps[i].k;
      if(cap)cap.innerHTML=def.steps[i].cap;
      dots.forEach((d,n)=>d.classList.toggle("on",n===i));
    };
    step();
    _demoTimers.push({scope:scopeId,t:setInterval(step,DEMO_MS)});
  });
}
/* stopDemos() with no argument stops everything; with a scope it only stops
   that container's, so closing a sheet can't kill an inline demo behind it. */
function stopDemos(scopeId){
  _demoTimers=_demoTimers.filter(x=>{
    if(scopeId&&x.scope!==scopeId)return true;
    clearInterval(x.t);return false;
  });
}

document.addEventListener("click",e=>{
  if(!e.target.closest)return;
  if(e.target.closest("[data-demo-skip]")){
    store.set("demosOff",true);mountDemos(document);stopDemos();buzz(6);
    toast("Demos off — tap “Show me how” any time");
    return;
  }
  if(e.target.closest("[data-demo-show]")){
    // read the scope first: mountDemos() rewrites the host and detaches e.target,
    // after which closest() walks a node that is no longer in the document
    const scope=e.target.closest(".modal")||e.target.closest("section[id^='view-']");
    const id=scope&&scope.id;
    // "replay" means the demo hit its view cap rather than being skipped —
    // clear the counter so it actually plays instead of collapsing again
    const host=e.target.closest("[data-demo-replay]")&&scope&&scope.querySelector(".demo[data-demo]");
    if(host){const m=store.get("demoSeen",{});delete m[host.dataset.demo];store.set("demoSeen",m);
             _demoCounted.delete(host.dataset.demo);}
    store.set("demosOff",false);mountDemos(document);buzz(6);
    if(id)startDemos(id);
    return;
  }
});
