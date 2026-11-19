import { useCallback, useRef, useState } from "react";
import { Image } from "react-native";
import { Alert, ScrollView, Text, View } from "../../components/ui/LocalizedNative";
import { useFocusEffect, useRouter } from "expo-router";
import { checkoutOrder, getCart, removeCartItem, toMoney, updateCartItem } from "../../services/commerce";
import type { Cart } from "../../types/commerce";
import { ActionButton, commerceStyles as s, getErrorText, palette, ScreenLoading, ScreenMessage } from "../../components/ui/CommerceUi";

function createCheckoutKey(): string {
  // UUID v4 used only to identify checkout retries, not as an authentication secret.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 3) | 8).toString(16);
  });
}
export default function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pendingKey = useRef<string | null>(null);
  const load = useCallback(async () => {
    try { setError(""); setCart(await getCart()); }
    catch (e) { setError(getErrorText(e)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function changeItem(itemId: number, quantity: number) {
    if (busy) return;
    setBusy(true); setError("");
    try { if (quantity === 0) { await removeCartItem(itemId); setCart(await getCart()); } else setCart(await updateCartItem(itemId, quantity)); pendingKey.current = null; }
    catch (e) { setError(getErrorText(e)); } finally { setBusy(false); }
  }
  async function completePurchase() {
    if (!cart?.items.length || busy) return;
    setBusy(true); setError("");
    try {
      if (!pendingKey.current) pendingKey.current = createCheckoutKey();
      const order = await checkoutOrder(pendingKey.current);
      pendingKey.current = null;
      setCart(await getCart());
      Alert.alert("Compra registrada", `Tu pedido #${order.id} se registró correctamente.`, [ {text:"Ver mis compras", onPress: () => router.push("/(app)/orders")}, {text:"Aceptar"} ]);
    } catch (e) { setError(getErrorText(e)); }
    finally { setBusy(false); }
  }
  if (loading) return <ScreenLoading />;
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <Text style={s.title}>Mi carrito</Text><Text style={s.subtitle}>Revisa tus productos antes de confirmar tu compra.</Text>
    {error ? <Text style={s.error}>{error}</Text> : null}
    {cart?.items.length ? cart.items.map(item => <View key={item.id} style={s.card}>
      <View style={s.row}>
        {item.product.image ? <Image source={{uri:item.product.image}} style={{width:70,height:70,borderRadius:12}} /> : <View style={{width:70,height:70,backgroundColor:palette.soft,borderRadius:12,justifyContent:"center",alignItems:"center"}}><Text style={s.muted}>Sin foto</Text></View>}
        <View style={{flex:1}}><Text style={s.heading}>{item.product.name}</Text><Text style={s.muted}>{item.product.brand} · {item.product.shade}</Text><Text style={s.total}>{toMoney(item.subtotal)}</Text></View>
      </View>
      <View style={s.row}><Text style={s.text}>Cantidad: {item.quantity}</Text><View style={{flexDirection:"row",gap:8}}><ActionButton title="−" secondary disabled={busy} onPress={() => void changeItem(item.id,item.quantity-1)} /><ActionButton title="+" secondary disabled={busy || item.quantity>=99} onPress={() => void changeItem(item.id,item.quantity+1)} /></View></View>
      <ActionButton title="Quitar producto" secondary disabled={busy} onPress={() => void changeItem(item.id,0)}/>
    </View>) : <ScreenMessage>Tu carrito está vacío. Visita el catálogo para agregar productos.</ScreenMessage>}
    {cart?.items.length ? <View style={s.card}><View style={s.row}><Text style={s.heading}>Total estimado</Text><Text style={s.total}>{toMoney(cart.total)}</Text></View><Text style={s.muted}>Compra de demostración: no se realizará ningún cargo bancario.</Text><ActionButton title={busy ? "Procesando compra..." : "Confirmar compra"} disabled={busy} onPress={() => Alert.alert("Confirmar compra", "¿Deseas registrar esta compra de demostración?", [{text:"Cancelar",style:"cancel"},{text:"Confirmar",onPress:()=>void completePurchase()}])}/></View> : <ActionButton title="Explorar productos" secondary onPress={() => router.push("/(app)")}/>}
    <ActionButton title="Ver historial de compras" secondary onPress={() => router.push("/(app)/orders")}/>
  </ScrollView>;
}
