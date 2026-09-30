import React, {useEffect, useRef, useState} from 'react';
import {View, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import {FoodItem} from '@/src/types';
import {FoodItemCard} from './FoodItemCard';
import {Button} from '../atoms';
import {Icon} from '../atoms/Icon';
import {useInventory} from '@/src/context/InventoryContext';
import {parseQuantity, adjustQuantity} from '@/src/lib/quickQuantity';

// Parent keys this component by account, household and item to isolate pending UI.
export function PantryItemCard({item,today,onPress}:{item:FoodItem;today:string;onPress:(item:FoodItem)=>void}) {
 const {updateItem,transitionItem,refreshInventory}=useInventory();
 const [optimistic,setOptimistic]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 const [finish,setFinish]=useState(false);
 const [error,setError]=useState('');
 const locked=useRef(false);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 // A remote edit while the prompt is open requires a new decision.
 useEffect(()=>{setFinish(false);},[item.quantity]);
 const quantity=parseQuantity(item.quantity);
 const display=optimistic!==null&&quantity?{...item,quantity:`${optimistic} ${quantity.unit}`}:item;
 const save=async(amount:number|null, action?:'consume'|'discard')=>{
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');setFinish(false);
  if(amount!==null)setOptimistic(amount);
  try{
   if(action)await transitionItem(item.id,action);
   else await updateItem(item.id,{quantity:amount!});
  }catch(e){
   if(mounted.current){setOptimistic(null);setError(e instanceof Error?e.message:'Could not save this change. Please retry.');}
   // Reconcile uncertain network outcomes before another tap; refresh reports its own error.
   try{await refreshInventory();}catch{/* Keep the original save error visible. */}
  }finally{
   locked.current=false;
   if(mounted.current){setOptimistic(null);setBusy(false);}
  }
 };
 const change=(delta:1|-1)=>{
  if(locked.current||!quantity)return;
  const amount=adjustQuantity(quantity.amount,delta);
  if(amount===0){setError('');setFinish(true);return;}
  void save(amount);
 };
 return <View className="gap-1">
  <FoodItemCard item={display} today={today} onPress={selected=>{if(!locked.current)onPress(selected);}} />
  <View className="px-3 pb-2 gap-2">
   {quantity?<View className="flex-row items-center justify-between gap-2">
    <View className="flex-1"><Text className="text-text-muted text-xs">Quick quantity · 1 {quantity.unit} per tap</Text>
     {busy&&<Text accessibilityLiveRegion="polite" className="text-text-muted text-xs">Saving…</Text>}
    </View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Decrease ${item.name} by 1 ${quantity.unit}`} accessibilityState={{disabled:busy||finish}} disabled={busy||finish} onPress={()=>change(-1)} className="w-11 h-11 items-center justify-center rounded-xl bg-ground-subtle border border-border-default">
     <Icon name="Minus" size={20} color="#64748B" />
    </TouchableOpacity>
    {busy?<ActivityIndicator accessibilityLabel={`Saving ${item.name}`} color="#10B981" />:<Text className="text-text-primary font-bold">{quantity.amount}</Text>}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Increase ${item.name} by 1 ${quantity.unit}`} accessibilityState={{disabled:busy||finish||quantity.amount+1>999999999.999}} disabled={busy||finish||quantity.amount+1>999999999.999} onPress={()=>change(1)} className="w-11 h-11 items-center justify-center rounded-xl bg-ground-subtle border border-border-default">
     <Icon name="Plus" size={20} color="#64748B" />
    </TouchableOpacity>
   </View>:<Text className="text-text-muted text-xs">Open this item to edit its quantity.</Text>}
   {finish&&<View className="gap-2 p-3 bg-ground-subtle rounded-xl">
    <Text className="text-text-primary font-bold">Finished with {item.name}?</Text>
    <Text className="text-text-muted">Mark the remaining {item.quantity} as consumed or discarded. Cancel keeps the item unchanged.</Text>
    <Button label="Consumed" onPress={()=>void save(null,'consume')} />
    <Button label="Discarded" variant="outline" onPress={()=>void save(null,'discard')} />
    <Button label="Cancel" variant="ghost" onPress={()=>setFinish(false)} />
   </View>}
   {!!error&&<Text accessibilityRole="alert" className="text-urgency-critical">{error}</Text>}
  </View>
 </View>;
}
