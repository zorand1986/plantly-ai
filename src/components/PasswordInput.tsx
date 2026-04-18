import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props extends Omit<TextInputProps, 'secureTextEntry'> {
  /** Forwarded to the outer wrapper (replaces the old input marginBottom) */
  wrapperStyle?: object;
}

/**
 * A password TextInput with an eye toggle on the right.
 * Drop-in replacement for the plain TextInput used on auth screens.
 * All TextInput props except secureTextEntry are forwarded as-is.
 */
export const PasswordInput: React.FC<Props> = ({wrapperStyle, style, ...props}) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      <TextInput
        {...props}
        style={[styles.input, style]}
        secureTextEntry={!visible}
      />
      <TouchableOpacity
        onPress={() => setVisible(v => !v)}
        activeOpacity={0.6}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        style={styles.toggle}>
        {/* Eye icon: open when password is hidden, closed when visible */}
        <Text style={[styles.icon, visible && styles.iconActive]}>
          {visible ? '🙈' : '👁'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111111',
  },
  toggle: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    opacity: 0.4,
  },
  iconActive: {
    opacity: 0.9,
  },
});
