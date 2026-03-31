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

  if (diffDays < 0) {
    return 'Overdue!';
  }
  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Tomorrow';
  }
  return `In ${diffDays} days`;
}

function getStatusColor(nextReminder: number): string {
  const diffDays = diffCalendarDays(nextReminder);
  if (diffDays < 0) return '#e53935';
  if (diffDays === 0) return '#fb8c00';
  if (diffDays <= 2) return '#fdd835';
  return '#43a047';
}

export const PlantCard: React.FC<Props> = ({plant, onPress}) => {
  const daysLabel = formatDaysLeft(plant.nextReminder);
  const statusColor = getStatusColor(plant.nextReminder);
  const lastWateredLabel = formatLastWatered(plant.lastWatered);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(plant)}
      activeOpacity={0.8}>
      {plant.photoUri ? (
        <Image source={{uri: plant.photoUri}} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderEmoji}>🌱</Text>
        </View>
      )}
      <View style={[styles.badge, {backgroundColor: statusColor}]}>
        <Text style={styles.badgeText}>{daysLabel}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {plant.name}
        </Text>
        <Text style={styles.interval}>
          Every {plant.intervalDays} day{plant.intervalDays !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.lastWatered}>Last watered: {lastWateredLabel}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 4,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  info: {
    alignSelf: 'stretch',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b5e20',
    marginBottom: 2,
  },
  interval: {
    fontSize: 12,
    color: '#757575',
  },
  lastWatered: {
    fontSize: 11,
    color: '#9e9e9e',
    marginTop: 2,
  },
});
