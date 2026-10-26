import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TripOption } from "@corvax/shared";
import { theme } from "../../theme";
import { MobileChatMessage } from "../../types";
import { TripCardMobile } from "../cards/TripCardMobile";

export interface ChatMessageItemProps {
  message: MobileChatMessage;
  onSelectOption?: (option: TripOption) => void;
  onBookDemo?: (option: TripOption) => void;
  selectedOptionId?: string;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSelectOption,
  onBookDemo,
  selectedOptionId,
}) => {
  const isUser = message.role === "user";

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser && (
        <View style={styles.assistantAvatar}>
          <Text style={styles.avatarIcon}>✦</Text>
        </View>
      )}

      <View style={[styles.contentCol, isUser ? styles.userContentCol : styles.assistantContentCol]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
            {message.content}
          </Text>

          <View style={styles.metaRow}>
            {message.timestamp && (
              <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
                {message.timestamp}
              </Text>
            )}
            {isUser && <Text style={styles.readCheckmark}>✓✓</Text>}
          </View>
        </View>

        {/* Embedded trip options if provided in this message */}
        {message.tripOptions && message.tripOptions.length > 0 && (
          <View style={styles.tripOptionsList}>
            {message.tripOptions.map((opt) => (
              <TripCardMobile
                key={opt.id || opt.title}
                option={opt}
                isSelected={selectedOptionId === opt.id}
                onSelect={onSelectOption}
                onBookDemo={onBookDemo}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  assistantContainer: {
    justifyContent: "flex-start",
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    ...theme.shadows.sm,
  },
  avatarIcon: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  contentCol: {
    maxWidth: "85%",
  },
  userContentCol: {
    alignItems: "flex-end",
    flex: 1,
  },
  assistantContentCol: {
    alignItems: "flex-start",
    flex: 1,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    ...theme.shadows.sm,
  },
  userBubble: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: "#DCE2F7",
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: theme.colors.textPrimary,
  },
  assistantText: {
    color: theme.colors.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 6,
  },
  timestamp: {
    fontSize: 11,
  },
  userTimestamp: {
    color: theme.colors.textTertiary,
  },
  assistantTimestamp: {
    color: theme.colors.textTertiary,
  },
  readCheckmark: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  tripOptionsList: {
    width: "100%",
    marginTop: 10,
  },
});
