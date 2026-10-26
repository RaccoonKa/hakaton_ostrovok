import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
} from "react-native";
import { theme } from "../../theme";

export interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  isListening?: boolean;
  onToggleMic?: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  value,
  onChangeText,
  onSend,
  disabled = false,
  placeholder = "Спросите или уточните детали...",
  isListening = false,
  onToggleMic,
}) => {
  const [inputHeight, setInputHeight] = useState(40);
  const hasText = value.trim().length > 0;

  const handleKeyPress = (e: any) => {
    // Support Enter to submit on web
    if (Platform.OS === "web" && e.nativeEvent?.key === "Enter" && !e.nativeEvent?.shiftKey) {
      e.preventDefault();
      if (hasText && !disabled) {
        onSend();
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputCard}>
        <TextInput
          style={[styles.input, { height: Math.min(Math.max(40, inputHeight), 100) }]}
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
        />

        <View style={styles.bottomBar}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              style={[styles.iconButton, isListening && styles.micActiveButton]}
              onPress={onToggleMic}
              accessibilityLabel="Голосовой ввод"
            >
              <Text style={[styles.iconText, isListening && styles.micActiveText]}>
                🎤
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              hasText && !disabled ? styles.sendButtonActive : styles.sendButtonDisabled,
            ]}
            onPress={onSend}
            disabled={!hasText || disabled}
            accessibilityLabel="Отправить"
          >
            <Text style={styles.sendButtonArrow}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputCard: {
    backgroundColor: theme.colors.canvasMuted,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    textAlignVertical: "top",
    padding: 0,
    minHeight: 36,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 16,
  },
  micActiveButton: {
    backgroundColor: "#FEE2E2",
  },
  micActiveText: {
    color: "#DC2626",
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  sendButtonArrow: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
