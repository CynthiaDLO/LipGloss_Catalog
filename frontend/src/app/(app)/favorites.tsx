import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { ActivityIndicator } from "react-native";
import { FlatList, Alert, Text, View } from "../../components/ui/LocalizedNative";
import { getFavorites, removeFavorite } from "../../services/discovery";
import ProductTile from "../../components/ui/ProductTile";
import { ActionButton, commerceStyles as s, getErrorText, palette } from "../../components/ui/CommerceUi";
import type { Lipgloss } from "../../types/Lipgloss";

export default function FavoritesScreen(){
  const router=useRouter();const [items,setItems]=useState<Lipgloss[]>([]);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState<number|null>(null);const [error,setError]=useState("");
  const load=useCallback(async()=>{setLoading(true);setError("");try{setItems(await getFavorites());}catch(reason){setError(getErrorText(reason));}finally{setLoading(false);}},[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  async function remove(id:number){if(busy!==null)return;setBusy(id);try{await removeFavorite(id);setItems(previous=>previous.filter(item=>item.id!==id));}catch(reason){Alert.alert("No se pudo eliminar",getErrorText(reason));}finally{setBusy(null);}}
  return <View style={s.screen}><FlatList data={items} numColumns={2} columnWrapperStyle={{gap:12}} keyExtractor={item=>String(item.id)} contentContainerStyle={s.content} ListHeaderComponent={<View style={{gap:10}}><Text style={s.title}>Mis favoritos ♡</Text><Text style={s.subtitle}>Tus tonos preferidos, siempre a mano.</Text>{error?<Text style={s.error}>{error}</Text>:null}{loading?<ActivityIndicator color={palette.primary}/>:null}</View>} renderItem={({item})=><View style={{flex:1}}><ProductTile product={item} onPress={()=>router.push(`/product/${item.id}` as Href)} favorite favoriteBusy={busy===item.id} onFavorite={()=>void remove(item.id)}/></View>} ListEmptyComponent={!loading?<View style={s.card}><Text style={s.heading}>Todavía no hay favoritos</Text><Text style={s.subtitle}>Pulsa el corazón de un producto para guardarlo.</Text><ActionButton title="Explorar catálogo" onPress={()=>router.replace("/(app)")}/></View>:undefined} onRefresh={()=>void load()} refreshing={loading}/></View>;
}
