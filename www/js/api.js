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
    relations{edges{relationType(version:2) node{id type title{english romaji} coverImage{large} averageScore seasonYear format status episodes}}}
    characters(sort:[ROLE,RELEVANCE],perPage:10){edges{role node{id name{full} image{medium} gender age description(asHtml:false)}}}
    recommendations(sort:RATING_DESC,perPage:10){nodes{mediaRecommendation{id title{english romaji} coverImage{large} averageScore seasonYear format genres}}}
  }}`;
  const data=await gql(q,{id});
  const m=data.Media;
  const detail={
    ...trimMedia(m),
    tags:(m.tags||[]).filter(t=>!t.isAdult&&!t.isGeneralSpoiler&&t.rank>=60).slice(0,8).map(t=>t.name),
    characters:(m.characters&&m.characters.edges||[]).map(e=>({
      id:e.node.id,name:e.node.name.full,role:e.role,img:e.node.image&&e.node.image.medium,
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
  const key="cache_g3_"+genre+"_"+cc+"_"+(page||1);
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
  const key="cache_season_"+s+y+"_"+cc+"_"+(page||1);
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

/* weekly airing calendar — every episode airing in the next 7 days, with exact air time */
async function fetchSchedule(){
  const now=Math.floor(Date.now()/1000), end=now+7*86400;
  const key="cache_sched_"+Math.floor(now/3600);   // refresh hourly so countdowns stay honest
  const hit=store.get(key,null);
  if(hit&&Date.now()-hit.t<CACHE_TTL)return hit.d;
  const out=[];
  for(let p=1;p<=5;p++){
    const q=`query($s:Int,$e:Int,$p:Int){Page(page:$p,perPage:50){pageInfo{hasNextPage} airingSchedules(airingAt_greater:$s,airingAt_lesser:$e,sort:TIME){airingAt episode media{id title{english romaji} coverImage{large} format countryOfOrigin averageScore genres isAdult externalLinks{site type}}}}}`;
    let data;try{data=await gql(q,{s:now,e:end,p});}catch(e){break;}
    (data.Page.airingSchedules||[]).forEach(a=>{
      const md=a.media;if(!md||md.isAdult)return;
      const g=md.genres||[];if(g.includes("Ecchi")||g.includes("Hentai"))return;
      out.push({at:a.airingAt,ep:a.episode,m:{
        id:md.id,title:md.title,coverImage:md.coverImage,format:md.format,
        country:md.countryOfOrigin,averageScore:md.averageScore,genres:g,
        en:(md.externalLinks||[]).some(l=>l.type==="STREAMING"&&WESTERN_SITES.includes(l.site))
      }});
    });
    if(!data.Page.pageInfo||!data.Page.pageInfo.hasNextPage)break;
  }
  store.set(key,{t:Date.now(),d:out});
  return out;
}

async function searchAnime(qs){
  const q=`query($q:String){Page(page:1,perPage:12){media(search:$q,type:ANIME,isAdult:false){${MEDIA_FIELDS}}}}`;
  const data=await gql(q,{q:qs});
  return (data.Page.media||[]).map(trimMedia);
}
