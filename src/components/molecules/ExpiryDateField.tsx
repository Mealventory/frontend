import { useState } from 'react';
import { View, Modal, Pressable, Text } from 'react-native';
import { FormField } from './FormField';
import { Button } from '../atoms';
import { normalizeExpiryDate } from '@/src/lib/expiryDate';

export function ExpiryDateField({ value, onChangeText, editable = true }: {
  value: string; onChangeText: (value: string) => void; editable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [error, setError] = useState('');
  const show = () => {
    let initial = new Date();
    try { const date = normalizeExpiryDate(value); if (date) initial = new Date(`${date}T12:00:00`); } catch {}
    setMonth(new Date(initial.getFullYear(), initial.getMonth(), 1)); setOpen(true);
  };
  const choose = (date: string) => { onChangeText(date); setError(''); setOpen(false); };
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <View className="gap-2">
    <FormField label="Expiry date" value={value} editable={editable} autoCapitalize="none"
      placeholder="20270125 or 2027/01/25" error={error}
      helperText="Year, month, day. Leave blank if unknown."
      onChangeText={text => { setError(''); onChangeText(text); }}
      onBlur={() => { try { onChangeText(normalizeExpiryDate(value) || ''); setError(''); } catch (e) { setError((e as Error).message); } }} />
    <Button label="Choose a date" variant="secondary" disabled={!editable} onPress={show} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
        <View accessibilityViewIsModal className="bg-ground-canvas rounded-3xl p-3" style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <View className="flex-row items-center justify-between mb-3">
            <Button label="‹" accessibilityLabel="Previous month" variant="ghost" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
            <Text accessibilityRole="header" className="text-text-primary font-bold">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <Button label="›" accessibilityLabel="Next month" variant="ghost" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
          </View>
          <View className="flex-row">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => <Text key={day} className="text-text-muted text-center" style={{ width: '14.2857%' }}>{day}</Text>)}</View>
          <View className="flex-row flex-wrap my-2">
            {Array.from({ length: offset + days }, (_, i) => {
              const day = i - offset + 1;
              const date = `${month.getFullYear().toString().padStart(4, '0')}-${String(month.getMonth()+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              return day < 1 ? <View key={i} style={{ width: '14.2857%', height: 44 }} /> :
                <Pressable key={i} accessibilityRole="button" accessibilityLabel={date} accessibilityState={{ selected: value === date }} onPress={() => choose(date)} style={{ width: '14.2857%', height: 44, justifyContent: 'center', alignItems: 'center' }} className={value === date ? 'bg-brand-500 rounded-xl' : ''}>
                  <Text className={value === date ? 'text-white font-bold' : 'text-text-primary'}>{day}</Text>
                </Pressable>;
            })}
          </View>
          <View className="gap-2"><Button label="Clear date" variant="secondary" onPress={() => choose('')} /><Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} /></View>
        </View>
      </View>
    </Modal>
  </View>;
}
