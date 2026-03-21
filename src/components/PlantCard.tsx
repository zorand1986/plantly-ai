import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {Plant} from '../utils/storage';

interface Props {
  plant: Plant;
  onPress: (plant: Plant) => void;
}

function formatLastWatered(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDaysLeft(nextReminder: number): string {
  const now = Date.now();
  const diffMs = nextReminder - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

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
  const now = Date.now();
  const diffDays = Math.ceil((nextReminder - now) / (1000 * 60 * 60 * 24));
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
      <View style={styles.imageContainer}>
        {plant.photoUri ? (
          <Image source={{uri: plant.photoUri}} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>🌱</Text>
          </View>
        )}
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
      <View style={[styles.badge, {backgroundColor: statusColor}]}>
        <Text style={styles.badgeText}>{daysLabel}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  imageContainer: {
    marginRight: 14,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 30,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1b5e20',
    marginBottom: 4,
  },
  interval: {
    fontSize: 13,
    color: '#757575',
  },
  lastWatered: {
    fontSize: 11,
    color: '#9e9e9e',
    marginTop: 2,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
