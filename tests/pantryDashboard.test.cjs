const {test}=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');const Module=require('node:module');
function compile(path,mocks={}) {const mod=new Module(path);mod.require=n=>{if(n in mocks)return mocks[n];throw Error(n);};mod._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,path);return mod.exports;}
const dates=compile('src/lib/pantryExpiry.ts');
function harness(){
 let cursor=0;const slots=[];const tasks=[];let household='one';const pushes=[];const opened=[];
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],v=>slots[i]=v];},useMemo(fn){return fn();},useEffect(fn,deps){const i=cursor++;const key=JSON.stringify(deps);if(slots[i]?.key!==key)tasks.push(()=>{slots[i]?.cleanup?.();slots[i]={key,cleanup:fn()};});}};
 const data={inventory:[{id:'1',name:'Carrot',category:'Produce',expiryDate:dates.localDay(),storageZone:'fridge'},{id:'2',name:'Bread',category:'Bakery',expiryDate:null,storageZone:'pantry'}],openItem:i=>opened.push(i),refreshInventory:async()=>{},inventoryLoading:false,inventoryError:''};
 const mocks={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'react-native':Object.fromEntries(['View','FlatList','ScrollView','TextInput','TouchableOpacity','RefreshControl','ActivityIndicator'].map(n=>[n,n])),'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'expo-router':{useRouter:()=>({push:v=>pushes.push(v)})},'@/src/components/atoms':{Typography:'Typography',Button:'Button'},'@/src/components/atoms/Icon':{Icon:'Icon'},'@/src/components/domain/FoodItemCard':{FoodItemCard:'FoodItemCard'},'@/src/components/molecules/TagChipGroup':{TagChipGroup:'Chips'},'@/src/components/molecules/EmptyState':{EmptyState:'EmptyState'},'@/src/context/InventoryContext':{useInventory:()=>data},'@/src/context/AuthContext':{useAuth:()=>({session:{user:{id:'user'}},household:{id:household}})},'@/src/lib/pantryExpiry':dates};
 mocks['react-native'].AppState={addEventListener:()=>({remove(){}})};
 const Screen=compile('app/(app)/(tabs)/index.tsx',mocks).default;
 const walk=n=>Array.isArray(n)?n.flatMap(walk):!n||typeof n!=='object'?[]:[n,...walk(n.props?.children),...walk(n.props?.ListHeaderComponent),...walk(n.props?.ListEmptyComponent)];
 function render(){cursor=0;const nodes=walk(Screen());while(tasks.length)tasks.shift()();return nodes;}
 return {render,data,pushes,opened,scope:id=>household=id,dispose:()=>slots.forEach(v=>v?.cleanup?.())};
}
test('dashboard filters actual rows, opens item and recipes, and resets for another household',()=>{
 const h=harness();try{
 h.render();let nodes=h.render();
 nodes.find(n=>n.type==='Chips'&&n.props.tags.includes('All zones')).props.onSelectTag('Fridge');
 nodes=h.render();const list=nodes.find(n=>n.type==='FlatList');
 assert.deepEqual(list.props.data.map(i=>i.id),['1']);
 const card=list.props.renderItem({item:list.props.data[0]});card.props.onPress(list.props.data[0]);
 assert.equal(h.opened[0].id,'1');assert.equal(h.pushes[0],'/(app)/inventory/1');
 nodes.find(n=>n.props?.label==='Find recipes for expiring food').props.onPress();
 assert.equal(h.pushes[1],'/(app)/(tabs)/recipes');
 h.scope('two');h.render();nodes=h.render();
 assert.equal(nodes.find(n=>n.type==='Chips'&&n.props.tags.includes('All zones')).props.selectedTag,'All zones');
 }finally{h.dispose();}
});
test('load errors hide stale rows and radar rather than claiming the pantry is empty',()=>{
 const h=harness();try{h.data.inventoryError='Offline';const nodes=h.render();
 assert.deepEqual(nodes.find(n=>n.type==='FlatList').props.data,[]);
 assert.ok(nodes.find(n=>n.props?.title==='A little connection hiccup'));
 assert.equal(nodes.some(n=>n.props?.accessibilityLabel?.startsWith('Today,')),false);
 }finally{h.dispose();}
});
