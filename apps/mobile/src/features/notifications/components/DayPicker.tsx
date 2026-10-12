import { Button, Dialog, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import {
  dayLabel,
  indiaToday,
  monthGrid,
  monthLabel,
  shiftDay,
  WEEKDAY_INITIALS,
} from '../india-day.ts';

type DayPickerProps = {
  selectedDate: string;
  onSelect: (isoDate: string) => void;
};

function dayTone(isSelected: boolean, isFuture: boolean): string {
  if (isSelected) return 'font-bold text-accent-foreground';
  if (isFuture) return 'text-muted/40';
  return 'text-foreground';
}

export function DayPicker({ selectedDate, onSelect }: DayPickerProps) {
  const accent = useThemeColor('accent');
  const muted = useThemeColor('muted');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [shownMonth, setShownMonth] = useState(selectedDate);

  const today = indiaToday();
  const isToday = selectedDate === today;

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        className="h-9 w-9 items-center justify-center rounded-full bg-surface"
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        onPress={() => {
          onSelect(shiftDay(selectedDate, -1));
        }}
      >
        <Icon name="chevronLeft" color={accent} size={18} />
      </Pressable>

      <Pressable
        className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-surface py-2.5"
        accessibilityRole="button"
        accessibilityLabel={`${dayLabel(selectedDate)}. Pick another day.`}
        onPress={() => {
          setShownMonth(selectedDate);
          setIsCalendarOpen(true);
        }}
      >
        <Icon name="calendar" color={accent} size={16} />
        <Text className="text-sm font-bold text-foreground">{dayLabel(selectedDate)}</Text>
      </Pressable>

      <Pressable
        className="h-9 w-9 items-center justify-center rounded-full bg-surface"
        accessibilityRole="button"
        accessibilityLabel="Next day"
        accessibilityState={{ disabled: isToday }}
        disabled={isToday}
        onPress={() => {
          onSelect(shiftDay(selectedDate, 1));
        }}
      >
        <Icon name="chevronRight" color={isToday ? muted : accent} size={18} />
      </Pressable>

      <Dialog isOpen={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content isSwipeable={false} className="gap-4">
            <Dialog.Close />
            <Dialog.Title>Pick a day</Dialog.Title>

            <View className="flex-row items-center justify-between">
              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary"
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => {
                  setShownMonth(shiftDay(`${shownMonth.slice(0, 8)}01`, -1));
                }}
              >
                <Icon name="chevronLeft" color={accent} size={18} />
              </Pressable>

              <Text className="text-base font-bold text-foreground">{monthLabel(shownMonth)}</Text>

              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary"
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => {
                  setShownMonth(shiftDay(`${shownMonth.slice(0, 8)}28`, 7));
                }}
              >
                <Icon name="chevronRight" color={accent} size={18} />
              </Pressable>
            </View>

            <View className="flex-row">
              {WEEKDAY_INITIALS.map((initial, index) => (
                <Text
                  key={`${initial}-${String(index)}`}
                  className="flex-1 text-center text-xs font-bold text-muted"
                >
                  {initial}
                </Text>
              ))}
            </View>

            <View className="gap-1">
              {monthGrid(shownMonth).map((week, weekIndex) => (
                <View key={`week-${String(weekIndex)}`} className="flex-row">
                  {week.map((cell, dayIndex) => {
                    if (cell === null) {
                      return <View key={`pad-${String(dayIndex)}`} className="flex-1 py-2" />;
                    }

                    const isSelected = cell.isoDate === selectedDate;
                    const isFuture = cell.isoDate > today;

                    return (
                      <Pressable
                        key={cell.isoDate}
                        className="flex-1 items-center py-1"
                        accessibilityRole="button"
                        accessibilityLabel={dayLabel(cell.isoDate)}
                        accessibilityState={{ disabled: isFuture, selected: isSelected }}
                        disabled={isFuture}
                        onPress={() => {
                          onSelect(cell.isoDate);
                          setIsCalendarOpen(false);
                        }}
                      >
                        <View
                          className={`h-9 w-9 items-center justify-center rounded-full ${
                            isSelected ? 'bg-accent' : ''
                          }`}
                        >
                          <Text className={`text-sm ${dayTone(isSelected, isFuture)}`}>
                            {String(cell.day)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <Button
              variant="tertiary"
              onPress={() => {
                onSelect(today);
                setIsCalendarOpen(false);
              }}
            >
              Jump to today
            </Button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}
