/* taku · AniList client + cached pools (trending / season / popular / gems / search) */
const API="https://graphql.anilist.co";
const MEDIA_FIELDS=`id title{english romaji} averageScore popularity genres episodes duration seasonYear season status format countryOfOrigin
startDate{year month day} nextAiringEpisode{airingAt episode}
coverImage{large extraLarge} bannerImage description(asHtml:false)
studios(isMain:true){nodes{name}} trailer{id site} externalLinks{site url type language}`;

async function gql(query,variables){
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,variables})});
  if(!r.ok)throw new Error("AniList "+r.status);
  const j=await r.json();
  if(j.errors)throw new Error(j.errors[0].message);
  return j.data;
}

function curSeason(){
  const d=new Date(),m=d.getMonth()+1,y=d.getFullYear();
  const s=m<=3?"WINTER":m<=6?"SPRING":m<=9?"SUMMER":"FALL";
  return{s,y};
}

/* trim media before caching so localStorage stays small */
function trimMedia(m){
  return{
    id:m.id,title:m.title,averageScore:m.averageScore,popularity:m.popularity,genres:m.genres,
    episodes:m.episodes,duration:m.duration,seasonYear:m.seasonYear,season:m.season,status:m.status,format:m.format,
    country:m.countryOfOrigin,
    aired:m.startDate?((m.startDate.year||0)*10000+(m.startDate.month||0)*100+(m.startDate.day||0)):0,
    next:m.nextAiringEpisode?{at:m.nextAiringEpisode.airingAt,ep:m.nextAiringEpisode.episode}:null,
    coverImage:{large:m.coverImage&&m.coverImage.large,extraLarge:m.coverImage&&m.coverImage.extraLarge},
    bannerImage:m.bannerImage,
    description:(m.description||"").replace(/<[^>]*>/g,"").slice(0,420),
    studio:(m.studios&&m.studios.nodes&&m.studios.nodes[0]&&m.studios.nodes[0].name)||null,
    trailer:(m.trailer&&m.trailer.site==="youtube")?m.trailer.id:null,
    links:(m.externalLinks||[]).filter(l=>l.type==="STREAMING").slice(0,4).map(l=>({site:l.site,url:l.url})),
    // full, unsliced list — `links` is capped at 4 for display and can't be used to filter
    sites:(m.externalLinks||[]).filter(l=>l.type==="STREAMING").map(l=>l.site),
    // English-availability signal: on a Western streaming platform, OR a streaming link explicitly tagged English
    en:(m.externalLinks||[]).some(l=>l.type==="STREAMING"&&(WESTERN_SITES.includes(l.site)||(l.language&&/english/i.test(l.language))))
  };
}

const CACHE_TTL=30*60*1000;
async function fetchPool(kind,page){
  const gsel=(typeof deckGenres!=="undefined"&&deckGenres.length)?deckGenres:[];
  const gkey=gsel.length?"_g"+gsel.slice().sort().join("-"):"";
  const key="cache2_"+kind+"_"+(page||1)+gkey; // cache2: post-ecchi-filter pools
  const hit=store.get(key,null);
  if(hit&&Date.now()-hit.t<CACHE_TTL)return hit.d;
  const gFilter=gsel.length?`,genre_in:[${gsel.map(g=>`"${g}"`).join(",")}]`:"";
  const {s,y}=curSeason();
  let args;
  switch(kind){
    case "trending": args=`sort:TRENDING_DESC`; break;
    case "season":   args=`sort:POPULARITY_DESC,season:${s},seasonYear:${y}`; break;
    case "recent":   args=`sort:POPULARITY_DESC,seasonYear_greater:${y-2},status_in:[FINISHED,RELEASING]`; break;
    case "popular":  args=`sort:POPULARITY_DESC`; break;
    case "gems":     args=`sort:SCORE_DESC,popularity_lesser:80000,averageScore_greater:74`; break;
    default: throw new Error("bad pool "+kind);
  }
  // genre_not_in Ecchi: AniList's own docs warn ecchi is NOT flagged isAdult and has caused App Store problems
  const q=`query($p:Int){Page(page:$p,perPage:25){media(${args},type:ANIME,isAdult:false,genre_not_in:["Ecchi","Hentai"]${gFilter},status_not:NOT_YET_RELEASED,countryOfOrigin:JP){${MEDIA_FIELDS}}}}`;
  const data=await gql(q,{p:page||1});
  const list=(data.Page.media||[]).map(trimMedia);
  store.set(key,{t:Date.now(),d:list});
  return list;
}

/* full detail (characters + recs + tags) — session-cached in memory, not localStorage (too big) */
const _detailCache=new Map();
async function fetchDetail(id){
  if(_detailCache.has(id))return _detailCache.get(id);
  const q=`query($id:Int){Media(id:$id){${MEDIA_FIELDS}
    tags{name rank isGeneralSpoiler isAdult}
    relations{edges{relationType(version:2) node{id type title{english romaji} coverImage{large extraLarge} averageScore seasonYear format status episodes}}}
    characters(sort:[ROLE,RELEVANCE],perPage:10){edges{role node{id name{full} image{large} gender age description(asHtml:false)}}}
    recommendations(sort:RATING_DESC,perPage:10){nodes{mediaRecommendation{id title{english romaji} coverImage{large extraLarge} averageScore seasonYear format genres}}}
  }}`;
  const data=await gql(q,{id});
  const m=data.Media;
  const detail={
    ...trimMedia(m),
    tags:(m.tags||[]).filter(t=>!t.isAdult&&!t.isGeneralSpoiler&&t.rank>=60).slice(0,8).map(t=>t.name),
    characters:(m.characters&&m.characters.edges||[]).map(e=>({
      id:e.node.id,name:e.node.name.full,role:e.role,img:e.node.image&&e.node.image.large,
      gender:e.node.gender,age:e.node.age,
      desc:(e.node.description||"").replace(/<[^>]*>/g,"").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/[_~]/g,"").trim()
    })),
    recs:(m.recommendations&&m.recommendations.nodes||[]).map(n=>n.mediaRecommendation).filter(Boolean).map(trimMedia),
    relations:parseRelations(m.relations)
  };
  _detailCache.set(id,detail);
  return detail;
}

/* Series relations — sequels/prequels/side stories.
   Chronological-ish order so the row reads like a timeline: what came before,
   then this show's continuations, then the side material. ANIME only — the
   graph also returns the source manga/novel, which isn't watchable. */
const REL_ORDER=["PREQUEL","PARENT","SEQUEL","SIDE_STORY","SPIN_OFF","ALTERNATIVE","SUMMARY"];
const REL_LABEL={PREQUEL:"Prequel",PARENT:"Parent story",SEQUEL:"Sequel",SIDE_STORY:"Side story",
                 SPIN_OFF:"Spin-off",ALTERNATIVE:"Alt version",SUMMARY:"Recap"};
function parseRelations(rel){
  return (rel&&rel.edges||[])
    .filter(e=>e&&e.node&&e.node.type==="ANIME"&&REL_ORDER.includes(e.relationType))
    .map(e=>({
      id:e.node.id,title:e.node.title,coverImage:e.node.coverImage,
      averageScore:e.node.averageScore,seasonYear:e.node.seasonYear,
      format:e.node.format,status:e.node.status,episodes:e.node.episodes,
      rel:e.relationType,relLabel:REL_LABEL[e.relationType]
    }))
    .sort((a,b)=>{
      const d=REL_ORDER.indexOf(a.rel)-REL_ORDER.indexOf(b.rel);
      return d||((a.seasonYear||0)-(b.seasonYear||0));
    });
}

/* next-airing episode for a set of ids (for the Watching list) — always fresh, never cached */
async function fetchNextAiring(ids){
  if(!ids||!ids.length)return {};
  const q=`query($ids:[Int]){Page(perPage:50){media(id_in:$ids,type:ANIME){id status episodes nextAiringEpisode{airingAt episode}}}}`;
  try{
    const d=await gql(q,{ids});
    const map={};(d.Page.media||[]).forEach(m=>{map[m.id]={status:m.status,eps:m.episodes,next:m.nextAiringEpisode?{at:m.nextAiringEpisode.airingAt,ep:m.nextAiringEpisode.episode}:null};});
    return map;
  }catch(e){return {};}
}

/* popular anime in a single genre — for the Discover browse shelves.
   country (JP/CN/KR) optional; when set, pulls that country's animation. */
async function fetchGenre(genre,country,page){
  const cc=country||"";
  const key="cache_g4_"+genre+"_"+cc+"_"+(page||1);
  const hit=store.get(key,null);
  if(hit&&Date.now()-hit.t<CACHE_TTL)return hit.d;
  const cf=country?`,countryOfOrigin:${country}`:"";
  const q=`query($p:Int){Page(page:$p,perPage:24){media(sort:POPULARITY_DESC,genre_in:["${genre}"]${cf},type:ANIME,isAdult:false,genre_not_in:["Ecchi","Hentai"],status_not:NOT_YET_RELEASED){${MEDIA_FIELDS}}}}`;
  const data=await gql(q,{p:page||1});
  const list=(data.Page.media||[]).map(trimMedia);
  store.set(key,{t:Date.now(),d:list});
  return list;
}

/* the FULL current season — every anime coming out, all statuses. country optional. */
async function fetchSeason(page,country){
  const {s,y}=curSeason();
  const cc=country||"";
  const key="cache_season2_"+s+y+"_"+cc+"_"+(page||1);
  const hit=store.get(key,null);
  if(hit&&Date.now()-hit.t<CACHE_TTL)return hit.d;
  const cf=country?`,countryOfOrigin:${country}`:"";
  const q=`query($p:Int){Page(page:$p,perPage:50){media(season:${s},seasonYear:${y},type:ANIME,sort:POPULARITY_DESC,isAdult:false,genre_not_in:["Ecchi","Hentai"]${cf}){${MEDIA_FIELDS}}}}`;
  const data=await gql(q,{p:page||1});
  const list=(data.Page.media||[]).map(trimMedia);
  store.set(key,{t:Date.now(),d:list});
  return list;
}
function seasonLabel(){const {s,y}=curSeason();return s.charAt(0)+s.slice(1).toLowerCase()+" "+y;}

/* Best of a given year.
   AniList's default POPULARITY_DESC is really "how many people logged it
   recently", which structurally buries older titles — a 2006 show scoring 81
   loses to anything current. Sorting by SCORE inside a fixed year removes the
   recency bias entirely, and the `gems` lens additionally caps popularity so
   well-loved but low-reach shows surface instead of the usual canon. */
const YEAR_LENS={
  popular:{sort:"POPULARITY_DESC",extra:""},
  rated:  {sort:"SCORE_DESC",     extra:",averageScore_greater:60"},
  gems:   {sort:"SCORE_DESC",     extra:",averageScore_greater:70,popularity_lesser:30000"}
};
async function fetchYear(year,lens,page){
  const L=YEAR_LENS[lens]||YEAR_LENS.rated;
  const key="cache_year_"+year+"_"+(lens||"rated")+"_"+(page||1);
  const hit=store.get(key,null);
  if(hit&&Date.now()-hit.t<CACHE_TTL)return hit.d;
  const q=`query($p:Int,$y:Int){Page(page:$p,perPage:30){media(seasonYear:$y,type:ANIME,isAdult:false,
    sort:${L.sort},genre_not_in:["Ecchi","Hentai"]${L.extra}){${MEDIA_FIELDS}}}}`;
  const data=await gql(q,{p:page||1,y:year});
  const list=(data.Page.media||[]).map(trimMedia);
  store.set(key,{t:Date.now(),d:list});
  return list;
}

/* weekly airing calendar — every episode airing in the next 7 days, with exact air time */
async function fetchSchedule(weekOffset){
  const off=weekOffset||0;                          // 0 = next 7 days, -1 = last week, +1 = week after
  const base=Math.floor(Date.now()/1000);
  const now=base+off*7*86400, end=now+7*86400;
  const key="cache_sched3_"+off+"_"+Math.floor(base/3600);   // refresh hourly so countdowns stay honest
  const hit=store.get(key,null);
  if(hit&&Date.now()-hit.t<CACHE_TTL)return hit.d;
  const out=[];
  for(let p=1;p<=5;p++){
    const q=`query($s:Int,$e:Int,$p:Int){Page(page:$p,perPage:50){pageInfo{hasNextPage} airingSchedules(airingAt_greater:$s,airingAt_lesser:$e,sort:TIME){airingAt episode media{id title{english romaji} coverImage{large extraLarge} format countryOfOrigin averageScore popularity genres isAdult externalLinks{site type}}}}}`;
    let data;try{data=await gql(q,{s:now,e:end,p});}catch(e){break;}
    (data.Page.airingSchedules||[]).forEach(a=>{
      const md=a.media;if(!md||md.isAdult)return;
      const g=md.genres||[];if(g.includes("Ecchi")||g.includes("Hentai"))return;
      const sites=(md.externalLinks||[]).filter(l=>l.type==="STREAMING").map(l=>l.site);
      out.push({at:a.airingAt,ep:a.episode,m:{
        id:md.id,title:md.title,coverImage:md.coverImage,format:md.format,
        country:md.countryOfOrigin,averageScore:md.averageScore,popularity:md.popularity,genres:g,sites,
        en:sites.some(s=>WESTERN_SITES.includes(s))
      }});
    });
    if(!data.Page.pageInfo||!data.Page.pageInfo.hasNextPage)break;
  }
  store.set(key,{t:Date.now(),d:out});
  return out;
}

/* ---- sub/dub, via the animeschedule.net proxy ----
   AniList has no dub/sub field at all, and animeschedule.net publishes no AniList
   id, so the two are joined on normalised titles. That lands ~89% on a typical
   week. The 11% are genuine alias differences (Detective Conan / Case Closed).
   RULE: an unmatched title means UNKNOWN, never "no dub" — we never assert
   absence from a failed join. Everything degrades to today's behaviour when the
   proxy isn't running, which is the normal case for most users. */
const AS_PROXY=store.get("asProxy","http://localhost:8787");
const AS_ROMAN={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
function asKey(s){
  if(!s)return "";
  let t=String(s).toLowerCase().replace(/[’'`´]/g,"")
    .replace(/\(tv\)|\(dub\)|\(sub\)/g," ")
    .replace(/[^a-z0-9]+/g," ").trim();
  t=t.replace(/\b(\d+)(st|nd|rd|th)\b/g,"$1");          // "3rd season" -> "3"
  t=t.replace(/\b(season|cour|part)\s*(\d+)\b/g,"$2");  // "season 3"   -> "3"
  t=t.replace(/\b(\d+)\s*(season|cour|part)\b/g,"$1");
  t=t.replace(/\b([ivx]+)\b$/,(m,r)=>AS_ROMAN[r]!==undefined?String(AS_ROMAN[r]):m);
  t=t.replace(/\b(final|the)\b/g," ");
  return t.replace(/\s+/g," ").trim();
}
let _asIdx=null, _asTried=false;
async function fetchDubSub(){
  if(_asIdx||_asTried)return _asIdx;
  _asTried=true;
  const cached=store.get("cache_dubsub",null);
  if(cached&&Date.now()-cached.t<CACHE_TTL){_asIdx=new Map(cached.d);return _asIdx;}
  try{
    const grab=async kind=>{
      const c=new AbortController(); const to=setTimeout(()=>c.abort(),4000);
      try{const r=await fetch(AS_PROXY+"/timetables/"+kind,{signal:c.signal});
        return r.ok?await r.json():[];}finally{clearTimeout(to);}
    };
    const [sub,dub]=await Promise.all([grab("sub"),grab("dub")]);
    if(!sub.length&&!dub.length){_asIdx=null;return null;}
    const idx=new Map();
    const add=(m,kind)=>[m.english,m.romaji,m.title,m.native].forEach(n=>{
      const k=asKey(n);if(!k)return;
      const cur=idx.get(k)||{sub:false,dub:false};cur[kind]=true;idx.set(k,cur);
    });
    sub.forEach(m=>add(m,"sub"));dub.forEach(m=>add(m,"dub"));
    _asIdx=idx;
    store.set("cache_dubsub",{t:Date.now(),d:[...idx]});
    return idx;
  }catch(e){_asIdx=null;return null;}   // proxy down → app behaves exactly as before
}
/* stamps .audio={sub,dub} on entries we could match; leaves it undefined otherwise */
function annotateDubSub(entries,idx){
  if(!idx)return entries;
  entries.forEach(e=>{
    const m=e.m||e;
    const t=m.title||{};
    const hit=[t.english,t.romaji,m.titleText].map(asKey).filter(Boolean)
      .map(k=>idx.get(k)).find(Boolean);
    if(hit)m.audio=hit;
  });
  return entries;
}

/* ---- TMDB poster upgrade ----
   Only used where it can actually be seen: the swipe card and Rank mode fill
   the screen, so AniList's 460px cover upscales ~2x there. A 144px shelf
   thumbnail already has 3x the pixels it needs, so those are left alone —
   fewer lookups, identical visible result.

   Everything degrades to AniList art: proxy down, no key, no match, or the
   user reverted this title. The art can fail to improve; it can never be
   wrong-but-confident. */
const TMDB_IMG="https://image.tmdb.org/t/p/w780";
const TMDB_TTL=7*24*60*60*1000;
let _tmdbCache=store.get("cache_tmdb",{});
let tmdbOff=store.get("tmdbOff",{});        // anilistId -> true = user reverted it
let _tmdbDead=false;                         // proxy unreachable: stop asking
function tmdbRevert(id){tmdbOff[id]=true;store.set("tmdbOff",tmdbOff);}
function tmdbAllowed(id){return !tmdbOff[id];}
/* true only if we actually swapped this title's art — drives the revert prompt */
function tmdbShowingFor(id){const c=_tmdbCache[id];return !!(c&&c.p&&tmdbAllowed(id));}
async function tmdbPosterFor(m){
  if(_tmdbDead||!m||!m.id||!tmdbAllowed(m.id))return null;
  const hit=_tmdbCache[m.id];
  if(hit&&Date.now()-hit.t<TMDB_TTL)return hit.p?TMDB_IMG+hit.p:null;
  const en=(m.title&&m.title.english)||m.title||"";
  const ro=(m.title&&m.title.romaji)||"";
  const yr=m.seasonYear||0;
  if(!en&&!ro)return null;
  try{
    const c=new AbortController(),to=setTimeout(()=>c.abort(),5000);
    const u=AS_PROXY+"/tmdb/find?t="+encodeURIComponent(en||ro)+
            "&a="+encodeURIComponent(ro||en)+"&y="+yr;
    const r=await fetch(u,{signal:c.signal});clearTimeout(to);
    if(!r.ok)return null;
    const j=await r.json();
    if(j.off){_tmdbDead=true;return null;}   // no key configured — stop trying
    _tmdbCache[m.id]={p:j.poster||null,t:Date.now()};
    store.set("cache_tmdb",_tmdbCache);
    return j.poster?TMDB_IMG+j.poster:null;
  }catch(e){_tmdbDead=true;return null;}      // proxy not running
}
/* Apply a background image ONLY if it's sharper than what's already there.
   Several upgrades can be in flight for one element (stored thumb -> 460px ->
   TMDB 780px) and they finish in whatever order the network decides — without
   this, a slow small image lands last and undoes the big one. Resolution only
   ever goes up. Call resetImgLevel() when the element starts showing a
   different title, or the old width would block the new one. */
function resetImgLevel(el){if(el)el.dataset.imgw=0;}
function applyBestImage(el,url,guard){
  if(!el||!url)return;
  const pre=new Image();
  pre.onload=()=>{
    if(guard&&!guard())return;
    if(pre.naturalWidth<=+(el.dataset.imgw||0))return;   // never downgrade
    el.dataset.imgw=pre.naturalWidth;
    el.style.backgroundImage=`url('${url}')`;
  };
  pre.src=url;
}
/* swap a background-image element up to the TMDB poster once it loads.
   `stillCurrent` guards against a late response landing on the wrong card. */
function tmdbUpgrade(el,m,stillCurrent){
  if(!el||!m)return;
  tmdbPosterFor(m).then(url=>{if(url)applyBestImage(el,url,stillCurrent);}).catch(()=>{});
}

async function searchAnime(qs){
  const q=`query($q:String){Page(page:1,perPage:12){media(search:$q,type:ANIME,isAdult:false){${MEDIA_FIELDS}}}}`;
  const data=await gql(q,{q:qs});
  return (data.Page.media||[]).map(trimMedia);
}
