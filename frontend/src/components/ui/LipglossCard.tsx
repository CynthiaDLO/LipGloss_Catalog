
import { Image, StyleSheet } from "react-native";
import { Pressable, Text, View } from "../../components/ui/LocalizedNative";

import { API_URL } from "../../utils/api";
import type { Lipgloss } from "../../types/Lipgloss";

interface LipglossCardProps {
  product: Lipgloss;
  onPress: () => void;
}

function getImageUrl(image: string | null): string | null {
  if (!image) {
    return null;
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${API_URL}${image.startsWith("/") ? "" : "/"}${image}`;
}

export default function LipglossCard({
  product,
  onPress,
}: LipglossCardProps) {
  const imageUrl = getImageUrl(product.image);

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Ver ${product.name} de ${product.brand.name}`}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Sin imagen
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.brand}>
          {product.brand.name}
        </Text>

        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        <Text style={styles.shade}>
          Tono: {product.shade}
        </Text>

        <Text style={styles.price}>
          ${Number(product.price).toFixed(2)} MXN
        </Text>

        <Text style={styles.details}>
          Ver detalles
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0d6e1",
  },
  image: {
    width: "100%",
    height: 210,
    backgroundColor: "#f8e9ef",
  },
  placeholder: {
    width: "100%",
    height: 210,
    backgroundColor: "#f8e9ef",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#a87990",
    fontSize: 15,
  },
  content: {
    padding: 16,
  },
  brand: {
    color: "#b34470",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 5,
  },
  name: {
    color: "#262626",
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 7,
  },
  shade: {
    color: "#777777",
    fontSize: 14,
    marginBottom: 10,
  },
  price: {
    color: "#a72e60",
    fontSize: 19,
    fontWeight: "bold",
  },
  details: {
    color: "#b34470",
    fontSize: 13,
    marginTop: 12,
    fontWeight: "600",
  },
});
