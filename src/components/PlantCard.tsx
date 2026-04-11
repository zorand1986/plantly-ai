import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {Plant} from '../utils/storage';

interface Props {
  plant: Plant;
  onPress: (plant: Plant) => void;
}

function formatLastWatered(timestamp: number): string {
  const now = new Date();
  const watered = new Date(timestamp);

  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (watered.toDateString() === todayStr) return 'Today';
  if (watered.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const nowMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const wateredMidnight = new Date(
    watered.getFullYear(),
    watered.getMonth(),
    watered.getDate(),
  );
  const diffDays = Math.round(
    (nowMidnight.getTime() - wateredMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 7) return `${diffDays} days ago`;
  return watered.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function diffCalendarDays(nextReminder: number): number {
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const reminderDate = new Date(nextReminder);
  const reminderMidnight = new Date(
    reminderDate.getFullYear(),
    reminderDate.getMonth(),
    reminderDate.getDate(),
  ).getTime();
  return Math.round((reminderMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
}

function formatDaysLeft(nextReminder: number): string {
  const diffDays = diffCalendarDays(nextReminder);
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

function getStatusColors(nextReminder: number): {bg: string; fg: string} {
  const diffDays = diffCalendarDays(nextReminder);
  if (diffDays < 0) return {bg: '#FEF2F2', fg: '#DC2626'};
  if (diffDays === 0) return {bg: '#FFF7ED', fg: '#D97706'};
  if (diffDays <= 2) return {bg: '#FEFCE8', fg: '#CA8A04'};
  return {bg: '#F0FDF4', fg: '#2B5F2B'};
}

export const PlantCard: React.FC<Props> = ({plant, onPress}) => {
  const daysLabel = formatDaysLeft(plant.nextReminder);
  const {bg: statusBg, fg: statusFg} = getStatusColors(plant.nextReminder);
  const lastWateredLabel = formatLastWatered(plant.lastWatered);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(plant)}
      activeOpacity={0.7}>
      {plant.photoUri ? (
        <Image source={{uri: plant.photoUri}} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderEmoji}>🌱</Text>
        </View>
      )}
      <View style={[styles.badge, {backgroundColor: statusBg}]}>
        <Text style={[styles.badgeText, {color: statusFg}]}>{daysLabel}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {plant.name}
        </Text>
        <Text style={styles.interval}>
          Every {plant.intervalDays} day{plant.intervalDays !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.lastWatered}>Watered: {lastWateredLabel}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    margin: 5,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeholderEmoji: {
    fontSize: 38,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 7,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  info: {
    alignSelf: 'stretch',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  interval: {
    fontSize: 11,
    color: '#888888',
  },
  lastWatered: {
    fontSize: 10,
    color: '#AAAAAA',
    marginTop: 2,
  },
});
