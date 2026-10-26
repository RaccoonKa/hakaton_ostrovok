import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";

export interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  isListening?: boolean;
  onToggleMic?: () => void;
  onFilterPress?: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  value,
  onChangeText,
  onSend,
  disabled = false,
  placeholder = "Спросите или уточните детали...",
  isListening = false,
  onToggleMic,
  onFilterPress,
}) => {
  const insets = useSafeAreaInsets();
  const [inputHeight, setInputHeight] = useState(40);
  const hasText = value.trim().length > 0;

  const handleKeyPress = (e: any) => {
    if (Platform.OS === "web" && e.nativeEvent?.key === "Enter" && !e.nativeEvent?.shiftKey) {
      e.preventDefault();
      if (hasText && !disabled) {
        onSend();
      }
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={styles.inputCard}>
        <TextInput
          style={[styles.input, { height: Math.min(Math.max(40, inputHeight), 120) }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          onContentSizeChange={(e) => {
            setInputHeight(e.nativeEvent.contentSize.height);
          }}
          onKeyPress={handleKeyPress}
          editable={!disabled}
          accessibilityLabel="Поле ввода запроса"
        />

        <View style={styles.bottomBar}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              style={[styles.iconButton, isListening && styles.micActiveButton]}
              onPress={onToggleMic}
              accessibilityLabel="Голосовой ввод"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={[styles.iconText, isListening && styles.micActiveText]}>
                🎤
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={onFilterPress}
              accessibilityLabel="Фильтры и пожелания"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.iconText}>⚙️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              hasText && !disabled ? styles.sendButtonActive : styles.sendButtonDisabled,
            ]}
            onPress={onSend}
            disabled={!hasText || disabled}
            accessibilityLabel="Отправить запрос"
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sendButtonArrow,
                hasText && !disabled ? styles.sendArrowActive : styles.sendArrowDisabled,
              ]}
            >
              ↑
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  inputCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    paddingTop: 4,
    paddingBottom: 4,
    textAlignVertical: "top",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 4,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  iconText: {
    fontSize: 15,
  },
  micActiveButton: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  micActiveText: {
    color: "#EF4444",
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  sendButtonActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  sendButtonArrow: {
    fontSize: 18,
    fontWeight: "700",
  },
  sendArrowDisabled: {
    color: theme.colors.textMuted,
  },
  sendArrowActive: {
    color: "#FFFFFF",
  },
});
