import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { Alert, ScrollView, Text, View } from "../../components/ui/LocalizedNative";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { getAdminOrders, toMoney, updateOrderStatus } from "../../services/commerce";
import type { Order, OrderStatus } from "../../types/commerce";
import { ActionButton, commerceStyles as s, getErrorText, palette, ScreenLoading, ScreenMessage } from "../../components/ui/CommerceUi";
const NEXT: Record<OrderStatus, Array<{value:OrderStatus; label:string}>> = {
  placed: [{value:"confirmed",label:"Confirmar"},{value:"cancelled",label:"Cancelar"}],
  confirmed: [{value:"shipped",label:"Marcar como enviado"},{value:"cancelled",label:"Cancelar"}],
  shipped: [{value:"delivered",label:"Marcar como entregado"}], delivered: [], cancelled: [],
};
export default function AdminOrdersScreen() {
  const {user}=useAuth(); const router=useRouter();
  const [orders,setOrders]=useState<Order[]>([]);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [refreshing,setRefreshing]=useState(false);const [error,setError]=useState("");
  const load=useCallback(async()=>{if(!user?.is_staff){setLoading(false);return;}try{setError("");setOrders(await getAdminOrders());}catch(e){setError(getErrorText(e));}finally{setLoading(false);setRefreshing(false);}},[user?.is_staff]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  async function changeStatus(orderId:number,status:OrderStatus){if(busy)return;setBusy(true);setError("");try{await updateOrderStatus(orderId,status);await load();}catch(e){setError(getErrorText(e));}finally{setBusy(false);}}
  if(!user?.is_staff)return <View style={[s.screen,s.content]}><Text style={s.error}>No tienes autorización para administrar pedidos.</Text><ActionButton title="Volver al catálogo" onPress={()=>router.replace("/(app)")}/></View>;
  if(loading)return <ScreenLoading/>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);void load();}} tintColor={palette.primary}/>}>
    <Text style={s.title}>Gestión de pedidos</Text><Text style={s.subtitle}>Panel exclusivo para administradores.</Text>
    {error ? <><Text style={s.error}>{error}</Text><ActionButton title="Reintentar" secondary onPress={()=>void load()}/></> : null}
    {!orders.length&&!error?<ScreenMessage>No hay pedidos registrados.</ScreenMessage>:null}
    {orders.map(order=><View key={order.id} style={s.card}>
      <View style={s.row}><Text style={s.heading}>Pedido #{order.id}</Text><Text style={{color:palette.primary,fontWeight:"700"}}>{order.status_display}</Text></View>
      <Text style={s.muted}>Cliente: {order.username || `Usuario #${order.user}`}</Text><Text style={s.muted}>{new Date(order.created_at).toLocaleString("es-MX")}</Text>
      {order.items.map(item=><Text style={s.text} key={item.id}>{item.quantity} × {item.product_name} — {toMoney(item.subtotal)}</Text>)}
      <Text style={s.total}>{toMoney(order.total)}</Text>
      {NEXT[order.status].map(action=><ActionButton key={action.value} title={action.label} secondary disabled={busy} onPress={()=>Alert.alert("Actualizar pedido",`¿Deseas cambiar el estado del pedido #${order.id}?`,[{text:"No",style:"cancel"},{text:"Sí, continuar",onPress:()=>void changeStatus(order.id,action.value)}])}/>)}
    </View>)}
  </ScrollView>;
}
