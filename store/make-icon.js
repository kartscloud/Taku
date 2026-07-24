/* Generates store/appstore-icon-1024.png — 1024x1024, RGB (no alpha), full-bleed
   (Apple applies the corner mask itself). Pure Node, no dependencies. */
const zlib=require("zlib"),fs=require("fs"),path=require("path");
const W=1024,H=1024,cx=512,cy=512;
const px=Buffer.alloc(W*H*3);

const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const BG1=hex("#241a3a"),BG2=hex("#0d0b14"),G1=hex("#8b5cf6"),G2=hex("#ec4899");
const lerp=(a,b,t)=>a+(b-a)*t;
const mix=(c1,c2,t)=>[lerp(c1[0],c2[0],t),lerp(c1[1],c2[1],t),lerp(c1[2],c2[2],t)];
const clamp01=v=>v<0?0:v>1?1:v;

// arcs: 270° sweep top->left->bottom->right (top-right quadrant open), like the app mark
const arcs=[{r:276,w:52,op:.9},{r:132,w:52,op:.7}];
const dotR=40;
function angleAt(x,y){let a=Math.atan2(-(y-cy),x-cx)*180/Math.PI;if(a<0)a+=360;return a;}
function arcCoverage(x,y,r,w){
  const d=Math.hypot(x-cx,y-cy);
  let cov=clamp01(((w/2+0.75)-Math.abs(d-r))/1.5);
  if(cov>0){const a=angleAt(x,y);if(a>0.001&&a<89.999)cov=0;}   // open quadrant
  // round caps at the two arc ends (top and right)
  const capT=clamp01(((w/2+0.75)-Math.hypot(x-cx,y-(cy-r)))/1.5);
  const capR=clamp01(((w/2+0.75)-Math.hypot(x-(cx+r),y-cy))/1.5);
  return Math.max(cov,capT,capR);
}
for(let y=0;y<H;y++){
  for(let x=0;x<W;x++){
    const t=clamp01((x+y)/(W+H));            // diagonal bg gradient
    let c=mix(BG1,BG2,t);
    const gt=clamp01(x/W);                    // horizontal stroke gradient
    const stroke=mix(G1,G2,gt);
    for(const a of arcs){
      const cov=arcCoverage(x,y,a.r,a.w)*a.op;
      if(cov>0)c=mix(c,stroke,cov);
    }
    const dcov=clamp01(((dotR+0.75)-Math.hypot(x-cx,y-cy))/1.5);
    if(dcov>0)c=mix(c,G2,dcov);
    const i=(y*W+x)*3;
    px[i]=Math.round(c[0]);px[i+1]=Math.round(c[1]);px[i+2]=Math.round(c[2]);
  }
}

// ---- minimal PNG encoder (color type 2 = truecolor, no alpha) ----
const crcTable=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcTable[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
function chunk(type,data){
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const td=Buffer.concat([Buffer.from(type,"ascii"),data]);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len,td,crc]);
}
const ihdr=Buffer.alloc(13);
ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
const raw=Buffer.alloc(H*(1+W*3));
for(let y=0;y<H;y++){raw[y*(1+W*3)]=0;px.copy(raw,y*(1+W*3)+1,y*W*3,(y+1)*W*3);}
const png=Buffer.concat([
  Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk("IHDR",ihdr),
  chunk("IDAT",zlib.deflateSync(raw,{level:9})),
  chunk("IEND",Buffer.alloc(0))
]);
const out=path.join(__dirname,"appstore-icon-1024.png");
fs.writeFileSync(out,png);
console.log("wrote",out,png.length,"bytes");
