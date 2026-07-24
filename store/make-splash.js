/* Generates assets/splash.png + assets/splash-dark.png — 2732x2732 launch screen
   (dark gradient, centered mark at ~14% scale). Pure Node, no dependencies. */
const zlib=require("zlib"),fs=require("fs"),path=require("path");
const W=2732,H=2732,cx=W/2,cy=H/2;
const px=Buffer.alloc(W*H*3);
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const BG1=hex("#241a3a"),BG2=hex("#0d0b14"),G1=hex("#8b5cf6"),G2=hex("#ec4899");
const lerp=(a,b,t)=>a+(b-a)*t;
const mix=(c1,c2,t)=>[lerp(c1[0],c2[0],t),lerp(c1[1],c2[1],t),lerp(c1[2],c2[2],t)];
const clamp01=v=>v<0?0:v>1?1:v;
const S=0.38; // mark scale relative to the 1024 design
const arcs=[{r:276*S,w:52*S,op:.9},{r:132*S,w:52*S,op:.7}];
const dotR=40*S, gx0=cx-300*S, gx1=cx+300*S;
function angleAt(x,y){let a=Math.atan2(-(y-cy),x-cx)*180/Math.PI;if(a<0)a+=360;return a;}
function arcCoverage(x,y,r,w){
  const d=Math.hypot(x-cx,y-cy);
  let cov=clamp01(((w/2+0.75)-Math.abs(d-r))/1.5);
  if(cov>0){const a=angleAt(x,y);if(a>0.001&&a<89.999)cov=0;}
  const capT=clamp01(((w/2+0.75)-Math.hypot(x-cx,y-(cy-r)))/1.5);
  const capR=clamp01(((w/2+0.75)-Math.hypot(x-(cx+r),y-cy))/1.5);
  return Math.max(cov,capT,capR);
}
for(let y=0;y<H;y++){
  for(let x=0;x<W;x++){
    let c=mix(BG1,BG2,clamp01((x+y)/(W+H)));
    // only compute mark math near the center (perf)
    if(Math.abs(x-cx)<340&&Math.abs(y-cy)<340){
      const stroke=mix(G1,G2,clamp01((x-gx0)/(gx1-gx0)));
      for(const a of arcs){const cov=arcCoverage(x,y,a.r,a.w)*a.op;if(cov>0)c=mix(c,stroke,cov);}
      const dcov=clamp01(((dotR+0.75)-Math.hypot(x-cx,y-cy))/1.5);
      if(dcov>0)c=mix(c,G2,dcov);
    }
    const i=(y*W+x)*3;px[i]=c[0]|0;px[i+1]=c[1]|0;px[i+2]=c[2]|0;
  }
}
const crcTable=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcTable[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type,"ascii"),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td));return Buffer.concat([len,td,crc]);}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;
const raw=Buffer.alloc(H*(1+W*3));
for(let y=0;y<H;y++){raw[y*(1+W*3)]=0;px.copy(raw,y*(1+W*3)+1,y*W*3,(y+1)*W*3);}
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(raw,{level:9})),chunk("IEND",Buffer.alloc(0))]);
const dir=path.join(__dirname,"..","assets");fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,"splash.png"),png);
fs.writeFileSync(path.join(dir,"splash-dark.png"),png);
console.log("wrote assets/splash.png + splash-dark.png",png.length,"bytes");
