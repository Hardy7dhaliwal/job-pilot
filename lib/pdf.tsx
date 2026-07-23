import "server-only";

/**
 * Server-only markdown-to-PDF renderer.
 *
 * WARNING: @react-pdf/renderer is not browser-safe. This module must only
 * be imported by API routes (Node.js runtime). Never import it into client
 * components or pages.
 */
import React, { ReactNode } from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";
import { marked, Token, Tokens } from "marked";

const styles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 18,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.3,
    color: "#111827",
  },
  h1: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 2,
    color: "#111827",
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 10,
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
    color: "#111827",
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    marginTop: 6,
    marginBottom: 2,
    color: "#111827",
  },
  paragraph: {
    marginBottom: 4,
    color: "#374151",
  },
  headerContact: {
    marginBottom: 4,
    color: "#374151",
    textAlign: "center",
  },
  list: {
    marginLeft: 8,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bullet: {
    width: 8,
    color: "#374151",
  },
  listItemText: {
    flex: 1,
    color: "#374151",
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
  },
  strong: {
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  em: {
    fontStyle: "italic",
  },
  code: {
    fontFamily: "Courier",
    fontSize: 9,
    backgroundColor: "#f3f4f6",
    padding: 2,
    borderRadius: 2,
  },
  blockquote: {
    marginLeft: 10,
    marginBottom: 4,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#d1d5db",
    color: "#4b5563",
  },
  hr: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    marginVertical: 6,
  },
});

interface MarkdownPDFProps {
  /** Markdown source to render. */
  markdown: string;
  /** Optional title used for the PDF metadata. */
  title?: string;
  /** Optional author used for the PDF metadata. */
  author?: string;
}

/**
 * Convert inline markdown tokens (strong, em, links, text) into a single
 * React-PDF Text element. We flatten the token tree into Text fragments.
 */
function renderInline(tokens: Token[] | undefined): ReactNode {
  if (!tokens || tokens.length === 0) return null;

  return (
    <Text>
      {tokens.map((token, idx) => {
        if (token.type === "text") {
          return <React.Fragment key={idx}>{token.text}</React.Fragment>;
        }
        if (token.type === "strong") {
          return (
            <Text key={idx} style={styles.strong}>
              {token.text}
            </Text>
          );
        }
        if (token.type === "em") {
          return (
            <Text key={idx} style={styles.em}>
              {token.text}
            </Text>
          );
        }
        if (token.type === "link" && token.href) {
          return (
            <Link key={idx} src={token.href} style={styles.link}>
              {token.text || token.href}
            </Link>
          );
        }
        if (token.type === "codespan" || token.type === "code") {
          return (
            <Text key={idx} style={styles.code}>
              {token.text}
            </Text>
          );
        }
        if (token.type === "br") {
          return <Text key={idx}>\n</Text>;
        }
        return null;
      })}
    </Text>
  );
}

/**
 * Recursively convert marked tokens into React-PDF elements.
 */
function renderTokens(tokens: Token[]): ReactNode[] {
  return tokens.map((token, idx) => {
    switch (token.type) {
      case "heading":
        if (token.depth === 1) {
          return (
            <Text key={idx} style={styles.h1}>
              {token.text}
            </Text>
          );
        }
        if (token.depth === 2) {
          return (
            <Text key={idx} style={styles.h2}>
              {token.text}
            </Text>
          );
        }
        return (
          <Text key={idx} style={styles.h3}>
            {token.text}
          </Text>
        );

      case "paragraph": {
        // Center the paragraph immediately following the H1 name — it is
        // almost always the contact info line.
        const isHeaderContact =
          idx === 1 &&
          tokens[0].type === "heading" &&
          (tokens[0] as Tokens.Heading).depth === 1;
        return (
          <View
            key={idx}
            style={isHeaderContact ? styles.headerContact : styles.paragraph}
          >
            {renderInline(token.tokens)}
          </View>
        );
      }

      case "list":
        return (
          <View key={idx} style={styles.list}>
            {token.items.map((item: Tokens.ListItem, i: number) => (
              <View key={i} style={styles.listItem} wrap={false}>
                <Text style={styles.bullet}>• </Text>
                <View style={styles.listItemText}>
                  {renderInline(item.tokens)}
                </View>
              </View>
            ))}
          </View>
        );

      case "blockquote":
        return (
          <View key={idx} style={styles.blockquote}>
            {renderTokens(token.tokens ?? [])}
          </View>
        );

      case "code":
        return (
          <View key={idx} style={styles.paragraph}>
            {token.text.split("\n").map((line: string, i: number) => (
              <Text key={i} style={styles.code}>
                {line || " "}
              </Text>
            ))}
          </View>
        );

      case "hr":
        return <View key={idx} style={styles.hr} />;

      case "space":
        return null;

      default:
        // Fallback: try to render raw text if available.
        if ("text" in token && typeof token.text === "string") {
          return (
            <View key={idx} style={styles.paragraph}>
              <Text>{token.text}</Text>
            </View>
          );
        }
        return null;
    }
  });
}

/**
 * React-PDF Document component that renders markdown content.
 */
export function MarkdownPDF({ markdown, title, author }: MarkdownPDFProps) {
  const tokens = marked.lexer(markdown) as Token[];

  return (
    <Document title={title} author={author}>
      <Page size="LETTER" style={styles.page}>
        {renderTokens(tokens)}
      </Page>
    </Document>
  );
}

export { styles };

/**
 * Convenience helper: render markdown directly to a PDF buffer.
 * Keeps all @react-pdf/renderer usage inside this server-only module.
 */
export async function renderMarkdownPDF(
  markdown: string,
  title?: string,
  author?: string
): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  return renderToBuffer(MarkdownPDF({ markdown, title, author }));
}
