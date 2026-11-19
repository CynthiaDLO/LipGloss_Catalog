import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";
import { Alert, ScrollView, Text, TextInput, View } from "../../../components/ui/LocalizedNative";
import { useAuth } from "../../../context/AuthContext";
import { deleteBrand, getAdminBrand, updateBrand } from "../../../services/admin";
import { ActionButton, commerceStyles as s, getErrorText, palette } from "../../../components/ui/CommerceUi";

export default function AdminBrandDetailScreen(){
  const {user}=useAuth();const router=useRouter();const params=useLocalSearchParams<{id:string}>();const id=Number(params.id);
  const [name,setName]=useState("");const [description,setDescription]=useState("");
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const reload=useCallback(async()=>{if(!user?.is_staff)return;if(!Number.isSafeInteger(id)||id<1){setError("Marca no válida.");setLoading(false);return;}setLoading(true);try{const value=await getAdminBrand(id);setName(value.name);setDescription(value.description || "");setError("");}catch(reason){setError(getErrorText(reason));}finally{setLoading(false);}},[id,user?.is_staff]);
  useFocusEffect(useCallback(()=>{void reload();},[reload]));
  async function save(){if(busy)return;if(name.trim().length<2){Alert.alert("Validación","El nombre debe tener al menos dos caracteres.");return;}setBusy(true);try{await updateBrand(id,{name:name.trim(),description:description.trim()});Alert.alert("Marca actualizada","Los cambios se guardaron correctamente.");await reload();}catch(reason){Alert.alert("No se pudo guardar",getErrorText(reason));}finally{setBusy(false);}}
  async function remove(){if(busy)return;setBusy(true);try{await deleteBrand(id);Alert.alert("Marca eliminada","Se eliminó correctamente.");router.back();}catch(reason){Alert.alert("No se pudo eliminar","Si la marca tiene productos asociados, primero deberás moverlos a otra marca o conservar la marca. "+getErrorText(reason));}finally{setBusy(false);}}
  if(!user?.is_staff)return <View style={s.content}><Text style={s.error}>Acceso exclusivo para administradores.</Text></View>;
  if(loading)return <View style={s.content}><ActivityIndicator color={palette.primary}/></View>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    {error?<Text style={s.error}>{error}</Text>:null}
    {!error?<View style={s.card}><Text style={s.heading}>Editar marca</Text><Text style={s.muted}>Nombre</Text><TextInput value={name} onChangeText={setName} maxLength={100} style={{borderWidth:1,borderColor:palette.border,borderRadius:10,padding:12,color:palette.ink}}/><Text style={s.muted}>Descripción</Text><TextInput value={description} onChangeText={setDescription} multiline style={{borderWidth:1,borderColor:palette.border,borderRadius:10,padding:12,color:palette.ink,minHeight:80}}/><ActionButton title="Guardar cambios" disabled={busy} onPress={()=>void save()}/><ActionButton title="Eliminar marca" secondary disabled={busy} onPress={()=>Alert.alert("Confirmar eliminación",`¿Eliminar la marca ${name}? Esta acción no se puede deshacer.`,[{text:"Cancelar",style:"cancel"},{text:"Eliminar",style:"destructive",onPress:()=>void remove()}])}/></View>:null}
  </ScrollView>;
}
