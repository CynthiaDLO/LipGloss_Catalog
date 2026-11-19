import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { ScrollView, Text, View } from "../../components/ui/LocalizedNative";
import { useFocusEffect } from "expo-router";
import { getOrders, toMoney } from "../../services/commerce";
import type { Order } from "../../types/commerce";
import { ActionButton, commerceStyles as s, getErrorText, palette, ScreenLoading, ScreenMessage } from "../../components/ui/CommerceUi";

export default function OrdersScreen() {
  const [orders,setOrders] = useState<Order[]>([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState("");
  const load = useCallback(async () => { try {setError(""); setOrders(await getOrders());} catch(e){setError(getErrorText(e));} finally {setLoading(false);setRefreshing(false);} },[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  if (loading) return <ScreenLoading/>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);void load();}} tintColor={palette.primary}/>}>
    <Text style={s.title}>Mis compras</Text><Text style={s.subtitle}>Consulta el estado y los detalles de tus pedidos.</Text>
    {error ? <><Text style={s.error}>{error}</Text><ActionButton title="Reintentar" secondary onPress={()=>void load()}/></> : null}
    {!orders.length && !error ? <ScreenMessage>Todavía no tienes compras registradas.</ScreenMessage> : null}
    {orders.map(order => <View key={order.id} style={s.card}>
      <View style={s.row}><Text style={s.heading}>Pedido #{order.id}</Text><Text style={{color:palette.primary,fontWeight:"700"}}>{order.status_display}</Text></View>
      <Text style={s.muted}>{new Date(order.created_at).toLocaleDateString("es-MX")}</Text>
      {order.items.map(item=><Text key={item.id} style={s.text}>{item.quantity} × {item.product_name} · {item.shade} — {toMoney(item.subtotal)}</Text>)}
      <View style={s.row}><Text style={s.heading}>Total</Text><Text style={s.total}>{toMoney(order.total)}</Text></View>
    </View>)}
  </ScrollView>;
}
