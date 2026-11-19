import { Image, StyleSheet } from "react-native";
import { Pressable, Text, View } from "../../components/ui/LocalizedNative";
import { API_URL } from "../../utils/api";
import type { Lipgloss } from "../../types/Lipgloss";
import { palette } from "./CommerceUi";
import { toMoney } from "../../services/commerce";

export function productImageUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

export default function ProductTile({ product, onPress, onFavorite, favorite, favoriteBusy = false, showFavorite = true }: {
  product: Lipgloss;
  onPress: () => void;
  onFavorite: () => void;
  favorite: boolean;
  favoriteBusy?: boolean;
  showFavorite?: boolean;
}) {
  const image = productImageUrl(product.image);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${product.name}`} onPress={onPress} style={styles.container}>
    <View style={styles.imageBox}>
      {image ? <Image source={{ uri: image }} style={styles.image} resizeMode="cover" /> : <View style={styles.placeholder}><Text style={styles.placeholderText}>✦</Text><Text style={styles.small}>Sin imagen</Text></View>}
      {showFavorite ? <Pressable accessibilityRole="button" accessibilityLabel={favorite ? "Quitar de favoritos" : "Agregar a favoritos"} disabled={favoriteBusy} onPress={event => { event.stopPropagation(); onFavorite(); }} style={styles.favorite}><Text style={[styles.heart, favorite && {color:palette.primary}]}>{favorite ? "♥" : "♡"}</Text></Pressable> : null}
    </View>
    <View style={styles.details}><Text style={styles.brand} numberOfLines={1}>{product.brand?.name ?? "Marca"}</Text><Text style={styles.name} numberOfLines={2}>{product.name}</Text><Text style={styles.shade} numberOfLines={1}>{product.shade}</Text><Text style={styles.price}>{toMoney(product.price)}</Text></View>
  </Pressable>;
}
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:palette.surface,borderRadius:20,overflow:"hidden",borderWidth:1,borderColor:palette.border},
  imageBox:{height:155,backgroundColor:palette.soft,position:"relative"},image:{width:"100%",height:"100%"},
  placeholder:{flex:1,justifyContent:"center",alignItems:"center"},placeholderText:{fontSize:34,color:palette.primary},small:{color:palette.muted,fontSize:12},
  favorite:{position:"absolute",top:9,right:9,backgroundColor:"#FFFFFF",width:37,height:37,borderRadius:19,alignItems:"center",justifyContent:"center"},heart:{fontSize:27,color:palette.muted},
  details:{padding:12,gap:4},brand:{fontSize:10,color:palette.primary,fontWeight:"800",letterSpacing:1,textTransform:"uppercase"},name:{color:palette.ink,fontWeight:"800",fontSize:15,minHeight:38},shade:{fontSize:12,color:palette.muted},price:{fontWeight:"800",fontSize:16,color:palette.primary,marginTop:4}
});
