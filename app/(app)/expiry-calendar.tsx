import { useEffect, useMemo, useState } from 'react';
import { AppState, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Icon, Typography } from '@/src/components/atoms';
import { EmptyState } from '@/src/components/molecules/EmptyState';
import { useInventory } from '@/src/context/InventoryContext';
import type { FoodItem } from '@/src/types';
import { expiryDays, expiryLabel, localDay } from '@/src/lib/pantryExpiry';
import { APP_GUTTER, APP_PAGE_TOP } from '@/src/lib/layout';
import {
  calendarCells,
  expiryTimeline,
  itemsForDate,
  shiftMonth,
  type CalendarTone,
} from '@/src/lib/expiryCalendar';

type ViewMode = 'calendar' | 'upcoming';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toneColors: Record<CalendarTone, string> = {
  critical: '#EF4444',
  soon: '#F59E0B',
  fresh: '#10B981',
};

function parseYearMonth(value: string) {
  return {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)),
  };
}

function formatMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatLongDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function ExpiryItemRow({
  item,
  today,
  onPress,
}: {
  item: FoodItem;
  today: string;
  onPress: (item: FoodItem) => void;
}) {
  const days = expiryDays(item.expiryDate, today);
  const tone: CalendarTone | null = days === null ? null : days <= 1 ? 'critical' : days <= 7 ? 'soon' : 'fresh';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${days === null ? 'no expiry date' : expiryLabel(days)}`}
      onPress={() => onPress(item)}
      className="flex-row items-center gap-3 p-3.5 rounded-2xl bg-ground-surface border border-border-default"
    >
      <View className="w-11 h-11 rounded-xl bg-ground-subtle items-center justify-center">
        <Text className="text-[24px]">{item.emoji || '🍽️'}</Text>
      </View>
      <View className="flex-1 min-w-0">
        <Typography variant="body" className="font-bold" numberOfLines={1}>
          {item.name}
        </Typography>
        <Typography variant="caption" color="muted" numberOfLines={1}>
          {item.quantity} · {item.storageZone || 'storage not set'}
        </Typography>
      </View>
      <View className="items-end">
        <Text
          className="text-[12px] font-bold"
          style={{ color: tone ? toneColors[tone] : '#64748B' }}
        >
          {days === null ? 'No date' : expiryLabel(days)}
        </Text>
        <Icon name="ChevronRight" size={16} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

function TimelineSection({
  title,
  hint,
  items,
  today,
  onPress,
}: {
  title: string;
  hint: string;
  items: FoodItem[];
  today: string;
  onPress: (item: FoodItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View className="gap-2.5">
      <View>
        <Typography variant="h3">{title}</Typography>
        <Typography variant="caption" color="muted">
          {hint}
        </Typography>
      </View>
      {items.map((item) => (
        <ExpiryItemRow key={item.id} item={item} today={today} onPress={onPress} />
      ))}
    </View>
  );
}

export default function ExpiryCalendarScreen() {
  const router = useRouter();
  const { inventory, openItem } = useInventory();
  const [today, setToday] = useState(localDay);
  const initial = parseYearMonth(today);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    const update = () => setToday(localDay());
    const timer = setInterval(update, 30000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);

  const cells = useMemo(
    () => calendarCells(inventory, today, year, month),
    [inventory, today, year, month]
  );
  const timeline = useMemo(() => expiryTimeline(inventory, today), [inventory, today]);
  const selectedItems = useMemo(
    () => itemsForDate(inventory, selectedDate),
    [inventory, selectedDate]
  );

  const openInventoryItem = (item: FoodItem) => {
    openItem(item);
    router.push(`/(app)/inventory/${item.id}` as any);
  };

  const moveMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    const current = parseYearMonth(today);
    setSelectedDate(
      current.year === next.year && current.month === next.month
        ? today
        : `${next.year}-${String(next.month).padStart(2, '0')}-01`
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-ground-canvas">
      <View className="px-4 pt-3 pb-3 border-b border-border-default">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to pantry"
            className="w-11 h-11 items-center justify-center rounded-xl bg-ground-surface border border-border-default"
          >
            <Icon name="ChevronLeft" size={20} color="#64748B" />
          </TouchableOpacity>
          <View className="flex-1">
            <Typography variant="h1">Expiry Calendar</Typography>
            <Typography variant="caption" color="muted">
              Plan meals before food goes to waste
            </Typography>
          </View>
        </View>

        <View className="flex-row mt-4 p-1 rounded-xl bg-ground-subtle">
          {(['calendar', 'upcoming'] as ViewMode[]).map((mode) => {
            const selected = viewMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setViewMode(mode)}
                className={`flex-1 min-h-[42px] items-center justify-center rounded-lg ${selected ? 'bg-ground-surface' : ''}`}
              >
                <Text className={`font-bold ${selected ? 'text-brand-600 dark:text-brand-400' : 'text-text-muted'}`}>
                  {mode === 'calendar' ? 'Calendar' : 'Upcoming'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: APP_GUTTER, paddingTop: APP_PAGE_TOP, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {inventory.length === 0 ? (
          <EmptyState
            icon="CalendarDays"
            title="No expiry dates to plan yet"
            description="Add food to your kitchen and its expiry dates will appear here."
            actionLabel="Back to pantry"
            onAction={() => router.back()}
          />
        ) : viewMode === 'calendar' ? (
          <View className="gap-5">
            <View className="p-4 rounded-3xl bg-ground-surface border border-border-default">
              <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  onPress={() => moveMonth(-1)}
                  className="w-11 h-11 items-center justify-center rounded-xl bg-ground-subtle"
                >
                  <Icon name="ChevronLeft" size={18} color="#64748B" />
                </TouchableOpacity>
                <Typography variant="h2">{formatMonth(year, month)}</Typography>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  onPress={() => moveMonth(1)}
                  className="w-11 h-11 items-center justify-center rounded-xl bg-ground-subtle"
                >
                  <Icon name="ChevronRight" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View className="flex-row mb-2">
                {WEEKDAYS.map((day) => (
                  <View key={day} style={{ width: '14.285714%' }} className="items-center">
                    <Text className="text-[11px] font-semibold text-text-muted">{day.slice(0, 1)}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap">
                {cells.map((cell, index) => (
                  <View key={cell?.date || `blank-${index}`} style={{ width: '14.285714%' }} className="p-0.5">
                    {cell ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedDate === cell.date }}
                        accessibilityLabel={`${formatLongDate(cell.date)}, ${cell.count} expiring items`}
                        onPress={() => setSelectedDate(cell.date)}
                        className={`min-h-[54px] rounded-xl items-center justify-center border ${
                          selectedDate === cell.date
                            ? 'bg-brand-500 border-brand-500'
                            : cell.date === today
                            ? 'border-brand-500 bg-ground-canvas'
                            : 'border-transparent'
                        }`}
                      >
                        <Text className={`font-semibold ${selectedDate === cell.date ? 'text-white' : 'text-text-primary'}`}>
                          {cell.day}
                        </Text>
                        {cell.count > 0 && (
                          <View
                            className="mt-1 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center"
                            style={{ backgroundColor: cell.tone ? toneColors[cell.tone] : '#10B981' }}
                          >
                            <Text className="text-white text-[10px] font-bold">{cell.count}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View className="min-h-[54px]" />
                    )}
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap gap-3 mt-4 pt-3 border-t border-border-default">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toneColors.critical }} />
                  <Typography variant="caption" color="muted">Today / overdue</Typography>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toneColors.soon }} />
                  <Typography variant="caption" color="muted">Within 7 days</Typography>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toneColors.fresh }} />
                  <Typography variant="caption" color="muted">Later</Typography>
                </View>
              </View>
            </View>

            <View className="gap-2.5">
              <View>
                <Typography variant="h2">{formatLongDate(selectedDate)}</Typography>
                <Typography variant="caption" color="muted">
                  {selectedItems.length === 0
                    ? 'Nothing expires on this day.'
                    : `${selectedItems.length} ${selectedItems.length === 1 ? 'item expires' : 'items expire'} on this day.`}
                </Typography>
              </View>
              {selectedItems.map((item) => (
                <ExpiryItemRow key={item.id} item={item} today={today} onPress={openInventoryItem} />
              ))}
            </View>

            <TimelineSection
              title="No expiry date"
              hint="These items stay separate until you add or predict a date."
              items={timeline.unknown}
              today={today}
              onPress={openInventoryItem}
            />
          </View>
        ) : (
          <View className="gap-6">
            {timeline.expired.length === 0 &&
              timeline.today.length === 0 &&
              timeline.tomorrow.length === 0 &&
              timeline.week.length === 0 &&
              timeline.later.length === 0 && (
                <EmptyState
                  icon="CalendarClock"
                  title="Nothing dated yet"
                  description="Items with expiry dates will appear in the upcoming timeline."
                />
              )}

            <TimelineSection
              title="Expired"
              hint="Review these before using them."
              items={timeline.expired}
              today={today}
              onPress={openInventoryItem}
            />
            <TimelineSection
              title="Today"
              hint="Check these first."
              items={timeline.today}
              today={today}
              onPress={openInventoryItem}
            />
            <TimelineSection
              title="Tomorrow"
              hint="Good candidates for your next meal."
              items={timeline.tomorrow}
              today={today}
              onPress={openInventoryItem}
            />
            <TimelineSection
              title="This Week"
              hint="Expires within the next seven days."
              items={timeline.week}
              today={today}
              onPress={openInventoryItem}
            />
            <TimelineSection
              title="Later"
              hint="You have more time with these."
              items={timeline.later}
              today={today}
              onPress={openInventoryItem}
            />
            <TimelineSection
              title="No expiry date"
              hint="Add or predict a date to place these on the timeline."
              items={timeline.unknown}
              today={today}
              onPress={openInventoryItem}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
