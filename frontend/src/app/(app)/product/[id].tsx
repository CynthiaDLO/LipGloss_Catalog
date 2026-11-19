import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Image, StyleSheet } from "react-native";
import { Alert, ScrollView, Text, TextInput, View } from "../../../components/ui/LocalizedNative";
import { useAuth } from "../../../context/AuthContext";
import { useAppearance } from "../../../context/AppearanceContext";
import { editProduct, deleteProduct, getAdminBrands, type AdminBrand } from "../../../services/admin";
import { getLipgloss } from "../../../services/lipgloss";
import { addCartItem, toMoney } from "../../../services/commerce";
import { addFavorite, getFavorites, removeFavorite } from "../../../services/discovery";
import { ActionButton, getErrorText } from "../../../components/ui/CommerceUi";
import { productImageUrl } from "../../../components/ui/ProductTile";
import type { Lipgloss } from "../../../types/Lipgloss";
import { chooseProductImage, uploadProductImage } from "../../../services/productImage";

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const productId = Number(params.id);
  const router = useRouter();
  const { user } = useAuth();
  const { colors, fontFamily, translate: t } = useAppearance();
  const isAdmin = Boolean(user?.is_staff);
  const [name, setName] = useState("");
  const [shade, setShade] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [product, setProduct] = useState<Lipgloss | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [imageRevision, setImageRevision] = useState(0);
  const [error, setError] = useState("");

  const font = (size: number, bold = false) => ({
    fontSize: size,
    color: colors.ink,
    fontWeight: bold ? "700" as const : "400" as const,
    ...(fontFamily !== "system" ? {fontFamily: fontFamily === "serif" ? "Georgia" : "Menlo"} : {}),
  });
  const fieldStyle = { ...styles.field, backgroundColor: colors.surface, borderColor: colors.border, color: colors.ink, fontSize: 15 };
  const label = (spanish: string, english: string) => <Text style={{...font(14), color: colors.muted}}>{t(spanish, english)}</Text>;
  const load = useCallback(async () => {
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      setError("El producto seleccionado no es válido."); setLoading(false); return;
    }
    setLoading(true); setError("");
    try {
      const details = await getLipgloss(productId);
      setProduct(details); setName(details.name); setShade(details.shade);
      setPrice(details.price); setDescription(details.description || "");
      setStock(details.stock == null ? "" : String(details.stock));
      setIsActive(details.is_active); setBrandId(details.brand.id);
      if (isAdmin) setBrands(await getAdminBrands());
      else setFavorite((await getFavorites()).some(item => item.id === productId));
    } catch (reason) { setError(getErrorText(reason)); }
    finally { setLoading(false); }
  }, [productId, isAdmin]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function add() {
    if (!product || busy) return;
    setBusy(true);
    try {
      await addCartItem(product.id, quantity);
      Alert.alert(t("Agregado al carrito", "Added to cart"),
        t("Producto agregado correctamente.", "Product added successfully."), [
          {text:t("Seguir viendo", "Keep browsing")},
          {text:t("Ver carrito", "View cart"), onPress: () => router.push("/(app)/cart")},
        ]);
    } catch (reason) { Alert.alert(t("No se pudo agregar", "Could not add"), getErrorText(reason)); }
    finally { setBusy(false); }
  }
  async function toggle() {
    if (!product || busy) return;
    setBusy(true);
    try {
      if (favorite) await removeFavorite(product.id); else await addFavorite(product.id);
      setFavorite(!favorite);
    } catch (reason) { Alert.alert(t("Error", "Error"), getErrorText(reason)); }
    finally { setBusy(false); }
  }
  async function saveProduct() {
    if (!product || busy || !isAdmin) return;
    const nextName = name.trim(), nextShade = shade.trim(), nextPrice = price.trim(), nextStock = stock.trim();
    if (!brandId || nextName.length < 3 || nextShade.length < 2 || !/^[0-9]+(\.[0-9]{1,2})?$/.test(nextPrice)
      || Number(nextPrice) <= 0 || (nextStock !== "" && (!/^\d+$/.test(nextStock) || !Number.isSafeInteger(Number(nextStock))))) {
      Alert.alert(t("Validación", "Validation"), t("Revisa el nombre, tono, precio y existencias.", "Check the name, shade, price and stock.")); return;
    }
    setBusy(true);
    try {
      await editProduct(product.id, {brand_id:brandId, name:nextName, shade:nextShade, price:nextPrice,
        description:description.trim(), stock:nextStock === "" ? null : Number(nextStock), is_active:isActive});
      Alert.alert(t("Producto actualizado", "Product updated"), t("Los cambios se guardaron correctamente.", "Changes saved successfully."));
      await load();
    } catch (reason) { Alert.alert(t("No se pudo guardar", "Could not save"), getErrorText(reason)); }
    finally { setBusy(false); }
  }
  async function changeImage(source: "library" | "camera") {
    if (!isAdmin || !product || busy) return;
    setBusy(true);
    try {
      const asset = await chooseProductImage(source);
      if (!asset) return;
      const updated = await uploadProductImage(product.id, asset);
      // Cache-bust the preview without modifying the image URL in the database.
      setProduct(updated);
      setImageRevision(value => value + 1);
      Alert.alert(t("Fotografía actualizada", "Photo updated"), t("La nueva imagen se guardó correctamente.", "The new photo was saved successfully."));
    } catch (reason) { Alert.alert(t("No se pudo subir la fotografía", "Could not upload photo"), getErrorText(reason)); }
    finally { setBusy(false); }
  }
  async function removeProduct() {
    if (!product || busy || !isAdmin) return;
    setBusy(true);
    try {
      await deleteProduct(product.id);
      Alert.alert(t("Producto eliminado", "Product deleted"), t("El producto se eliminó correctamente.", "The product was deleted successfully."));
      router.back();
    } catch (reason) { Alert.alert(t("No se pudo eliminar", "Could not delete"), getErrorText(reason)); }
    finally { setBusy(false); }
  }

  if (loading) return <View style={[styles.center, {backgroundColor:colors.background}]}>
    <ActivityIndicator size="large" color={colors.primary}/><Text style={font(15)}>{t("Cargando producto...", "Loading product...")}</Text>
  </View>;
  if (error || !product) return <View style={[styles.center, {backgroundColor:colors.background}]}>
    <Text style={{...font(15), color:colors.danger}}>{error || t("No se encontró el producto.", "Product not found.")}</Text>
    <ActionButton title={t("Reintentar", "Retry")} secondary onPress={() => void load()}/>
  </View>;

  const image = productImageUrl(product.image);
  return <ScrollView style={{backgroundColor:colors.background, flex:1}} contentContainerStyle={{paddingBottom:100}} keyboardShouldPersistTaps="handled">
    <View style={[styles.imagePanel, {backgroundColor:colors.soft}]}>
      {image ? <Image source={{uri:imageRevision > 0 ? `${image}${image.includes("?") ? "&" : "?"}revision=${imageRevision}` : image}} style={styles.image} resizeMode="contain"/>
        : <Text style={{...font(19), color:colors.primary}}>✦ {t("Sin imagen", "No image")}</Text>}
    </View>
    <View style={styles.body}>
      <Text style={{...font(12,true), color:colors.primary, letterSpacing:1.1}}>{product.brand.name.toUpperCase()}</Text>
      <Text style={font(28,true)}>{product.name}</Text>
      <Text style={{...font(15), color:colors.muted}}>{t("Tono", "Shade")}: {product.shade}</Text>
      <Text style={{...font(25,true), color:colors.primary}}>{toMoney(product.price)}</Text>
      <View style={[styles.divider, {backgroundColor:colors.border}]}/>
      <Text style={font(18,true)}>{t("Descripción", "Description")}</Text>
      <Text style={{...font(15), color:colors.muted, lineHeight:23}}>{product.description || t("Sin descripción disponible.", "No description available.")}</Text>

      {isAdmin ? <View style={[styles.adminForm, {backgroundColor:colors.surface, borderColor:colors.border}]}>
        <Text style={font(20,true)}>{t("Editar producto", "Edit product")}</Text>
        <Text style={{...font(13), color:colors.muted}}>{t("Imagen del producto", "Product image")}</Text>
        <ActionButton title={busy ? t("Subiendo imagen...", "Uploading image...") : t("Elegir desde galería", "Choose from gallery")}
          secondary disabled={busy} onPress={() => void changeImage("library")}/>
        <ActionButton title={t("Tomar fotografía", "Take photo")} secondary disabled={busy} onPress={() => void changeImage("camera")}/>
        <Text style={{...font(12), color:colors.muted}}>{t("JPG, PNG o WEBP; máximo 5 MB.", "JPG, PNG or WEBP; maximum 5 MB.")}</Text>
        {label("Marca", "Brand")}
        <View style={{gap:7}}>{brands.map(brand => <ActionButton key={brand.id} title={`${brandId === brand.id ? "✓ " : ""}${brand.name}`}
          secondary={brandId !== brand.id} disabled={busy} onPress={() => setBrandId(brand.id)}/>)}</View>
        {label("Nombre", "Name")}
        <TextInput value={name} onChangeText={setName} maxLength={150} style={fieldStyle}/>
        {label("Tono", "Shade")}
        <TextInput value={shade} onChangeText={setShade} maxLength={100} style={fieldStyle}/>
        {label("Precio (MXN)", "Price (MXN)")}
        <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={fieldStyle}/>
        {label("Existencias (vacío = sin seguimiento)", "Stock (empty = untracked)")}
        <TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" style={fieldStyle}/>
        {label("Descripción", "Description")}
        <TextInput value={description} onChangeText={setDescription} multiline style={[fieldStyle, {minHeight:90}]}/>
        <ActionButton title={isActive ? t("Estado: Activo (tocar para desactivar)", "Status: Active (tap to disable)")
          : t("Estado: Inactivo (tocar para activar)", "Status: Inactive (tap to enable)")}
          secondary disabled={busy} onPress={() => setIsActive(value => !value)}/>
        <ActionButton title={busy ? t("Guardando...", "Saving...") : t("Guardar cambios", "Save changes")}
          disabled={busy} onPress={() => void saveProduct()}/>
        <ActionButton title={t("Eliminar producto", "Delete product")} secondary disabled={busy}
          onPress={() => Alert.alert(t("Eliminar producto", "Delete product"),
            t("¿Seguro que deseas eliminar el producto? Esta acción no se puede deshacer.", "Delete this product? This cannot be undone."), [
              {text:t("Cancelar", "Cancel"),style:"cancel"},
              {text:t("Eliminar", "Delete"),style:"destructive",onPress:() => void removeProduct()},
            ])}/>
      </View> : <View style={{gap:12}}>
        <View style={[styles.divider, {backgroundColor:colors.border}]}/>
        <Text style={font(18,true)}>{t("Cantidad", "Quantity")}</Text>
        <View style={styles.quantity}>
          <ActionButton title="−" secondary disabled={busy || quantity <= 1} onPress={() => setQuantity(v => v - 1)}/>
          <Text style={font(19,true)}>{quantity}</Text>
          <ActionButton title="+" secondary disabled={busy || quantity >= 99 || (product.stock != null && quantity >= product.stock)}
            onPress={() => setQuantity(v => v + 1)}/>
        </View>
        <ActionButton title={`${busy ? t("Procesando...", "Processing...") : t("Agregar al carrito", "Add to cart")} · ${toMoney(Number(product.price) * quantity)}`}
          disabled={busy || !product.is_active || product.stock === 0} onPress={() => void add()}/>
        <ActionButton title={favorite ? t("♥ Quitar de favoritos", "♥ Remove from favorites") : t("♡ Guardar en favoritos", "♡ Save to favorites")}
          secondary disabled={busy} onPress={() => void toggle()}/>
      </View>}
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  center:{flex:1,justifyContent:"center",alignItems:"center",gap:12,padding:20},
  field:{borderWidth:1,borderRadius:12,padding:12},
  imagePanel:{height:270,alignItems:"center",justifyContent:"center"},
  image:{width:"100%",height:"100%"},
  body:{padding:20,gap:12},divider:{height:1,marginVertical:6},
  adminForm:{gap:11,marginTop:12,padding:16,borderWidth:1,borderRadius:16},
  quantity:{flexDirection:"row",alignItems:"center",gap:18},
});
