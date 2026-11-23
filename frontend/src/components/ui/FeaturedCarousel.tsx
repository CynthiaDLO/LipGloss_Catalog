import { useEffect, useRef, useState } from "react";
import type { ElementRef } from "react";
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./LocalizedNative";
import { palette } from "./CommerceUi";
import type { Lipgloss } from "../../types/Lipgloss";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px padding cada lado
const AUTO_SCROLL_MS = 3500;

interface FeaturedCarouselProps {
  products: Lipgloss[];
  onPress: (product: Lipgloss) => void;
}

/** Carousel horizontal de productos destacados para la pantalla de inicio. */
export default function FeaturedCarousel({ products, onPress }: FeaturedCarouselProps) {
  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance cada AUTO_SCROLL_MS ms
  useEffect(() => {
    if (products.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % products.length;
        scrollRef.current?.scrollTo({ x: next * CARD_WIDTH, animated: true });
        return next;
      });
    }, AUTO_SCROLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [products.length]);

  if (products.length === 0) return null;

  function handleScroll(event: { nativeEvent: { contentOffset: { x: number } } }) {
    const index = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    setActiveIndex(index);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionLabel}>✨ Destacados</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        // Pausa el auto-scroll si el usuario desliza manualmente
        onScrollBeginDrag={() => { if (timerRef.current) clearInterval(timerRef.current); }}
        style={{ width: CARD_WIDTH }}
        contentContainerStyle={{ gap: 0 }}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
      >
        {products.map(product => (
          <TouchableOpacity
            key={product.id}
            activeOpacity={0.88}
            onPress={() => onPress(product)}
            style={styles.card}
          >
            {product.image ? (
              <Image
                source={{ uri: product.image }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.placeholderIcon}>💄</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.brandLabel} numberOfLines={1}>{product.brand.name}</Text>
              <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
              <Text style={styles.shade} numberOfLines={1}>{product.shade}</Text>
              <Text style={styles.price}>${product.price} MXN</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Indicadores de puntos */}
      {products.length > 1 && (
        <View style={styles.dots}>
          {products.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8, marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: palette.primary, letterSpacing: 0.5 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: palette.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: "row",
    height: 120,
  },
  image: { width: 120, height: 120 },
  imagePlaceholder: { backgroundColor: palette.soft, justifyContent: "center", alignItems: "center" },
  placeholderIcon: { fontSize: 36 },
  info: { flex: 1, padding: 14, justifyContent: "center", gap: 3 },
  brandLabel: { fontSize: 11, color: palette.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  productName: { fontSize: 16, fontWeight: "800", color: palette.ink },
  shade: { fontSize: 12, color: palette.muted },
  price: { fontSize: 15, fontWeight: "700", color: palette.primary, marginTop: 4 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.border },
  dotActive: { backgroundColor: palette.primary, width: 18 },
});
