const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');const Module=require('node:module');
function compile(path,mocks={}){const mod=new Module(path);mod.require=n=>{if(n in mocks)return mocks[n];throw Error(n);};mod._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,path);return mod.exports;}
const qty=compile('src/lib/quickQuantity.ts');
function harness(value='2 units'){
 const slots=[];const effects=[];let cursor=0;let resolve,reject;
 const pending=new Promise((a,b)=>{resolve=a;reject=b;});const calls=[];const transitions=[];let refreshes=0;let opens=0;
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],v=>{slots[i]=v;}];},useRef(v){const i=cursor++;return slots[i]??=( {current:v});},useEffect(fn,deps){const i=cursor++;const key=JSON.stringify(deps);if(slots[i]?.key!==key)effects.push(()=>{slots[i]?.cleanup?.();slots[i]={key,cleanup:fn()};});}};
 const api={updateItem:async(...args)=>{calls.push(args);return pending;},transitionItem:async(...args)=>{transitions.push(args);return pending;},refreshInventory:async()=>{refreshes++;}};
 const mocks={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'react-native':{View:'View',Text:'Text',TouchableOpacity:'Touch',ActivityIndicator:'Spinner'},'./FoodItemCard':{FoodItemCard:'Card'},'../atoms':{Button:'Button'},'../atoms/Icon':{Icon:'Icon'},'@/src/context/InventoryContext':{useInventory:()=>api},'@/src/lib/quickQuantity':qty};
 const Card=compile('src/components/domain/PantryItemCard.tsx',mocks).PantryItemCard;
 let item={id:'one',name:'Yogurt',quantity:value};
 const walk=n=>Array.isArray(n)?n.flatMap(walk):!n||typeof n!=='object'?[]:[n,...walk(n.props?.children)];
 function render(change={}){item={...item,...change};cursor=0;const nodes=walk(Card({item,today:'2026-09-30',onPress:()=>opens++}));while(effects.length)effects.shift()();return nodes;}
 return{render,resolve,reject,calls,transitions,get refreshes(){return refreshes;},get opens(){return opens;},dispose:()=>slots.forEach(v=>v?.cleanup?.())};
}
const press=(nodes,prefix)=>nodes.find(n=>n.props?.accessibilityLabel?.startsWith(prefix)).props.onPress();
const button=(nodes,label)=>nodes.find(n=>n.props?.label===label).props.onPress();
const flush=()=>new Promise(r=>setImmediate(r));
test('quantity parsing preserves fractions and units and clamps decrement to zero',()=>{
 assert.deepEqual(qty.parseQuantity('1.5 kg'),{amount:1.5,unit:'kg'});
 assert.equal(qty.adjustQuantity(1.5,-1),.5);assert.equal(qty.adjustQuantity(.5,-1),0);
 assert.equal(qty.adjustQuantity(1.001,1),2.001);
 for(const v of ['-1 units','0 units','unknown','1.1234 kg','Infinity g'])assert.equal(qty.parseQuantity(v),null);
});
test('optimistic quantity updates only quantity and blocks duplicate taps/detail while saving',async()=>{
 const h=harness();h.render();const nodes=h.render();press(nodes,'Increase');press(nodes,'Increase');
 assert.deepEqual(h.calls,[['one',{quantity:3}]]);
 const pending=h.render();assert.equal(pending.find(n=>n.type==='Card').props.item.quantity,'3 units');
 pending.find(n=>n.type==='Card').props.onPress();assert.equal(h.opens,0);
 assert.equal(pending.find(n=>n.props?.accessibilityLabel?.startsWith('Decrease')).props.disabled,true);
 h.resolve();await flush();
 assert.equal(h.render({quantity:'3 units'}).find(n=>n.type==='Card').props.item.quantity,'3 units');
 h.render().find(n=>n.type==='Card').props.onPress();assert.equal(h.opens,1);h.dispose();
});
test('failed update rolls back and refreshes server data with an error',async()=>{
 const h=harness();h.render();press(h.render(),'Decrease');h.reject(Error('Offline'));await flush();
 let nodes=h.render();assert.equal(nodes.find(n=>n.type==='Card').props.item.quantity,'2 units');
 assert.equal(nodes.find(n=>n.props?.accessibilityRole==='alert').props.children,'Offline');assert.equal(h.refreshes,1);
 nodes=h.render({quantity:'4 units'});assert.equal(nodes.find(n=>n.type==='Card').props.item.quantity,'4 units');h.dispose();
});
test('zero prompts without saving zero; cancel preserves item',()=>{
 const h=harness('0.5 kg');h.render();press(h.render(),'Decrease');
 assert.deepEqual(h.calls,[]);assert.deepEqual(h.transitions,[]);
 button(h.render(),'Cancel');assert.equal(h.render().some(n=>n.props?.label==='Consumed'),false);h.dispose();
});
for(const [label,action] of [['Consumed','consume'],['Discarded','discard']])test(`${label} makes one explicit lifecycle call`,async()=>{
 const h=harness('1 units');h.render();press(h.render(),'Decrease');const nodes=h.render();button(nodes,label);button(nodes,label);
 assert.deepEqual(h.calls,[]);assert.deepEqual(h.transitions,[['one',action]]);h.resolve();await flush();h.dispose();
});
test('failed lifecycle preserves quantity and reports failure',async()=>{
 const h=harness('1 units');h.render();press(h.render(),'Decrease');button(h.render(),'Consumed');h.reject(Error('Cannot save'));await flush();
 assert.equal(h.render().find(n=>n.type==='Card').props.item.quantity,'1 units');assert.equal(h.refreshes,1);h.dispose();
});
test('remote quantity change closes an outdated zero prompt',()=>{
 const h=harness('1 units');h.render();press(h.render(),'Decrease');h.render({quantity:'5 units'});
 assert.equal(h.render().some(n=>n.props?.label==='Consumed'),false);h.dispose();
});
