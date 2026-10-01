const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');const Module=require('node:module');
function load(file,mocks={}){const mod=new Module(file);mod.require=n=>{if(n in mocks)return mocks[n];throw Error(n);};mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);return mod.exports;}
const tick=()=>new Promise(r=>setImmediate(r));
function harness({granted=true,expo=false}={}){
 let session={user:{id:'a'},access_token:'access-a'},cleanup,stored=null,requests=0,tokenCalls=0;
 const calls=[],slots=[],effects=[];let index=0;
 const react={createContext:()=>({Provider:'Provider'}),useContext:()=>{},useRef:v=>{const i=index++;return slots[i]??={current:v};},useState:v=>{const i=index++;if(!(i in slots))slots[i]=v;return[slots[i],v=>{slots[i]=v;}];},useEffect:(fn,deps)=>{const i=index++;const key=JSON.stringify(deps);if(slots[i]?.key!==key)effects.push(()=>{slots[i]?.cleanup?.();slots[i]={key,cleanup:fn()};});}};
 const notifications={getPermissionsAsync:async()=>({granted,canAskAgain:true}),requestPermissionsAsync:async()=>{requests++;return{granted,canAskAgain:true};},getExpoPushTokenAsync:async()=>{tokenCalls++;return{data:'ExpoPushToken[phone]'};},addPushTokenListener:()=>({remove(){}})};
 const {NotificationProvider}=load('src/context/NotificationContext.tsx',{
 react,'react/jsx-runtime':{jsx:(type,props)=>({type,props})},'react-native':{Platform:{OS:'ios'},AppState:{addEventListener:()=>({remove(){}})}},'expo-constants':{__esModule:true,default:{appOwnership:expo?'expo':'standalone',easConfig:{projectId:'project'}}},'expo-device':{isDevice:true},'expo-secure-store':{getItemAsync:async()=>stored,setItemAsync:async(_,v)=>{stored=v;},deleteItemAsync:async()=>{stored=null;}},'./AuthContext':{useAuth:()=>({session})},'../lib/account':{setSignOutCleanup:fn=>{cleanup=fn;return()=>{};}},'../lib/pushApi':{updatePushDevice:async(...args)=>{calls.push(args);}},'expo-notifications':notifications,
 });
 return{render(){index=0;const tree=NotificationProvider({children:null});while(effects.length)effects.shift()();return tree.props.value;},setUser(id){session=id?{user:{id},access_token:'access-'+id}:null;},calls,get requests(){return requests;},get tokenCalls(){return tokenCalls;},cleanup:()=>cleanup()};
}
test('Expo Go does not request permission or register',async()=>{const h=harness({expo:true});h.render();await tick();await h.render().enable();assert.equal(h.calls.length,0);assert.equal(h.requests,0);assert.match(h.render().status,/development build/);});
test('denied permission is nonblocking and token is not obtained',async()=>{const h=harness({granted:false});h.render();await tick();await h.render().enable();assert.equal(h.requests,1);assert.equal(h.tokenCalls,0);assert.equal(h.calls.length,0);assert.equal(h.render().busy,false);});
test('registration associates current account and cleanup removes before logout',async()=>{const h=harness();h.render();await tick();assert.deepEqual(h.calls[0],['access-a','ExpoPushToken[phone]','ios']);await h.cleanup();assert.deepEqual(h.calls[1],['access-a','ExpoPushToken[phone]']);});
test('account change cleans old registration before registering new owner',async()=>{const h=harness();h.render();await tick();h.setUser('b');h.render();await tick();assert.deepEqual(h.calls.slice(-2),[['access-a','ExpoPushToken[phone]'],['access-b','ExpoPushToken[phone]','ios']]);});
test('logout cleanup failure does not pretend registration was removed',async()=>{
 const {setSignOutCleanup,signOutAccount}=load('src/lib/account.ts');let signedOut=false;
 const remove=setSignOutCleanup(async()=>{throw Error('Offline');});
 await assert.rejects(signOutAccount({auth:{signOut:async()=>{signedOut=true;return{error:null};}}}),/Offline/);
 assert.equal(signedOut,false);remove();
});
