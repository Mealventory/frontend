const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');const Module=require('node:module');
const mod=new Module('pantryExpiry');
mod._compile(ts.transpileModule(fs.readFileSync('src/lib/pantryExpiry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'pantryExpiry.cjs');
const {expiryDays,expiryGroup,expiryLabel,pantryView}=mod.exports;
const today='2026-09-30';
const item=(id,date,zone='fridge',name=id)=>({id,name,expiryDate:date,storageZone:zone,category:'Produce'});
test('groups date-only values at local calendar boundaries, without DST rounding',()=>{
 assert.equal(expiryDays('2026-11-02','2026-11-01'),1);
 assert.equal(expiryDays('2026-03-09','2026-03-08'),1);
 assert.equal(expiryDays('2026-10-01',today),1);
 assert.equal(expiryDays('2026-02-30',today),null);
 for(const value of [null,undefined,'','nonsense']) assert.equal(expiryDays(value,today),null);
 assert.deepEqual([-1,0,1,2,3,null].map(expiryGroup),['expired','today','soon','soon','all','all']);
 assert.equal(expiryLabel(-2),'Expired 2d ago');assert.equal(expiryLabel(null),'No date');
});
test('radar counts follow zone/category/search but not the selected urgency bucket',()=>{
 const items=[item('old','2026-09-29'),item('now',today),item('next','2026-10-02'),item('later','2026-10-03'),item('unknown',null),item('frozen',today,'freezer')];
 const result=pantryView(items,today,'fridge','All','','soon');
 assert.deepEqual(result.counts,{expired:1,today:1,soon:1});
 assert.deepEqual(result.items.map(i=>i.id),['next']);
 assert.equal(pantryView(items,today,'freezer').items.length,1);
 assert.equal(pantryView(items,today,'fridge','Dairy').items.length,0);
 assert.deepEqual(pantryView(items,today,'all','All',' NOW ').items.map(i=>i.id),['now','unknown']);
});
test('sorts dates before undated items, keeps inputs untouched and handles 50 items',()=>{
 const items=Array.from({length:50},(_,i)=>item(String(i),i%2?null:'2026-10-01',i%3?'pantry':'fridge'));
 const original=items.map(i=>i.id);
 const result=pantryView(items,today);
 assert.equal(result.items.length,50);
 assert.ok(result.items.slice(0,25).every(i=>i.expiryDate));
 assert.ok(result.items.slice(25).every(i=>i.expiryDate===null));
 assert.deepEqual(items.map(i=>i.id),original);
});
test('day rollover moves today into expired and undated food is never urgent',()=>{
 const items=[item('a',today),item('b',null)];
 assert.deepEqual(pantryView(items,today).counts,{expired:0,today:1,soon:0});
 assert.deepEqual(pantryView(items,'2026-10-01').counts,{expired:1,today:0,soon:0});
});
