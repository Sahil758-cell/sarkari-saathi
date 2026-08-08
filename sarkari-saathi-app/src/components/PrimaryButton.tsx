import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { colors, fonts, gradients, radius, shadow, spacing } from "../theme";

interface Props {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  disabled?: boolean;
  loading?: boolean;
  variant?: "solid" | "outline";
}

export default function PrimaryButton({
  title,
  onPress,
  icon,
  iconPosition = "right",
  disabled,
  loading,
  variant = "solid",
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  function animateTo(value: number) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  }

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  // Disabled solid buttons render as a flat gray block (no gradient, no
  // shadow) rather than the normal gradient dimmed via opacity — combining
  // reduced opacity with an elevation-based shadow renders as a stray
  // whitish box on Android, since the shadow layer doesn't fade with it.
  const isFlatDisabled = isDisabled && variant === "solid";
  const iconColor =
    variant === "solid" ? "#fff" : isDisabled ? colors.textFaint : colors.primary;
  const textStyle =
    variant === "solid"
      ? styles.textSolid
      : isDisabled
        ? styles.textOutlineDisabled
        : styles.textOutline;
  const content = (
    <>
      {icon && iconPosition === "left" ? (
        <Ionicons name={icon} size={18} color={iconColor} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <Text style={textStyle} numberOfLines={1}>
          {title}
        </Text>
      )}
      {icon && iconPosition === "right" && !loading ? (
        <Ionicons name={icon} size={18} color={iconColor} />
      ) : null}
    </>
  );

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={isDisabled ? undefined : handlePress}
        onPressIn={() => !isDisabled && animateTo(0.97)}
        onPressOut={() => !isDisabled && animateTo(1)}
        disabled={isDisabled}
      >
        {variant === "solid" ? (
          isFlatDisabled ? (
            <Animated.View style={[styles.button, styles.disabledButton]}>{content}</Animated.View>
          ) : (
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.button, shadow.button]}
            >
              {content}
            </LinearGradient>
          )
        ) : (
          <Animated.View
            style={[styles.button, isDisabled ? styles.outlineDisabled : styles.outlineButton]}
          >
            {content}
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  outlineDisabled: {
    borderWidth: 1.5,
    borderColor: colors.textFaint,
    backgroundColor: colors.surface,
  },
  disabledButton: { backgroundColor: colors.textFaint },
  textSolid: { color: "#fff", fontFamily: fonts.bold, fontSize: 16 },
  textOutline: { color: colors.primary, fontFamily: fonts.bold, fontSize: 15 },
  textOutlineDisabled: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 15 },
});
