import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, getTheme } from "../../theme";
import { Icon } from "../common/Icon";

export interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  onFilterPress?: () => void;
  isDark?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  value,
  onChangeText,
  onSend,
  disabled = false,
  placeholder = "Куда вы хотите поехать?",
  onFilterPress,
  isDark = false,
}) => {
  const insets = useSafeAreaInsets();
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

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
        {
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: colors.background,
          borderTopColor: colors.borderSubtle,
        },
      ]}
    >
      <View
        style={[
          styles.inputCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              height: Math.min(Math.max(40, inputHeight), 120),
              color: colors.textPrimary,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
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
              style={[
                styles.filterButton,
                { backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted },
              ]}
              onPress={onFilterPress}
              accessibilityLabel="Параметры поиска"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Icon name="sliders" size={16} color={colors.textSecondary} />
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
            <Icon
              name="send"
              size={15}
              color={hasText && !disabled ? "#FFFFFF" : colors.textMuted}
            />
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
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...theme.shadows.sm,
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
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.canvasMuted,
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
    backgroundColor: theme.colors.primary, // #581C87
    ...theme.shadows.sm,
  },
});
