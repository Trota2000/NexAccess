const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const palettes=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../source/design-tokens.json'),'utf8'));
const lum=hex=>{const v=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const [mode,c] of Object.entries(palettes)){
 test(`${mode}: text and semantic status contrast meets AA`,()=>{
  for(const [ink,bg] of [['ink','card'],['ink','bg'],['muted','card'],['muted','bg'],['onPrimary','primary'],['activeText','active'],['success','successBg'],['error','errorBg'],['warning','warningBg'],['info','infoBg']]) assert.ok(contrast(c[ink],c[bg])>=4.5,`${ink}/${bg}: ${contrast(c[ink],c[bg])}`);
 });
 test(`${mode}: control and focus boundaries meet 3:1`,()=>{for(const ink of ['controlBorder','focus'])assert.ok(contrast(c[ink],c.input)>=3,ink)});
}
test('prepaint template selects only the saved visual preference or system theme',()=>{
 const vm=require('node:vm');const script=fs.readFileSync(path.resolve(__dirname,'../theme-init.js'),'utf8');
 for(const saved of ['dark','light',null,'invalid']){
  const document={documentElement:{dataset:{},style:{}}};const localStorage={getItem:()=>saved};
  vm.runInNewContext(script,{document,localStorage,window:{matchMedia:()=>({matches:true})}});
  assert.equal(document.documentElement.dataset.theme,saved==='light'?'light':'dark');
 }
 const document={documentElement:{dataset:{},style:{}}};vm.runInNewContext(script,{document,localStorage:{getItem(){throw Error('blocked')}},window:{matchMedia:()=>({matches:false})}});assert.equal(document.documentElement.dataset.theme,'light');
});
