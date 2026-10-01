const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
process.env.EXPO_PUBLIC_BACKEND_URL='https://backend.example';
const mod=new Module('sharedRecipes');
mod._compile(ts.transpileModule(fs.readFileSync('src/lib/householdSavedRecipes.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'sharedRecipes.cjs');
const {householdSavedRecipes}=mod.exports;
test('shared recipe requests authenticate household and preserve snapshots',async()=>{
 const original=global.fetch;
 const recipe={id:'saved-1',name:'Soup',steps:['Cook']};
 try {
  for(const action of ['list','save','remove']) {
   global.fetch=async(url,options)=>{
    assert.equal(url,`https://backend.example/api/v1/recipes/saved${action==='remove'?'/remove':''}`);
    assert.equal(options.headers.Authorization,'Bearer token');
    assert.equal(options.headers['X-Household-ID'],'home');
    assert.equal(options.method,{list:'GET',save:'PUT',remove:'POST'}[action]);
    if(action!=='list')assert.deepEqual(JSON.parse(options.body),recipe);
    return {ok:true,status:action==='list'?200:204,json:async()=>[recipe]};
   };
   assert.deepEqual(await householdSavedRecipes('token','home',action,action==='list'?undefined:recipe),action==='list'?[recipe]:[]);
  }
 }finally{global.fetch=original;}
});
test('shared recipe failures are not treated as an empty collection',async()=>{
 const original=global.fetch;
 try{
  for(const status of [401,403,500]){
   global.fetch=async()=>({ok:false,status});
   await assert.rejects(householdSavedRecipes('token','home'));
  }
 }finally{global.fetch=original;}
});
