import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TripOption } from "@corvax/shared";
import { theme } from "../../theme";
import { MobileChatMessage } from "../../types";
import { TripCardMobile } from "../cards/TripCardMobile";
import { Icon } from "../common/Icon";

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
  const hasContent = Boolean(message.content && message.content.trim().length > 0);
  const hasOptions = Boolean(message.tripOptions && message.tripOptions.length > 0);

  // Guard against empty bubbles during state initialization or before first stream token
  if (!hasContent && !hasOptions) {
    return null;
  }

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {/* Assistant Header with "О!" avatar badge, brand title and timestamp */}
      {!isUser && (
        <View style={styles.assistantHeaderRow}>
          <View style={styles.assistantAvatar}>
            <Text style={styles.avatarLettermark}>О!</Text>
          </View>
          <View style={styles.assistantMetaRow}>
            <Text style={styles.assistantBrandName}>О!дин запрос</Text>
            {message.timestamp && (
              <Text style={styles.assistantTimestamp}>• {message.timestamp}</Text>
            )}
          </View>
        </View>
      )}

      <View style={[styles.contentCol, isUser ? styles.userContentCol : styles.assistantContentCol]}>
        {hasContent && (
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
              {message.content}
            </Text>

            {isUser && (
              <View style={styles.userMetaRow}>
                {message.timestamp && (
                  <Text style={styles.userTimestamp}>{message.timestamp}</Text>
                )}
                <Icon name="check" size={12} color={theme.colors.primary} />
              </View>
            )}
          </View>
        )}

        {/* Embedded trip options if provided in this message */}
        {hasOptions && message.tripOptions && (
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
    width: "100%",
  },
  userContainer: {
    alignItems: "flex-end",
    paddingLeft: 40,
  },
  assistantContainer: {
    alignItems: "flex-start",
    paddingRight: 16,
  },
  assistantHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.headerBg, // #581C87
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.sm,
  },
  avatarLettermark: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  assistantMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  assistantBrandName: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  assistantTimestamp: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  contentCol: {
    width: "100%",
  },
  userContentCol: {
    alignItems: "flex-end",
  },
  assistantContentCol: {
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    maxWidth: "100%",
    ...theme.shadows.sm,
  },
  userBubble: {
    backgroundColor: theme.colors.surfaceContainer, // #F0EDF1 (matches web user bubble)
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border, // #E5E5EB
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface, // #FFFFFF
    borderWidth: 1,
    borderColor: theme.colors.border, // #E5E5EB
    borderTopLeftRadius: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: theme.colors.textPrimary,
  },
  assistantText: {
    color: theme.colors.textPrimary,
  },
  userMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  userTimestamp: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  tripOptionsList: {
    width: "100%",
    marginTop: 10,
  },
});
