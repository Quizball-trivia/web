// Convert the generated concepts into tightly cropped web overlays.
// The image generator returned an opaque checkerboard even after an alpha edit.
// Remove only neutral light background connected to the canvas edge; keep ivory hoops.
const sharp = require('sharp');
const path = require('path');
async function prepare(input, output, jersey) {
  const {data, info} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info;
  const seen=new Uint8Array(w*h), queue=new Int32Array(w*h); let end=0;
  const background=i=>{const r=data[i*4],g=data[i*4+1],b=data[i*4+2]; return Math.min(r,g,b)>180 && Math.max(r,g,b)-Math.min(r,g,b)<15;};
  const add=i=>{if(!seen[i] && background(i)){seen[i]=1;queue[end++]=i;}};
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}
  for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  for(let start=0;start<end;start++){const i=queue[start],x=i%w,y=Math.floor(i/w); if(x)add(i-1);if(x<w-1)add(i+1);if(y)add(i-w);if(y<h-1)add(i+w);}
  // The ivory torso panels touch the exterior and are close to the checkerboard
  // in color. Preserve the torso interior using the inspected source silhouette.
  if (jersey) for (let y=525;y<=1086;y++) for (let x=278;x<=1026;x++) seen[y*w+x]=0;
  let x0=w,y0=h,x1=0,y1=0;
  for(let i=0;i<w*h;i++){if(seen[i]){data[i*4+3]=0;}else{const x=i%w,y=Math.floor(i/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
  const intermediate=await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
  let pipeline=sharp(intermediate).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1});
  pipeline=jersey?pipeline.resize(708,606,{fit:'fill'}):pipeline.resize({width:600});
  await pipeline.webp({lossless:true}).toFile(output);
  console.log(path.basename(output),await sharp(output).metadata().then(m=>({width:m.width,height:m.height,alpha:m.hasAlpha})), 'background pixels',end);
}
const base=path.resolve(__dirname, '../../docs/store-examples/source') + '/';
Promise.all([
prepare(base+'jersey_celtic_example.png','public/assets/store/jersey_celtic.webp',true),
prepare(base+'hair_short_twists_example.png','public/assets/store/hair_short_twists.webp',false),
prepare(base+'accessory_sport_sunglasses_example.png','public/assets/store/accessory_glasses_sport_blue.webp',false),
]);
