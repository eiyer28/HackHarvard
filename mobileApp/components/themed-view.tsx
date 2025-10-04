import {
  View,
  Pressable,
  type ViewProps,
  type PressableProps,
} from "react-native";

export type ThemedViewProps = (ViewProps | PressableProps) & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = "#EEEEEE";

  // If an onPress prop is provided, render a Pressable so touch events work on native.
  if ((otherProps as PressableProps).onPress) {
    // Pressable accepts a function style; cast to any to satisfy TypeScript differences
    return (
      <Pressable
        style={[{ backgroundColor }, style] as any}
        {...(otherProps as PressableProps)}
      />
    );
  }

  return (
    <View
      style={[{ backgroundColor }, style] as any}
      {...(otherProps as ViewProps)}
    />
  );
}
