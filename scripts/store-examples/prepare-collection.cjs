const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const manifest = require(path.join(root, 'docs/store-collection/manifest.json'));
async function convert(item) {
  const input = path.join(root, 'docs/store-collection/source', item.id+'.png');
  const output = path.join(root, 'public/assets/store/collection', item.id+'.webp');
  if (!fs.existsSync(input)) return false;
  if (fs.existsSync(output) && fs.statSync(output).mtimeMs > fs.statSync(input).mtimeMs) return true;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height;
  let x0=w,y0=h,x1=-1,y1=-1,removed=0;
  for(let i=0;i<w*h;i++) {
    const k=i*4,r=data[k],g=data[k+1],b=data[k+2];
    if ((r>100 && b>100 && g<Math.min(r,b)*0.72) || data[k+3]===0) {
      data[k]=0;data[k+1]=0;data[k+2]=0;data[k+3]=0;removed++;
    } else {const x=i%w,y=Math.floor(i/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  }
  if(x1<x0 || removed<w*h*.05) throw new Error(item.id+': background not isolated');
  const png=await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
  let pipeline=sharp(png).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1});
  if(item.slot==='jersey')pipeline=pipeline.resize(708,606,{fit:'fill'});
  else if(item.id==='earwear_headphones')pipeline=pipeline.resize(600,500,{fit:'fill'});
  else pipeline=pipeline.resize({width:600});
  await pipeline.webp({lossless:true}).toFile(output);
  return true;
}
(async()=>{
 fs.mkdirSync(path.join(root,'public/assets/store/collection'),{recursive:true});
 let done=0;
 for(const item of manifest) {if(await convert(item)) done++;}
 console.log(`${done}/${manifest.length} assets ready`);
})();
