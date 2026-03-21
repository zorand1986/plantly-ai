# AGENTS.md - Guidelines for Agentic Coding Agents

## Project Overview

This is a React Native application called "PlantReminder" for tracking plant watering schedules. The app allows users to add plants, set watering intervals, mark plants as watered, and receive notifications.

## Build/Lint/Test Commands

### Development Commands

```bash
# Start Metro bundler
yarn start

# Run on Android
yarn android

# Run on iOS
yarn ios

# Lint the codebase
yarn lint

# Run tests
yarn test

# Run a single test (specific test file)
yarn test __tests__/App.test.tsx

# Run tests in watch mode
yarn test --watch
```

### Project Structure

```
src/
├── components/     # Reusable components (PlantCard)
├── screens/        # Screen components (HomeScreen, PlantDetailScreen, etc.)
├── utils/          # Utility functions (storage, notifications)
└── App.tsx         # Main application entry point
```

## Code Style Guidelines

### TypeScript/JavaScript Conventions

- Use TypeScript for all new files (.tsx/.ts)
- Follow React Native component patterns with functional components and hooks
- Use `interface` for prop definitions, `type` for complex types
- Prefer named exports over default exports where appropriate
- Use PascalCase for component names, camelCase for variables/functions
- Constants in UPPER_SNAKE_CASE

### Import Organization

1. React imports
2. Third-party library imports
3. Relative imports (components, screens, utils)
4. Type imports
5. Group related imports with blank lines

Example:

```typescript
import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {Plant} from '../utils/storage';
import {RootStackParamList} from '../../App';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
```

### Formatting

- Use Prettier for code formatting (configured via .prettierrc.js)
- Maximum line length: 100 characters
- Use 2 spaces for indentation
- No trailing commas in object literals/arrays (except for multi-line)
- Semicolons required

### Naming Conventions

- Components: PascalCase (PlantCard, HomeScreen)
- Variables/functions: camelCase (getPlants, formatDate)
- Constants: UPPER_SNAKE_CASE (DEFAULT_INTERVAL)
- Files: PascalCase for components (PlantCard.tsx), camelCase for utilities (storage.ts)
- Interfaces: PascalCase with I prefix optional (IPlantProps or PlantProps)
- Types: PascalCase (Plant, RootStackParamList)

### Error Handling

- Use try/catch for asynchronous operations
- Show user-friendly alerts for errors using Alert.alert()
- Validate inputs before processing
- Handle null/undefined cases with proper checks
- Log errors during development but avoid console.log in production

Example:

```typescript
const handleSaveInterval = async () => {
  if (!plant) return;
  const days = parseInt(intervalDays, 10);
  if (isNaN(days) || days < 1) {
    Alert.alert('Invalid interval', 'Please enter a valid number of days.');
    return;
  }
  setSaving(true);
  try {
    // ... update logic
  } finally {
    setSaving(false);
  }
};
```

### React Native Specific

- Use SafeAreaView for iPhone X+ compatibility
- Platform-specific code when needed: Platform.OS === 'ios' ? ... : ...
- Image components require explicit width/height or flex dimensions
- TouchableOpacity for pressable elements with activeOpacity feedback
- FlatList for large datasets with keyExtractor
- Avoid inline styles in render loops; use StyleSheet.create

### State Management

- Use useState for local component state
- Use useCallback for functions passed as props to prevent unnecessary re-renders
- Use useEffect for side effects (data fetching, subscriptions)
- Use useFocusEffect from @react-navigation/native for screen-focused logic
- Lift state up when multiple components need to share data

### Storage Pattern

The app uses AsyncStorage through utility functions in src/utils/storage.ts:

- getPlants(): Promise<Plant[]>
- updatePlant(plant: Plant): Promise<void>
- deletePlant(id: string): Promise<void>
- Plant interface includes: id, name, intervalDays, lastWatered, nextReminder, notificationId?, photoUri?

### Notifications

- Uses @notifee/react-native for local notifications
- Notification channel setup in App.tsx
- scheduleNotification(plant: Plant): Promise<string>
- cancelNotification(notificationId: string): Promise<void>

## Testing Guidelines

- Tests located in **tests** directory
- Use React Test Renderer for component testing
- Mock AsyncStorage and notification modules when needed
- Test both positive and negative cases
- Aim for testing user interactions and edge cases

Example test structure:

```typescript
test('renders correctly', async () => {
  await act(async () => {
    const component = create(<Component />);
    // assertions
  });
});
```

## Performance Considerations

- Use React.memo for expensive components with stable props
- Implement shouldComponentUpdate or useMemo where appropriate
- Avoid anonymous functions in render passes; use useCallback
- Optimize image loading with proper dimensions and caching
- Use FlatList's removeClippedSubviews for long lists
- Debounce frequent updates (like text input)

## Accessibility

- Include accessibilityLabels for interactive elements
- Ensure sufficient color contrast
- Support dynamic text sizing
- Test with TalkBack (Android) and VoiceOver (iOS)

## Platform Specifics

- Android: Use elevation for shadows
- iOS: Use shadowColor, shadowOffset, shadowOpacity, shadowRadius
- Handle keyboard avoidance with KeyboardAvoidingView
- StatusBar styling for both platforms

## Common Patterns in This Codebase

1. Plant data flow: storage -> screens -> components
2. Notification scheduling tied to plant updates
3. Date formatting helper functions (formatDate, daysLabel)
4. Status color coding based on urgency
5. Modal-less UI using touchable feedback and alerts
