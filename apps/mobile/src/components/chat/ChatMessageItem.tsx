import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TripOption } from "@corvax/shared";
import { theme, getTheme } from "../../theme";
import { MobileChatMessage } from "../../types";
import { TripCardMobile } from "../cards/TripCardMobile";
import { TripDossierView } from "../cards/TripDossierView";
import { ThinkingBubble } from "./ThinkingBubble";
import { ClarificationChipsMobile } from "./ClarificationChipsMobile";
import { Icon } from "../common/Icon";

export interface ChatMessageItemProps {
  message: MobileChatMessage;
  onSelectOption?: (option: TripOption | null) => void;
  onBookDemo?: (option: TripOption) => void;
  onSelectChip?: (text: string) => void;
  selectedOption?: TripOption | null;
  selectedOptionId?: string;
  isDark?: boolean;
}

export const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  message,
  onSelectOption,
  onBookDemo,
  onSelectChip,
  selectedOption,
  selectedOptionId,
  isDark = false,
}) => {
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const isUser = message.role === "user" || message.type === "human";
  const hasContent = Boolean(message.content && message.content.trim().length > 0);
  const optionsToRender = message.trip_options || message.tripOptions;
  const hasOptions = Boolean(optionsToRender && optionsToRender.length > 0);
  const isThinking = Boolean(message.isThinking);

  // Check if the currently selected option belongs to this assistant message
  const activeSelectedOption =
    selectedOption &&
    optionsToRender?.find(
      (opt: TripOption) =>
        opt.id === selectedOption.id || opt.title === selectedOption.title
    );

  // Guard against uninitialized empty bubbles
  if (!hasContent && !hasOptions && !isThinking) {
    return null;
  }

  const showClarification = !isUser && hasContent && !hasOptions && !isThinking && !selectedOptionId;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {/* Assistant Header with "О!" avatar badge, brand title and timestamp */}
      {!isUser && (
        <View style={styles.assistantHeaderRow}>
          <View style={styles.assistantAvatar}>
            <Text style={styles.avatarLettermark}>О!</Text>
          </View>
          <View style={styles.assistantMetaRow}>
            <Text style={[styles.assistantBrandName, { color: colors.textPrimary }]}>О!дин запрос</Text>
            {message.timestamp && (
              <Text style={[styles.assistantTimestamp, { color: colors.textMuted }]}>• {message.timestamp}</Text>
            )}
          </View>
        </View>
      )}

      <View style={[styles.contentCol, isUser ? styles.userContentCol : styles.assistantContentCol]}>
        {/* Thinking Indicator inside Assistant's Turn */}
        {isThinking && (
          <ThinkingBubble
            isThinking={true}
            currentStep={message.thinkingStep}
            statusText={message.thinkingText}
            isDark={isDark}
          />
        )}

        {/* Text bubble */}
        {hasContent && (
          <View
            style={[
              styles.bubble,
              isUser
                ? [
                    styles.userBubble,
                    {
                      backgroundColor: isDark ? colors.surfaceContainer : "#F0EDF1",
                      borderColor: colors.border,
                    },
                  ]
                : [
                    styles.assistantBubble,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ],
            ]}
          >
            <Text
              style={[
                styles.text,
                isUser ? styles.userText : styles.assistantText,
                { color: colors.textPrimary },
              ]}
            >
              {message.content}
            </Text>

            {/* Inline Clarification / Dynamic Suggestion Chips for assistant turn */}
            {showClarification && Boolean(message.suggestions && message.suggestions.length > 0) && (
              <ClarificationChipsMobile
                chips={message.suggestions}
                onSelectChip={onSelectChip}
                isDark={isDark}
              />
            )}

            {isUser && (
              <View style={styles.userMetaRow}>
                {message.timestamp && (
                  <Text style={[styles.userTimestamp, { color: colors.textMuted }]}>{message.timestamp}</Text>
                )}
                <Icon name="check" size={12} color={colors.primary} />
              </View>
            )}
          </View>
        )}

        {/* Curated Trip Dossier View when an option is selected from this message */}
        {activeSelectedOption ? (
          <TripDossierView
            option={activeSelectedOption}
            onBackToList={() => onSelectOption?.(null)}
            onBookTour={onBookDemo || (() => {})}
            isDark={isDark}
          />
        ) : (
          /* Embedded trip options cards list if no option is selected */
          hasOptions && optionsToRender && (
            <View style={styles.tripOptionsList}>
              {optionsToRender.map((opt: TripOption) => (
                <TripCardMobile
                  key={opt.id || opt.title}
                  option={opt}
                  isSelected={selectedOptionId === opt.id}
                  onSelect={onSelectOption}
                  onBookDemo={onBookDemo}
                  isDark={isDark}
                />
              ))}
            </View>
          )
        )}
      </View>
    </View>
  );
};

export const ChatMessageItem = memo(ChatMessageItemComponent);

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
    backgroundColor: theme.colors.surfaceContainer, // #F0EDF1
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface, // #FFFFFF
    borderWidth: 1,
    borderColor: theme.colors.border,
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
