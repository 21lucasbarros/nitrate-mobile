import * as WebBrowser from 'expo-web-browser';
import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { parseReview, stripMarkup, type Inline } from '@/lib/review-markup';

function renderInline(nodes: Inline[]): React.ReactNode {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={i}>{node.text}</Fragment>;
      case 'bold':
        return (
          <Text key={i} className="font-bold text-foreground">
            {renderInline(node.children)}
          </Text>
        );
      case 'italic':
        return (
          <Text key={i} className="font-serif-italic">
            {renderInline(node.children)}
          </Text>
        );
      case 'link':
        return (
          <Text
            key={i}
            className="text-brand-blue underline"
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(node.href)}>
            {renderInline(node.children)}
          </Text>
        );
    }
  });
}

const BODY = 'font-serif-regular text-[17px] leading-[28px] text-foreground/85';

/** texto da review com a formatação do editor; `lines` corta em prévias */
export function ReviewText({ text, lines }: { text: string; lines?: number }) {
  if (lines) {
    return (
      <Text className={BODY} numberOfLines={lines}>
        {stripMarkup(text).replace(/\n+/g, ' ')}
      </Text>
    );
  }

  return (
    <View className="gap-4">
      {parseReview(text).map((block, i) => {
        const content = block.lines.map((line, j) => (
          <Fragment key={j}>
            {j > 0 && '\n'}
            {renderInline(line)}
          </Fragment>
        ));
        return block.type === 'quote' ? (
          <View key={i} className="border-l-2 border-brand-orange/60 pl-4">
            <Text className={`${BODY} font-serif-italic text-foreground/70`}>{content}</Text>
          </View>
        ) : (
          <Text key={i} className={BODY} selectable>
            {content}
          </Text>
        );
      })}
    </View>
  );
}
