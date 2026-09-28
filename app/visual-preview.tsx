import React, { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/src/components/atoms';
import { InventoryProvider } from '@/src/context/InventoryContext';
import Pantry from './(app)/(tabs)/index';
import Settings from './(app)/(tabs)/settings';
import Manual from './(modal)/manual-add';
export default function Preview() {
 const [page,setPage] = useState('Pantry');
 return <InventoryProvider demo><View className="flex-1 bg-ground-canvas">
 <View className="flex-row justify-center gap-2 p-2">{['Pantry','Settings','Form'].map(p=><Button key={p} label={p} size="sm" variant="outline" onPress={()=>setPage(p)}/>)}</View>
 {page === 'Pantry' ? <Pantry/> : page === 'Settings' ? <Settings/> : <Manual/>}
 </View></InventoryProvider>;
}
