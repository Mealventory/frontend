import React, {useState, useEffect, useRef} from 'react';
import {View, Text, Linking} from 'react-native';
import {Button} from '../atoms';
import {FormField} from './FormField';
import {useAuth} from '@/src/context/AuthContext';
import {normalizeExpiryDate} from '@/src/lib/expiryDate';
import {predictExpiry, Prediction, FoodState} from '@/src/lib/expiryPredictionApi';

const conditionLabels: Record<FoodState,string> = {whole:'Whole / uncut',raw:'Raw',cooked:'Cooked',opened:'Opened',unopened:'Unopened',ready_to_eat:'Plain bread / rolls'};

export function ExpiryPrediction({name, zone, value, onApply, disabled=false, itemId}: {
 name:string; zone:string; value:string; onApply:(date:string)=>void; disabled?:boolean; itemId?:string;
}) {
 const {session, household}=useAuth();
 const [purchase,setPurchase]=useState(() => {const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
 const [baseline,setBaseline]=useState('');
 const [foodState,setFoodState]=useState<FoodState|undefined>();
 const [options,setOptions]=useState<FoodState[]>([]);
 const [advanced,setAdvanced]=useState(false);
 useEffect(()=>{setFoodState(undefined);setOptions([]);},[name,zone,itemId,session?.user.id,household?.id]);
 const [result,setResult]=useState<Prediction|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [applied,setApplied]=useState('');
 const controller=useRef<AbortController|null>(null);
 const key=JSON.stringify([session?.user.id,household?.id,name,zone,value,purchase,baseline,foodState,itemId]);
 const latest=useRef(key); latest.current=key;
 useEffect(()=>{setResult(null);setMessage('');setBusy(false);return()=>{controller.current?.abort();controller.current=null;};},[key]);
 const request=async()=>{
  if(!session||!household||controller.current)return;
  let date:string|null;
  try {date=normalizeExpiryDate(purchase);if(!date)throw new Error('Enter the purchase, opening or cooking date shown above.');} catch(e){setMessage((e as Error).message);return;}
  const days=baseline.trim()?Number(baseline):undefined;
  if(days!==undefined&&(!Number.isInteger(days)||days<5||days>30)){setMessage('The experimental model supports known shelf lives from 5 to 30 days.');return;}
  const active=new AbortController();controller.current=active;setBusy(true);setMessage('');setResult(null);
  const timeout=setTimeout(()=>active.abort(),15000);
  try {
   const next=await predictExpiry(session.access_token,household.id,{name:name.trim(),storage_zone:zone,purchase_date:date,item_id:itemId,avg_shelf_life_days:days,food_state:foodState},active.signal);
   if(latest.current===key&&controller.current===active){setResult(next);setOptions(next.food_state_options||[]);}
  }catch(e){if(latest.current===key&&controller.current===active)setMessage(active.signal.aborted?'Prediction timed out. Try again or enter a date manually.':(e as Error).message);}
  finally {clearTimeout(timeout);if(controller.current===active){controller.current=null;setBusy(false);}}
 };
 return <View className="gap-3 p-4 rounded-2xl bg-ground-surface border border-border-default">
  <Text className="font-bold text-text-primary">Need an expiry estimate?</Text>
  <FormField label={foodState==='opened'?'Date opened':foodState==='cooked'?'Date cooked':'Purchase / storage start date'} helperText="Use the actual start date, not today if you bought, opened or cooked it earlier. For ripe fruit, use the date first stored ripe." value={purchase} onChangeText={setPurchase} editable={!disabled} placeholder="YYYY-MM-DD" />
  {!!options.length&&<View className="gap-2">
   <Text className="font-bold text-text-primary">Food condition</Text>
   <View className="flex-row flex-wrap gap-2">{options.map(option=><Button key={option} label={conditionLabels[option]} variant={foodState===option?'primary':'secondary'} disabled={disabled||busy} onPress={()=>{setFoodState(option);setBaseline('');if(option==='opened'||option==='cooked')setPurchase('');}} />)}</View>
  </View>}
  <Button label={advanced?'Hide advanced options':'Known shelf life (advanced)'} variant="ghost" onPress={()=>{setAdvanced(!advanced);setBaseline('');}} />
  {advanced&&<FormField label="Known shelf life in days (optional)" value={baseline} onChangeText={setBaseline} editable={!disabled} keyboardType="number-pad" helperText="For foods not in the guide: the experimental model accepts 5–30 days. Leave blank for a catalogue lookup." />}
  <Button label={busy?'Estimating…':'Predict expiry'} variant="secondary" loading={busy} disabled={disabled||busy||!name.trim()||!household} onPress={request} />
  {!!message&&<Text accessibilityRole="alert" className="text-text-muted">{message}</Text>}
  {result&&<View className="gap-3">
   <Text className="text-text-muted">{result.explanation}</Text>
   {!!result.source_url&&<Button label={`Source: ${result.source_name||'Storage guide'}`} variant="ghost" onPress={()=>{void Linking.openURL(result.source_url!).catch(()=>setMessage('Could not open the source. Try again later.'));}} />}
   {result.predicted_expiry_date&&<><Text className="text-brand-500 font-bold">{result.source==='catalogue'?'Storage guide estimate':'Experimental estimate'}: {result.predicted_expiry_date}</Text>
    <Button label={value?'Replace date with estimate':'Apply estimate'} disabled={disabled} onPress={()=>{const date=result.predicted_expiry_date!;setApplied(date);onApply(date);setResult(null);}} /></>}
   <Button label={value?'Keep current date':'Enter date manually'} variant="ghost" onPress={()=>setResult(null)} />
  </View>}
  {!!applied&&value===applied&&<Text className="text-text-muted">Estimated date applied. Save the item to keep this date.</Text>}
 </View>;
}
