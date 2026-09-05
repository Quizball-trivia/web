const sharp=require('sharp');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'../..');
const manifest=require(path.join(root,'docs/store-collection/manifest.json'));
(async()=>{
const wanted=process.argv[2];const items=manifest.filter(p=>(!wanted||p.slot===wanted)&&fs.existsSync(path.join(root,'public/assets/store/collection',p.id+'.webp')));
const tiles=[];for(let i=0;i<items.length;i++){
 const p=items[i],left=i%6*190,top=Math.floor(i/6)*205;
 const img=await sharp(path.join(root,'public/assets/store/collection',p.id+'.webp')).resize(170,166,{fit:'contain',background:'#15292f'}).png().toBuffer();
 const label=Buffer.from(`<svg width="190" height="30"><text x="95" y="20" text-anchor="middle" font-family="sans-serif" font-size="12" fill="white">${p.name.replaceAll('&','&amp;')}</text></svg>`);
 tiles.push({input:img,left:left+10,top:top+8},{input:label,left,top:top+175});
}
if(items.length)await sharp({create:{width:1140,height:Math.ceil(items.length/6)*205,channels:3,background:'#15292f'}}).composite(tiles).png().toFile(path.join(root,'docs/store-collection',`contact-${wanted||'all'}.png`));
console.log(items.length+' in contact sheet');
})();
