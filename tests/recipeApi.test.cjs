const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
process.env.EXPO_PUBLIC_BACKEND_URL = 'https://backend.example';
const mod = new Module('recipeApi');
mod._compile(ts.transpileModule(fs.readFileSync('src/lib/recipeApi.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'recipeApi.cjs');
const {generateRecipes}=mod.exports;
test('recipe requests carry auth and household, preserve extras and priority ingredients',async()=>{
 const original=global.fetch;
 try {
  const controller=new AbortController();
  global.fetch=async(url,options)=>{
   assert.equal(url,'https://backend.example/api/v1/recipes/');
   assert.equal(options.headers['X-Household-ID'],'home-1');
   assert.equal(options.headers.Authorization,'Bearer token');
   assert.equal(options.signal,controller.signal);
   return {ok:true,json:async()=>({recipes:[{title:'Soup',uses_priority_items:['Carrot'],uses_other_items:['Onion'],optional_pantry_basics:['salt'],prep_time_minutes:5,cook_time_minutes:10,difficulty:'Easy',steps:['Cook'],waste_reduction_reason:'Use carrots soon'}]})};
  };
  const [recipe]=await generateRecipes('token','home-1',controller.signal);
  assert.deepEqual(recipe.uses,['Carrot','Onion','salt']);
  assert.deepEqual(recipe.priorityIngredients,['Carrot']);
  assert.deepEqual(recipe.missingIngredients,['salt']);
  assert.equal(recipe.match,67);
  assert.equal(recipe.time,'15 min');
 } finally {global.fetch=original;}
});
test('provider and access errors do not produce demo recipes',async()=>{
 const original=global.fetch;
 try {
  for(const status of [401,403,503,504]) {
   global.fetch=async()=>({ok:false,status});
   await assert.rejects(generateRecipes('token','home',new AbortController().signal));
  }
 } finally {global.fetch=original;}
});
