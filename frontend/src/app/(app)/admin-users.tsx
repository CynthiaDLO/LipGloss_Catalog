import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, FlatList, Text, View } from "../../components/ui/LocalizedNative";
import { useAuth } from "../../context/AuthContext";
import { getAdminUsers, setUserActive, type AdminUser } from "../../services/admin";
import { ActionButton, commerceStyles as s, getErrorText } from "../../components/ui/CommerceUi";

export default function AdminUsersScreen(){
  const {user}=useAuth();const [items,setItems]=useState<AdminUser[]>([]);const [busy,setBusy]=useState<number|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  const reload=useCallback(async()=>{if(!user?.is_staff)return;setLoading(true);try{setItems(await getAdminUsers());setError("");}catch(reason){setError(getErrorText(reason));}finally{setLoading(false);}},[user?.is_staff]);
  useFocusEffect(useCallback(()=>{void reload();},[reload]));
  async function change(target:AdminUser){if(busy!==null||target.is_staff)return;setBusy(target.id);try{await setUserActive(target.id,!target.is_active);await reload();}catch(reason){Alert.alert("No se pudo actualizar",getErrorText(reason));}finally{setBusy(null);}}
  if(!user?.is_staff)return <View style={s.content}><Text style={s.error}>Acceso exclusivo para administradores.</Text></View>;
  return <FlatList style={s.screen} contentContainerStyle={s.content} data={items} keyExtractor={item=>String(item.id)} onRefresh={()=>void reload()} refreshing={loading}
    ListHeaderComponent={<View style={{gap:10}}><Text style={s.title}>Usuarios</Text><Text style={s.subtitle}>Gestiona el acceso de las cuentas normales sin modificar roles administrativos.</Text>{error?<Text style={s.error}>{error}</Text>:null}</View>}
    renderItem={({item})=><View style={s.card}><Text style={s.heading}>{item.username}</Text><Text style={s.muted}>{item.email} · {item.is_active?"Activo":"Inactivo"}{item.is_staff?" · Administrador":""}</Text>{!item.is_staff?<ActionButton title={item.is_active?"Desactivar cuenta":"Activar cuenta"} secondary disabled={busy!==null} onPress={()=>Alert.alert("Confirmar cambio",`¿${item.is_active?"Desactivar":"Activar"} la cuenta de ${item.username}?`,[{text:"Cancelar",style:"cancel"},{text:"Confirmar",onPress:()=>void change(item)}])}/>:null}</View>}
    ListEmptyComponent={!loading?<Text style={s.muted}>Sin usuarios disponibles.</Text>:undefined}/>;
}
