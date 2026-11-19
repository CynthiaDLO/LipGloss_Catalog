import { useCallback, useState } from "react";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { FlatList, Pressable, Text, View } from "../../components/ui/LocalizedNative";
import { useAuth } from "../../context/AuthContext";
import { getAdminBrands, type AdminBrand } from "../../services/admin";
import { ActionButton, commerceStyles as s, getErrorText, palette } from "../../components/ui/CommerceUi";

export default function AdminBrandsScreen() {
  const {user}=useAuth();const router=useRouter();
  const [items,setItems]=useState<AdminBrand[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  const reload=useCallback(async()=>{if(!user?.is_staff)return;setLoading(true);try{setItems(await getAdminBrands());setError("");}catch(reason){setError(getErrorText(reason));}finally{setLoading(false);}},[user?.is_staff]);
  useFocusEffect(useCallback(()=>{void reload();},[reload]));
  if(!user?.is_staff)return <View style={s.content}><Text style={s.error}>Acceso exclusivo para administradores.</Text></View>;
  return <FlatList style={s.screen} data={items} keyExtractor={item=>String(item.id)} contentContainerStyle={s.content}
    ListHeaderComponent={<View style={{gap:12}}><Text style={s.title}>Marcas</Text><Text style={s.subtitle}>Selecciona una marca para editarla o eliminarla.</Text><ActionButton title="Registrar nueva marca" onPress={()=>router.push("/admin-dashboard" as Href)}/>{error?<Text style={s.error}>{error}</Text>:null}</View>}
    renderItem={({item})=><Pressable onPress={()=>router.push(`/admin-brand/${item.id}` as Href)} style={s.card}><Text style={s.heading}>{item.name}  ›</Text><Text style={s.muted}>{item.description || "Sin descripción"}</Text></Pressable>}
    ListEmptyComponent={!loading?<Text style={{color:palette.muted}}>No hay marcas registradas.</Text>:undefined}
    onRefresh={()=>void reload()} refreshing={loading}/>;
}
