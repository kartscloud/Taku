/* taku · recommendation engine — genre affinity learned from swipes, biased toward NEW */
function affinityScore(m){
  let s=0;(m.genres||[]).forEach((g,i)=>{s+=(affinity[g]||0)/(i+1);});
  return s;
}
function newnessScore(m){
  const {s,y}=curSeason();
  let n=0;
  if(m.status==="RELEASING")n+=5;                                   // airing right now
  if(m.seasonYear===y&&m.season===s)n+=6;                            // this exact season
  else if(m.seasonYear>=y-1)n+=3;                                    // last 12-ish months
  else if(m.seasonYear>=y-3)n+=1;
  return n;
}
function scoreCandidate(m,mode){
  const aff=affinityScore(m);
  const q=((m.averageScore||65)-65)/6;                               // quality above baseline
  const pop=Math.log10((m.popularity||1000)+10)/2;                   // slight mainstream anchor
  let s=aff*2.2+q+pop;
  if(mode==="foryou")s+=newnessScore(m)*1.4;                         // Carter clause: new shit floats
  return s+Math.random()*1.2;                                        // temperature so it never feels canned
}

/* which card-corner chip to show + why */
function reasonFor(m){
  const {s,y}=curSeason();
  if(m.seasonYear===y&&m.season===s)return{cls:"new",txt:"NEW · "+s+" "+y};
  if(m.status==="RELEASING")return{cls:"airing",txt:"AIRING NOW"};
  let best=null,bw=0;(m.genres||[]).forEach(g=>{if((affinity[g]||0)>bw){bw=affinity[g];best=g;}});
  if(best&&bw>=1.5)return{cls:"",txt:"FOR YOU · "+best.toUpperCase()};
  if((m.popularity||0)<80000&&(m.averageScore||0)>=78)return{cls:"new",txt:"HIDDEN GEM"};
  return null;
}

/* build a scored, deduped, unseen queue for a mode */
async function buildQueue(mode,pages){
  const kinds= mode==="foryou" ? ["trending","season","recent","popular"]
             : mode==="new"     ? ["season","recent"]
             :                    ["trending"];
  const p=pages||1;
  const lists=await Promise.all(kinds.map(k=>fetchPool(k,p).catch(()=>[])));
  const byId=new Map();
  lists.flat().forEach(m=>{if(!byId.has(m.id))byId.set(m.id,m);});
  const cands=[...byId.values()].filter(m=>!seen.has(m.id));
  if(mode==="new"){
    cands.sort((a,b)=>(b.aired||0)-(a.aired||0)); // just-dropped first, newest premieres on top
  }else{
    cands.forEach(m=>{m._s=scoreCandidate(m,mode);});
    cands.sort((a,b)=>b._s-a._s);
  }
  return cands;
}
