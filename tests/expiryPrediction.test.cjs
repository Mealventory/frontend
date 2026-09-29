const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const ts=require('typescript'); const Module=require('node:module');
function harness(){
 const slots=[];let cursor=0; const effects=[];let resolve;
 const applied=[]; const calls=[];
 const pending=new Promise(r=>resolve=r);
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef(v){const i=cursor++;return slots[i]||=( {current:v});},useEffect(fn,deps){const i=cursor++;const key=JSON.stringify(deps);if(slots[i]?.key!==key){effects.push(()=>{slots[i]?.cleanup?.();slots[i]={key,cleanup:fn()};});}}};
 const mocks={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'react-native':{View:'View',Text:'Text'},'../atoms':{Button:'Button'},'./FormField':{FormField:'Field'},'@/src/context/AuthContext':{useAuth:()=>({session:{user:{id:'user'},access_token:'token'},household:{id:'home'}})},'@/src/lib/expiryDate':{normalizeExpiryDate:v=>v},'@/src/lib/expiryPredictionApi':{predictExpiry:async(...args)=>{calls.push(args);return pending;}}};
 const mod=new Module('prediction');mod.require=n=>{if(!(n in mocks))throw new Error(n);return mocks[n];};
 mod._compile(ts.transpileModule(fs.readFileSync('src/components/molecules/ExpiryPrediction.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,'prediction.cjs');
 let props={name:'Milk',zone:'fridge',value:'2030-01-01',onApply:v=>applied.push(v)};
 function walk(n){if(Array.isArray(n))return n.flatMap(walk);if(!n||typeof n!=='object')return[];return[n,...walk(n.props?.children)];}
 function render(change={}){props={...props,...change};cursor=0;const tree=mod.exports.ExpiryPrediction(props);while(effects.length)effects.shift()();return walk(tree);}
 return{render,resolve,applied,calls};
}
test('estimate only replaces a manual date on explicit apply',async()=>{
 const h=harness();h.render();
 const request=h.render().find(n=>n.props?.label==='Predict expiry').props.onPress();
 h.resolve({source:'model',predicted_expiry_date:'2026-10-05',explanation:'Estimated'});await request;
 assert.deepEqual(h.applied,[]);
 h.render().find(n=>n.props?.label==='Replace date with estimate').props.onPress();
 assert.deepEqual(h.applied,['2026-10-05']);
});
test('changed item details discard an in-flight prediction',async()=>{
 const h=harness();h.render();const request=h.render().find(n=>n.props?.label==='Predict expiry').props.onPress();
 h.render({name:'Rice'});
 h.resolve({source:'model',predicted_expiry_date:'2026-10-05',explanation:'Estimated'});await request;
 assert.equal(h.render().some(n=>n.props?.label==='Replace date with estimate'),false);
 assert.deepEqual(h.applied,[]);
 assert.equal(h.calls[0][3].aborted,true);
});
test('unavailable predictions keep manual date and never offer apply',async()=>{
 const h=harness();h.render();const request=h.render().find(n=>n.props?.label==='Predict expiry').props.onPress();
 h.resolve({source:'unavailable',predicted_expiry_date:null,explanation:'No baseline'});await request;
 assert.equal(h.render().some(n=>n.props?.label==='Replace date with estimate'),false);
 assert.deepEqual(h.applied,[]);
});
