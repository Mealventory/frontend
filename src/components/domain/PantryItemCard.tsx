import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { FoodItem } from "@/src/types";
import { FoodItemCard } from "./FoodItemCard";
import { Button } from "../atoms";
import {FoodItem} from '@/src/types';
import {FoodItemCard} from './FoodItemCard';
import {Button} from '../atoms';
import {Icon} from '../atoms/Icon';
import {SwipeActionRow} from '../molecules/SwipeActionRow';
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

 const save=async(
  amount:number|null,
  action?:'consume'|'discard',
  reason?:'expired'|'spoiled'|'bought_too_much'|'didnt_like'|'other'
 )=>{
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');setFinish(false);
  if(amount!==null)setOptimistic(amount);
  try{
   if(action)await transitionItem(item.id,action,reason);
   else await updateItem(item.id,{quantity:amount!});
  }catch(e){
   if(mounted.current){setOptimistic(null);setError(e instanceof Error?e.message:'Could not save this change. Please retry.');}
   try{await refreshInventory();}catch{/* Keep the original save error visible. */}
  }finally{
   locked.current=false;
   if(mounted.current){setOptimistic(null);setBusy(false);}
  }
 };

 const discardWithReason = () => {
  Alert.alert(
   'Discard item',
   `Why are you discarding ${item.name}?`,
   [
    {text:'Expired',onPress:()=>void save(null,'discard','expired')},
    {text:'Spoiled',onPress:()=>void save(null,'discard','spoiled')},
    {text:'Bought too much',onPress:()=>void save(null,'discard','bought_too_much')},
    {text:"Didn't like it",onPress:()=>void save(null,'discard','didnt_like')},
    {text:'Other',onPress:()=>void save(null,'discard','other')},
    {text:'Cancel',style:'cancel'},
   ],
   {cancelable:true}
  );
 };
 const change=(delta:1|-1)=>{
  if(locked.current||!quantity)return;
  const amount=adjustQuantity(quantity.amount,delta);
  if(amount===0){setError('');setFinish(true);return;}
  void save(amount);
 };
 const controls=quantity?<View className="flex-row items-center shrink-0">
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Decrease ${item.name} by 1 ${quantity.unit}`} accessibilityState={{disabled:busy||finish}} disabled={busy||finish} onPress={()=>change(-1)} className="w-11 h-11 items-center justify-center rounded-xl bg-ground-subtle">
     <Icon name="Minus" size={18} color="#64748B" />
    </TouchableOpacity>
    <View className="min-w-[24px] max-w-[56px] items-center px-1">
     {busy?<ActivityIndicator accessibilityLabel={`Saving ${item.name}`} color="#10B981" />:<Text numberOfLines={1} adjustsFontSizeToFit className="text-text-primary font-bold">{optimistic??quantity.amount}</Text>}
    </View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Increase ${item.name} by 1 ${quantity.unit}`} accessibilityState={{disabled:busy||finish||quantity.amount+1>999999999.999}} disabled={busy||finish||quantity.amount+1>999999999.999} onPress={()=>change(1)} className="w-11 h-11 items-center justify-center rounded-xl bg-ground-subtle">
     <Icon name="Plus" size={18} color="#64748B" />
    </TouchableOpacity>
   </View>:null;
 return <View className="gap-1">
  <SwipeActionRow
   disabled={busy}
   containerClassName="rounded-[20px]"
   testIDPrefix={`pantry-swipe-${item.id}`}
   leadingActions={[
    {
     key:'consume',
     label:'Consumed',
     accessibilityLabel:`Mark ${item.name} as consumed`,
     onPress:()=>save(null,'consume'),
    },
   ]}
   actions={[
    {
     key:'discard',
     label:'Discarded',
     accessibilityLabel:`Mark ${item.name} as discarded`,
     tone:'danger',
     onPress:discardWithReason,
    },
   ]}
  >
   <FoodItemCard item={display} today={today} quantityControls={controls} onPress={selected=>{if(!locked.current)onPress(selected);}} />
  </SwipeActionRow>
  {(finish||!!error)&&<View className="px-3 pb-2 gap-2">
   {finish&&<View className="gap-2 p-3 bg-ground-subtle rounded-xl">
    <Text className="text-text-primary font-bold">Finished with {item.name}?</Text>
    <Text className="text-text-muted">Mark the remaining {item.quantity} as consumed or discarded. Cancel keeps the item unchanged.</Text>
    <Button label="Consumed" onPress={()=>void save(null,'consume')} />
    <Button label="Discarded" variant="outline" onPress={discardWithReason} />
    <Button label="Cancel" variant="ghost" onPress={()=>setFinish(false)} />
   </View>}
   {!!error&&<Text accessibilityRole="alert" className="text-urgency-critical">{error}</Text>}
  </View>}
 </View>;
}
