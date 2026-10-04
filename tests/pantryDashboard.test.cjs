const {test}=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');const Module=require('node:module');
function compile(path,mocks={}) {const mod=new Module(path);mod.require=n=>{if(n in mocks)return mocks[n];throw Error(n);};mod._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,path);return mod.exports;}
const dates=compile('src/lib/pantryExpiry.ts');
function harness(){
 let cursor=0;const slots=[];const tasks=[];let household='one';let routeZone;const pushes=[];const opened=[];const shoppingAdds=[];
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],v=>slots[i]=v];},useMemo(fn){return fn();},useEffect(fn,deps){const i=cursor++;const key=JSON.stringify(deps);if(slots[i]?.key!==key)tasks.push(()=>{slots[i]?.cleanup?.();slots[i]={key,cleanup:fn()};});}};
 const data={inventory:[{id:'1',name:'Carrot',category:'Produce',expiryDate:dates.localDay(),storageZone:'fridge'},{id:'2',name:'Bread',category:'Bakery',expiryDate:null,storageZone:'pantry'}],openItem:i=>opened.push(i),refreshInventory:async()=>{},inventoryLoading:false,inventoryError:''};
 const mocks={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'react-native':Object.fromEntries(['View','FlatList','ScrollView','TextInput','TouchableOpacity','RefreshControl','ActivityIndicator'].map(n=>[n,n])),'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'expo-router':{useRouter:()=>({push:v=>pushes.push(v)}),useLocalSearchParams:()=>({zone:routeZone})},'@/src/components/atoms':{Typography:'Typography',Button:'Button'},'@/src/components/atoms/Icon':{Icon:'Icon'},'@/src/components/domain/PantryItemCard':{PantryItemCard:'FoodItemCard'},'@/src/components/domain/PantryFilterSheet':{PantryFilterSheet:'FilterSheet'},'@/src/components/molecules/EmptyState':{EmptyState:'EmptyState'},'@/src/context/InventoryContext':{useInventory:()=>data},'@/src/context/AuthContext':{useAuth:()=>({session:{user:{id:'user'},access_token:'token'},household:{id:household}})},'@/src/lib/pantryExpiry':dates,'@/src/lib/shoppingApi':{addMissingIngredientsToShopping:async(token,home,names)=>{shoppingAdds.push({token,home,names});return {added:1,skipped:0};}}};
 mocks['react-native'].AppState={addEventListener:()=>({remove(){}})};
 mocks['@/src/components/atoms/BrandLogo']={BrandLogo:'BrandLogo'};
 const Screen=compile('app/(app)/(tabs)/index.tsx',mocks).default;
 const walk=n=>Array.isArray(n)?n.flatMap(walk):!n||typeof n!=='object'?[]:[n,...walk(n.props?.children),...walk(n.props?.ListHeaderComponent),...walk(n.props?.ListEmptyComponent)];
 function render(){cursor=0;const nodes=walk(Screen());while(tasks.length)tasks.shift()();return nodes;}
 return {render,data,pushes,opened,shoppingAdds,scope:id=>household=id,route:value=>routeZone=value,dispose:()=>slots.forEach(v=>v?.cleanup?.())};
}
test('dashboard filters actual rows, opens item and calendar, and resets for another household',()=>{
 const h=harness();try{
 h.render();let nodes=h.render();
 assert.equal(nodes.some(n=>n.type==='Chips'),false);
 const filterButton=nodes.find(n=>n.props?.accessibilityLabel==='Filter pantry');
 assert.ok(filterButton);
 filterButton.props.onPress();
 nodes=h.render();
 let sheet=nodes.find(n=>n.type==='FilterSheet');
 assert.equal(sheet.props.visible,true);
 sheet.props.onApply('Fridge','All');
 nodes=h.render();
 const list=nodes.find(n=>n.type==='FlatList');
 assert.deepEqual(list.props.data.map(i=>i.id),['1']);
 assert.equal(nodes.find(n=>n.type==='FilterSheet').props.visible,false);
 assert.ok(nodes.find(n=>n.props?.accessibilityLabel==='Filter pantry, 1 active filter'));
 const card=list.props.renderItem({item:list.props.data[0]});card.props.onPress(list.props.data[0]);
 assert.equal(h.opened[0].id,'1');assert.equal(h.pushes[0],'/(app)/inventory/1');
 nodes.find(n=>n.props?.accessibilityLabel==='Open expiry calendar').props.onPress();
 assert.equal(h.pushes[1],'/(app)/expiry-calendar');
 h.scope('two');h.render();nodes=h.render();
 sheet=nodes.find(n=>n.type==='FilterSheet');
 assert.equal(sheet.props.selectedZone,'All zones');
 assert.equal(sheet.props.selectedCategory,'All');
 }finally{h.dispose();}
});
test('load errors hide stale rows and radar rather than claiming the pantry is empty',()=>{
 const h=harness();try{h.data.inventoryError='Offline';const nodes=h.render();
 assert.deepEqual(nodes.find(n=>n.type==='FlatList').props.data,[]);
 assert.ok(nodes.find(n=>n.props?.title==='A little connection hiccup'));
 assert.equal(nodes.some(n=>n.props?.accessibilityLabel?.startsWith('Today,')),false);
 }finally{h.dispose();}
});

test('storage zone route parameter opens pantry with the matching filter applied',()=>{
 const h=harness();try{
 h.route('fridge');h.render();const nodes=h.render();
 const list=nodes.find(n=>n.type==='FlatList');
 assert.deepEqual(list.props.data.map(i=>i.id),['1']);
 const sheet=nodes.find(n=>n.type==='FilterSheet');
 assert.equal(sheet.props.selectedZone,'Fridge');
 assert.ok(nodes.find(n=>n.props?.accessibilityLabel==='Filter pantry, 1 active filter'));
 }finally{h.dispose();}
});

test('low-stock items do not add percentage or alert cards to the dashboard',()=>{
 const h=harness();try{
  h.data.inventory.push({id:'3',name:'Flour',category:'Pantry',quantity:'0.2 kg',expiryDate:null,storageZone:'pantry',remainingPercent:10,isLowStock:true});
  const nodes=h.render();
  assert.equal(nodes.some(n=>n.props?.children==='Low stock'),false);
  assert.equal(nodes.some(n=>n.type==='Button'&&n.props?.label==='Add to Shopping'),false);
 }finally{h.dispose();}
});

test('home keeps household activity behind a small header button',()=>{
 const h=harness();try{
  h.render();const nodes=h.render();
  const activity=nodes.find(n=>n.props?.accessibilityLabel==='Open household activity');
  assert.ok(activity);
  activity.props.onPress();
  assert.equal(h.pushes.at(-1),'/(app)/activity');
 }finally{h.dispose();}
});
