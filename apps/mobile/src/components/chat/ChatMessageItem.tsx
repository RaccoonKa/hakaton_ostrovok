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
          <Text style={styles.avatarIcon}>✨</Text>
        </View>
      )}

      <View style={[styles.contentCol, isUser ? styles.userContentCol : styles.assistantContentCol]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
            {message.content}
          </Text>

          {message.timestamp && (
            <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
              {message.timestamp}
            </Text>
          )}
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
    marginVertical: 4,
    flexDirection: "row",
    gap: 8,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  assistantContainer: {
    justifyContent: "flex-start",
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  avatarIcon: {
    fontSize: 13,
  },
  contentCol: {
    maxWidth: "85%",
  },
  userContentCol: {
    alignItems: "flex-end",
  },
  assistantContentCol: {
    alignItems: "flex-start",
    flex: 1,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
  },
  assistantText: {
    color: theme.colors.textPrimary,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  assistantTimestamp: {
    color: theme.colors.textTertiary,
  },
  tripOptionsList: {
    width: "100%",
    marginTop: 10,
    gap: 12,
  },
});
