import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, ScrollView, TextInput, TouchableOpacity, RefreshControl, AppState, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Typography, Button } from '@/src/components/atoms';
import { Icon } from '@/src/components/atoms/Icon';
import { PantryItemCard } from '@/src/components/domain/PantryItemCard';
import { PantryFilterSheet } from '@/src/components/domain/PantryFilterSheet';
import { EmptyState } from '@/src/components/molecules/EmptyState';
import { useInventory } from '@/src/context/InventoryContext';
import { useAuth } from '@/src/context/AuthContext';
import { localDay, pantryView, ExpiryGroup } from '@/src/lib/pantryExpiry';

const categories = ['All', 'Produce', 'Dairy', 'Meat', 'Bakery', 'Pantry', 'Beverage', 'Snacks'];
const zones: Record<string,string> = { 'All zones':'all', Fridge:'fridge', Freezer:'freezer', Pantry:'pantry', Spices:'spicerack' };
const buckets = [
  { id:'expired' as const, title:'Expired', hint:'Review these items', tone:'critical' as const },
  { id:'today' as const, title:'Today', hint:'Check these first', tone:'critical' as const },
  { id:'soon' as const, title:'Next 48 hours', hint:'Plan something tasty', tone:'soon' as const },
];
export default function PantryDashboardScreen() {
  const router = useRouter();
  const { household, session } = useAuth();
  const { inventory, openItem, refreshInventory, inventoryLoading, inventoryError } = useInventory();
  const [selectedCat,setSelectedCat] = useState('All');
  const [zone,setZone] = useState('All zones');
  const [group,setGroup] = useState<ExpiryGroup>('all');
  const [filterOpen,setFilterOpen] = useState(false);
  const [search,setSearch] = useState('');
  const [query,setQuery] = useState('');
  const [today,setToday] = useState(localDay);
  useEffect(()=>{const timer=setTimeout(()=>setQuery(search),250);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{
    const update=()=>setToday(localDay());
    const timer=setInterval(update,30000);
    const listener=AppState.addEventListener('change',state=>{if(state==='active')update();});
    return()=>{clearInterval(timer);listener.remove();};
  },[]);
  const clear=()=>{setSearch('');setQuery('');setSelectedCat('All');setZone('All zones');setGroup('all');setFilterOpen(false);};
  useEffect(clear,[household?.id,session?.user.id]);
  const activeFilterCount=(zone==='All zones'?0:1)+(selectedCat==='All'?0:1);
  const view=useMemo(()=>pantryView(inventory,today,zones[zone],selectedCat,query,group),[inventory,today,zone,selectedCat,query,group]);
  const header=<View className="gap-3 pb-4">
    <View className="flex-row items-center justify-between gap-3 pt-3">
      <View className="flex-1"><Typography variant="h1">My Kitchen</Typography>
        <Typography variant="caption" color="muted">{inventory.length} items in your household</Typography></View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={()=>setFilterOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={activeFilterCount>0?`Filter pantry, ${activeFilterCount} active ${activeFilterCount===1?'filter':'filters'}`:'Filter pantry'}
          className={`relative w-11 h-11 items-center justify-center rounded-xl border ${activeFilterCount>0?'bg-brand-50 dark:bg-brand-500/20 border-brand-500':'bg-ground-surface border-border-default'}`}
        >
          <Icon name="Filter" size={21} color={activeFilterCount>0?'#10B981':'#64748B'} />
          {activeFilterCount>0&&<View className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-brand-500 items-center justify-center border-2 border-ground-canvas">
            <Typography variant="tiny" className="text-white font-bold">{activeFilterCount}</Typography>
          </View>}
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>router.push('/(modal)/manual-add' as any)} accessibilityRole="button" accessibilityLabel="Add food item manually" className="w-11 h-11 items-center justify-center bg-brand-500 rounded-xl">
          <Icon name="Plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
    <View className="flex-row items-center min-h-[44px] px-3.5 bg-ground-surface border border-border-default rounded-xl">
      <Icon name="Search" size={16} color="#94A3B8" />
      <TextInput accessibilityLabel="Search your kitchen" placeholder="Search your kitchen..." placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} className="flex-1 ml-2.5 text-text-primary py-3" />
    </View>
    {!inventoryError && inventory.length>0 && <View className="gap-3">
      <Typography variant="h2">Expiry radar</Typography>
      <Typography variant="caption" color="muted">Counts follow your filters. Next 48 hours covers tomorrow and the following day.</Typography>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {buckets.map(bucket=><TouchableOpacity key={bucket.id} accessibilityRole="button" accessibilityState={{selected:group===bucket.id}} accessibilityLabel={`${bucket.title}, ${view.counts[bucket.id]} items`} onPress={()=>setGroup(group===bucket.id?'all':bucket.id)} className={`mr-3 p-4 rounded-2xl border min-w-[145px] ${group===bucket.id?'bg-ground-subtle border-brand-500':'bg-ground-surface border-border-default'}`}>
          <Typography variant="h2" color={bucket.tone}>{view.counts[bucket.id]}</Typography>
          <Typography variant="body">{bucket.title}</Typography>
          <Typography variant="caption" color="muted">{bucket.hint}</Typography>
        </TouchableOpacity>)}
      </ScrollView>
      <Button label="Open expiry calendar" variant="outline" onPress={()=>router.push('/(app)/expiry-calendar' as any)} />
      {group!=='all'&&<Button label="Show all expiry dates" variant="ghost" onPress={()=>setGroup('all')} />}
      {view.counts.today+view.counts.soon>0&&<Button label="Find recipes for expiring food" variant="secondary" onPress={()=>router.push('/(app)/(tabs)/recipes' as any)} />}
      <Typography variant="caption" color="muted">{view.items.length} items · Nearest expiry first · Undated items last</Typography>
    </View>}
    {!!inventoryError&&<EmptyState icon="WifiOff" title="A little connection hiccup" description={inventoryError} actionLabel="Try again" onAction={()=>void refreshInventory()} />}
  </View>;
  return <SafeAreaView edges={['top','left','right']} className="flex-1 bg-ground-canvas">
    <FlatList data={inventoryError?[]:view.items} keyExtractor={item=>item.id} ListHeaderComponent={header}
      renderItem={({item})=><PantryItemCard key={`${session?.user.id}:${household?.id}:${item.id}`} item={item} today={today} onPress={selected=>{openItem(selected);router.push(`/(app)/inventory/${selected.id}` as any);}} />}
      ItemSeparatorComponent={()=><View className="h-2.5" />}
      refreshControl={<RefreshControl refreshing={inventoryLoading} onRefresh={()=>void refreshInventory()} />}
      keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:20,paddingBottom:28}} showsVerticalScrollIndicator={false}
      ListEmptyComponent={inventoryError?null:inventoryLoading?<ActivityIndicator accessibilityLabel="Loading pantry" color="#10B981" />:inventory.length===0?
        <EmptyState icon="Refrigerator" title="A fresh start for your kitchen" description="Add a few ingredients and let’s see what’s cooking." actionLabel="Scan your first item" onAction={()=>router.push('/(app)/(tabs)/scan' as any)} secondaryLabel="Add food manually" onSecondary={()=>router.push('/(modal)/manual-add' as any)} />:
        <EmptyState icon="Search" title={group==='all'?'Nothing on this shelf':'Nothing in this expiry group'} description="Try another shelf, ingredient or expiry group." actionLabel="Clear filters" onAction={clear} />}
    />
    <PantryFilterSheet
      visible={filterOpen}
      zones={Object.keys(zones)}
      categories={categories}
      selectedZone={zone}
      selectedCategory={selectedCat}
      onClose={()=>setFilterOpen(false)}
      onApply={(nextZone,nextCategory)=>{setZone(nextZone);setSelectedCat(nextCategory);setFilterOpen(false);}}
    />
  </SafeAreaView>;
}
