import React from "react";
import { StyleSheet, View, Text } from "react-native";

export interface MarkdownTextMobileProps {
  content: string;
  color?: string;
  mutedColor?: string;
  bulletColor?: string;
  fontSize?: number;
}

/**
 * Renders formatted markdown for mobile chat bubbles:
 * handles **bold**, *italic*, numbered lists, and bullet points.
 */
export const MarkdownTextMobile: React.FC<MarkdownTextMobileProps> = ({
  content,
  color = "#18181B",
  mutedColor = "#71717A",
  bulletColor = "#7E22CE",
  fontSize = 15,
}) => {
  const parseInline = (text: string, keyPrefix: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      const key = `${keyPrefix}-${index}`;
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <Text key={key} style={[styles.bold, { color, fontSize }]}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        return (
          <Text key={key} style={[styles.italic, { color: mutedColor, fontSize }]}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return (
        <Text key={key} style={{ color, fontSize }}>
          {part}
        </Text>
      );
    });
  };

  const paragraphs = content.split(/\n\s*\n/);

  return (
    <View style={styles.container}>
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        const lines = trimmed.split("\n");
        const isList = lines.every((l) => /^\s*([•\-*]|\d+\.)\s/.test(l));

        if (isList) {
          return (
            <View key={`p-${pIdx}`} style={styles.listContainer}>
              {lines.map((line, lIdx) => {
                const numMatch = line.match(/^\s*(\d+\.)\s+(.*)/);
                if (numMatch) {
                  return (
                    <View key={`l-${lIdx}`} style={styles.listItem}>
                      <Text style={[styles.listNum, { color: bulletColor, fontSize }]}>
                        {numMatch[1]}
                      </Text>
                      <Text style={[styles.listText, { color, fontSize }]}>
                        {parseInline(numMatch[2], `num-${pIdx}-${lIdx}`)}
                      </Text>
                    </View>
                  );
                }

                const bulletMatch = line.match(/^\s*([•\-*])\s+(.*)/);
                if (bulletMatch) {
                  return (
                    <View key={`l-${lIdx}`} style={styles.listItem}>
                      <Text style={[styles.listBullet, { color: bulletColor, fontSize }]}>•</Text>
                      <Text style={[styles.listText, { color, fontSize }]}>
                        {parseInline(bulletMatch[2], `bullet-${pIdx}-${lIdx}`)}
                      </Text>
                    </View>
                  );
                }

                return (
                  <Text key={`l-${lIdx}`} style={[styles.paragraphText, { color, fontSize }]}>
                    {parseInline(line, `l-raw-${pIdx}-${lIdx}`)}
                  </Text>
                );
              })}
            </View>
          );
        }

        return (
          <View key={`p-${pIdx}`} style={styles.paragraph}>
            <Text style={[styles.paragraphText, { color, fontSize }]}>
              {lines.map((line, lIdx) => (
                <React.Fragment key={`line-${pIdx}-${lIdx}`}>
                  {parseInline(line, `p-${pIdx}-l-${lIdx}`)}
                  {lIdx < lines.length - 1 ? "\n" : ""}
                </React.Fragment>
              ))}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
  },
  paragraph: {
    width: "100%",
  },
  paragraphText: {
    width: "100%",
    lineHeight: 22,
  },
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  listContainer: {
    width: "100%",
    gap: 6,
    marginVertical: 2,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    gap: 8,
  },
  listNum: {
    fontWeight: "700",
    minWidth: 20,
    lineHeight: 22,
  },
  listBullet: {
    fontWeight: "900",
    minWidth: 12,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    flexShrink: 1,
    lineHeight: 22,
  },
});
