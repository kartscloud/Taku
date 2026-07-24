/* taku · static data: archetypes, tiers, avatars */
const ARCH={
  "Slice of Life":{base:"SLICE MONK",legend:"TAKU",color:"#a3e635",blurb:"You seek the quiet frames everyone else skips. Niche, patient, and completely unbothered by plot."},
  "Comedy":{base:"CLASS CLOWN",legend:"GAG GOBLIN",color:"#fbbf24",blurb:"Here for the bits. Your watch history is a laugh track with occasional feelings."},
  "Action":{base:"SCRAPPER",legend:"BERSERKER",color:"#ef4444",blurb:"Dialogue is loading time between fights. You measure a show in power-ups."},
  "Adventure":{base:"WAYFARER",legend:"WORLDEATER",color:"#22c55e",blurb:"Give you a map and a party and you're gone. It's about the journey, and you took all of them."},
  "Fantasy":{base:"CONJURER",legend:"ARCHMAGE",color:"#8b5cf6",blurb:"Magic systems, another world, a truck-kun cameo. You never left the portal."},
  "Drama":{base:"EMOTER",legend:"TEARSMITH",color:"#38bdf8",blurb:"You watch to feel something, ideally devastating. Tissues are a rounding error."},
  "Romance":{base:"HOPELESS",legend:"HEARTBLEED",color:"#ec4899",blurb:"Two people, one misunderstanding, and you, screaming at the screen. Just confess already."},
  "Sci-Fi":{base:"TECHIE",legend:"SINGULARITY",color:"#06b6d4",blurb:"Timelines, cybernetics, existential dread. You'd read the whitepaper for a fictional reactor."},
  "Psychological":{base:"OVERTHINKER",legend:"MINDFLAYER",color:"#a855f7",blurb:"You don't watch anime, you interrogate it. Unreliable narrators are your comfort food."},
  "Horror":{base:"CREEP",legend:"REVENANT",color:"#dc2626",blurb:"The weirder and more cursed, the better. You sleep fine. Everyone else doesn't."},
  "Thriller":{base:"ON EDGE",legend:"PULSE",color:"#f97316",blurb:"You binge at 2am because stopping is not an option. Cliffhangers are a personal attack."},
  "Mystery":{base:"SLEUTH",legend:"CIPHER",color:"#eab308",blurb:"You solved it in episode two and you're insufferable about it. Respectfully."},
  "Supernatural":{base:"MEDIUM",legend:"HOLLOW",color:"#7c3aed",blurb:"Ghosts, curses, and vibes beyond the veil. You're on a first-name basis with the afterlife."},
  "Mecha":{base:"CADET",legend:"GHOST PILOT",color:"#3b82f6",blurb:"Big robot, bigger trauma. You know the difference between real and super robot and you WILL explain it."},
  "Music":{base:"LISTENER",legend:"MAESTRO",color:"#f472b6",blurb:"You're here for the insert song and the rooftop performance. The OST lives on your phone."},
  "Sports":{base:"BENCHWARMER",legend:"ACE",color:"#f59e0b",blurb:"You've cried over a fictional volleyball match. Effort, rivals, and the roar of the crowd."},
  "Ecchi":{base:"PATRICIAN",legend:"CONNOISSEUR",color:"#fb7185",blurb:"For the plot. We believe you. Truly."},
  "Mahou Shoujo":{base:"APPRENTICE",legend:"STARCASTER",color:"#e879f9",blurb:"Transformation sequences and emotional damage in equal measure. Sparkles hide the trauma."},
  _default:{base:"DRIFTER",legend:"WANDERER",color:"#8b5cf6",blurb:"Your taste refuses a single box. A little of everything, loyal to nothing."}
};
const TIERS=[["ASCENDED",15000],["ELITE",6000],["VETERAN",2000],["ADEPT",500],["ROOKIE",0]];
const LEGEND_TIERS=["VETERAN","ELITE","ASCENDED"];
const TIER_ORDER={S:0,A:1,B:2,C:3,D:4};
const TIER_COLOR={S:"var(--s)",A:"var(--a)",B:"var(--b)",C:"var(--c)",D:"var(--d)"};
const AVATARS=["🍥","🦊","👺","🌸","🗡️","👁️","🐉","🌙","⚡","🍜","🎐","🥷","🔮","🌊","🎴","🩸","😼","🧋"];
const OB_GENRES=["Action","Adventure","Comedy","Drama","Fantasy","Romance","Sci-Fi","Slice of Life","Psychological","Horror","Thriller","Mystery","Supernatural","Mecha","Sports"];

/* icon system — single source of truth, 24px grid, 2px stroke, round caps (HIG-consistent) */
const ICON_PATHS={
  deck:'<path d="M7 2h10"/><path d="M5 6h14"/><rect x="3" y="10" width="18" height="12" rx="2"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  trophy:'<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  sparkles:'<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/>',
  leaf:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  flame:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  gem:'<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
  play:'<polygon points="6 3 20 12 6 21 6 3"/>',
  rotate:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  arrowR:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowL:'<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  arrowU:'<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  tap:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11.2 12H12v4h.8"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
  download:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  upload:'<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
  filter:'<path d="M3 4h18l-7 8v6l-4 2v-8Z"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  compass:'<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  cards:'<rect x="3" y="5" width="14" height="16" rx="2"/><path d="M7 3h10a2 2 0 0 1 2 2v12"/>'
};

/* Western streaming platforms = reliable "watchable in English" signal.
   (AniList exposes streaming SITES but not dub/sub audio tracks, so platform is the honest proxy.) */
const WESTERN_SITES=["Crunchyroll","Funimation","Netflix","Hulu","HIDIVE","Adult Swim","Amazon Prime Video","Disney Plus","Max","HBO Max","VRV","Tubi","Hidive"];
function icSvg(n,fill){return '<svg class="ic" viewBox="0 0 24 24" fill="'+(fill?'currentColor':'none')+'" stroke="'+(fill?'none':'currentColor')+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICON_PATHS[n]+'</svg>';}

/* MBTI — AniList has no MBTI field, so this is a curated community-consensus starter set
   (keyed by lowercase full name), merged at runtime with any type tagged in a character's bio.
   Expand freely; unknown characters simply show no type rather than a fabricated one. */
const MBTI_CONSENSUS={
  "light yagami":"INTJ","l lawliet":"INTP","lawliet l":"INTP","lelouch lamperouge":"ENTJ","lelouch vi britannia":"ENTJ",
  "edward elric":"ENTP","alphonse elric":"INFP","roy mustang":"ENTJ",
  "mikasa ackerman":"ISTP","levi ackerman":"ISTP","eren yeager":"INFP","armin arlert":"INFP","erwin smith":"ENTJ","historia reiss":"ISFJ",
  "naruto uzumaki":"ENFP","sasuke uchiha":"ISTP","kakashi hatake":"INTP","itachi uchiha":"INFJ","shikamaru nara":"INTP",
  "monkey d luffy":"ESFP","roronoa zoro":"ISTP","nico robin":"INTJ","sanji":"ESFP",
  "spike spiegel":"ISTP","gon freecss":"ESFP","killua zoldyck":"INTP","kurapika":"INTJ","hisoka morow":"ENTP","chrollo lucilfer":"INTJ",
  "guts":"ISTP","griffith":"ENTJ",
  "shinji ikari":"INFP","asuka langley soryu":"ESTJ","rei ayanami":"ISTP",
  "okabe rintarou":"ENTP","rintarou okabe":"ENTP","kurisu makise":"INTJ",
  "lucy heartfilia":"ENFP","natsu dragneel":"ESFP",
  "yuuji itadori":"ESFP","megumi fushiguro":"INTJ","satoru gojo":"ENTP","nobara kugisaki":"ESTP","suguru geto":"ENTJ",
  "tanjirou kamado":"ISFJ","kamado tanjirou":"ISFJ","nezuko kamado":"ISFP","zenitsu agatsuma":"ISFP","inosuke hashibira":"ESTP","giyuu tomioka":"ISTP",
  "senku ishigami":"INTJ","ishigami senku":"INTJ",
  "ken kaneki":"INFP","kaneki ken":"INFP",
  "thorfinn":"ISTP","askeladd":"ENTP",
  "frieren":"INTP","fern":"ISTJ","stark":"ISFP","himmel":"ENFJ",
  "violet evergarden":"ISTJ","ai hoshino":"ESFP","aqua hoshino":"INTJ",
  "anya forger":"ESFP","loid forger":"ISTJ","yor forger":"ISFP",
  "denji":"ESFP","makima":"ENTJ","power":"ESTP","aki hayakawa":"ISTJ",
  "saitama":"ISTP","genos":"ISTJ","tatsumaki":"ESTJ",
  "ai":"ESFP"
};
const MBTI_TYPES=["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];
function mbtiFor(name,desc){
  const key=(name||"").toLowerCase().trim();
  if(MBTI_CONSENSUS[key])return MBTI_CONSENSUS[key];
  const m=(desc||"").match(new RegExp("\\b("+MBTI_TYPES.join("|")+")\\b","i")); // some bios are community-tagged
  return m?m[1].toUpperCase():null;
}
