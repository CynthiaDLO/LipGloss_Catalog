import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";
import { Alert, FlatList, Pressable, ScrollView, Text, TextInput, View } from "../../components/ui/LocalizedNative";
import { useAuth } from "../../context/AuthContext";
import { useAppearance } from "../../context/AppearanceContext";
import { ActionButton, commerceStyles as s, getErrorText, palette } from "../../components/ui/CommerceUi";
import ProductTile from "../../components/ui/ProductTile";
import { getBrands, getCatalogPage, getFavorites, addFavorite, removeFavorite, getPreferences, type CatalogFilters } from "../../services/discovery";
import type { Brand, Lipgloss } from "../../types/Lipgloss";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { preferences, local } = useAppearance();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [brand, setBrand] = useState<number | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [ordering, setOrdering] = useState<CatalogFilters["ordering"]>("name");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(preferences.page_size);
  useEffect(() => { setPage(1); setPageSize(preferences.page_size); }, [preferences.page_size]);
  const [results, setResults] = useState<Lipgloss[]>([]);
  const [total, setTotal] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [favoriteBusy, setFavoriteBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  useEffect(() => {
    setShowWelcome(true);
    const timeout = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(timeout);
  }, [user?.id]);

  useEffect(() => { let active = true; (async () => {
    try {
      const brandData = await getBrands();
      if (active) { setBrands(brandData); }
    } catch (reason) { if (active) setError(getErrorText(reason)); }
  })(); return () => {active = false;}; }, []);

  const loadFavorites = useCallback(async () => {
    if (user?.is_staff) return;
    const favorites = await getFavorites();
    setFavoriteIds(favorites.map(product => product.id));
  }, [user?.is_staff]);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user?.is_staff) void getFavorites().then(favorites => { if (active) setFavoriteIds(favorites.map(product => product.id)); }).catch(() => {});
    return () => { active = false; };
  }, [user?.is_staff]));

  useEffect(() => { let active = true; setLoading(true); setError("");
    const validPrice = (value: string) => !value.trim() || (/^\d+(\.\d{1,2})?$/.test(value.trim()) && Number.isFinite(Number(value)));
    if (!validPrice(minPrice) || !validPrice(maxPrice) || (minPrice && maxPrice && Number(minPrice) > Number(maxPrice))) {
      setError("Revisa los precios. El mínimo debe ser menor o igual al máximo y solo se permiten dos decimales."); setLoading(false); return;
    }
    void getCatalogPage({ search: submittedSearch, brand, minPrice, maxPrice, ordering, page, pageSize })
      .then(data => { if (active) {setResults(data.results.filter(product => product.is_active)); setTotal(data.count);} })
      .catch(reason => {if (active) {setResults([]);setError(getErrorText(reason));}})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [submittedSearch, brand, minPrice, maxPrice, ordering, page, pageSize, refreshKey]);

  async function toggleFavorite(product: Lipgloss) {
    if (user?.is_staff || favoriteBusy !== null) return;
    setFavoriteBusy(product.id);
    const hadFavorite = favoriteIds.includes(product.id);
    try {
      if (hadFavorite) await removeFavorite(product.id); else await addFavorite(product.id);
      await loadFavorites();
    } catch (reason) {Alert.alert("No se pudo actualizar favoritos", getErrorText(reason));}
    finally {setFavoriteBusy(null);}
  }
  function resetFilters() {setBrand(null);setMinPrice("");setMaxPrice("");setOrdering("name");setSearch("");setSubmittedSearch("");setPage(1);}

  return <View style={s.screen}>
    <FlatList key="two-column-catalog" data={results} numColumns={2} columnWrapperStyle={{gap:12}} keyExtractor={item=>String(item.id)} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      ListHeaderComponent={<View style={{gap:16}}>
        {showWelcome && !local.reduce_motion ? <View style={styles.welcome}><Text style={styles.welcomeText}>✦ El brillo que va contigo, {user?.first_name || user?.username}.</Text></View> : null}
        <View style={styles.catalogHeading}><Text style={s.title}>{user?.is_staff ? "Catálogo administrativo" : "Descubre tus tonos"}</Text><Text style={s.muted}>{user?.is_staff ? "Selecciona un producto para editarlo o eliminarlo." : "Encuentra tu favorito."}</Text></View>
        <View style={styles.searchRow}><TextInput accessibilityLabel="Buscar productos" placeholder="Buscar nombre, tono o marca" placeholderTextColor={palette.muted} value={search} onChangeText={setSearch} onSubmitEditing={()=>{setPage(1);setSubmittedSearch(search);}} returnKeyType="search" style={styles.searchInput}/><Pressable accessibilityRole="button" onPress={()=>{setPage(1);setSubmittedSearch(search);}} style={styles.searchButton}><Text style={styles.searchButtonText}>Buscar</Text></Pressable></View>
        <Pressable style={styles.filterToggle} onPress={()=>setShowFilters(value=>!value)}><Text style={styles.filterText}>☷  {showFilters?"Ocultar filtros":"Filtros y ordenamiento"}</Text><Text style={styles.filterText}>{showFilters?"−":"+"}</Text></Pressable>
        {showFilters ? <View style={styles.filterPanel}>
          <Text style={styles.fieldLabel}>Marca</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}><Pressable onPress={()=>{setBrand(null);setPage(1);}} style={[styles.chip,brand===null&&styles.chipSelected]}><Text style={[styles.chipText,brand===null&&styles.chipTextSelected]}>Todas</Text></Pressable>{brands.map(item=><Pressable key={item.id} onPress={()=>{setBrand(item.id);setPage(1);}} style={[styles.chip,brand===item.id&&styles.chipSelected]}><Text style={[styles.chipText,brand===item.id&&styles.chipTextSelected]}>{item.name}</Text></Pressable>)}</ScrollView>
          <Text style={styles.fieldLabel}>Precio en MXN</Text><View style={styles.priceInputs}><TextInput accessibilityLabel="Precio mínimo" placeholder="Mínimo" keyboardType="decimal-pad" value={minPrice} onChangeText={value=>{setMinPrice(value);setPage(1);}} style={styles.priceInput}/><TextInput accessibilityLabel="Precio máximo" placeholder="Máximo" keyboardType="decimal-pad" value={maxPrice} onChangeText={value=>{setMaxPrice(value);setPage(1);}} style={styles.priceInput}/></View>
          <Text style={styles.fieldLabel}>Ordenar por</Text><View style={styles.sortOptions}>{([ ["name","Nombre"],["price","Menor precio"],["-price","Mayor precio"],["-created_at","Novedades"]] as const).map(([value,label])=><Pressable key={value} onPress={()=>{setOrdering(value);setPage(1);}} style={[styles.chip,ordering===value&&styles.chipSelected]}><Text style={[styles.chipText,ordering===value&&styles.chipTextSelected]}>{label}</Text></Pressable>)}</View>
          <ActionButton title="Limpiar filtros" secondary onPress={resetFilters}/>
        </View> : null}
        <View style={s.row}><View><Text style={s.heading}>Nuestra selección</Text><Text style={s.muted}>{total} productos encontrados</Text></View><Text style={styles.pageIndicator}>Página {page}</Text></View>
        {error ? <View style={{gap:9}}><Text style={s.error}>{error}</Text><ActionButton title="Volver a intentar" secondary onPress={()=>setRefreshKey(value=>value+1)}/></View> : null}
        {loading ? <View style={{padding:24}}><ActivityIndicator size="large" color={palette.primary}/></View> : null}
      </View>}
      renderItem={({item})=><View style={{flex:1,marginBottom:12}}><ProductTile product={item} onPress={()=>router.push(`/product/${item.id}` as Href)} favorite={favoriteIds.includes(item.id)} favoriteBusy={favoriteBusy===item.id} showFavorite={!user?.is_staff} onFavorite={()=>void toggleFavorite(item)}/></View>}
      ListEmptyComponent={!loading && !error ? <View style={[s.card,{marginTop:15}]}><Text style={s.heading}>No encontramos productos</Text><Text style={s.muted}>Prueba con otra búsqueda o elimina los filtros.</Text><ActionButton title="Mostrar todos" secondary onPress={resetFilters}/></View> : undefined}
      ListFooterComponent={<View style={{gap:15,marginTop:14}}><View style={styles.pager}><ActionButton title="Anterior" secondary disabled={loading || page===1} onPress={()=>setPage(value=>Math.max(1,value-1))}/><Text style={styles.pageIndicator}>{page} / {Math.max(1,Math.ceil(total/pageSize))}</Text><ActionButton title="Siguiente" secondary disabled={loading || page*pageSize>=total} onPress={()=>setPage(value=>value+1)}/></View></View>}
      onRefresh={()=>setRefreshKey(value=>value+1)} refreshing={false}
    />
  </View>;
}
const styles=StyleSheet.create({
  content:{padding:16,paddingBottom:35,gap:12},welcome:{backgroundColor:palette.soft,borderRadius:12,paddingHorizontal:12,paddingVertical:9},welcomeText:{fontSize:12,color:palette.primary,fontWeight:"700"},catalogHeading:{gap:4},hero:{padding:23,backgroundColor:palette.soft,borderRadius:24,gap:8},eyebrow:{fontSize:10,letterSpacing:1.6,color:palette.primary,fontWeight:"800"},heroTitle:{fontSize:31,lineHeight:37,fontWeight:"900",color:palette.ink},heroSubtitle:{fontSize:14,color:palette.muted,lineHeight:21},greeting:{fontSize:14,color:palette.primary,fontWeight:"700",marginTop:10},
  quickLinks:{flexDirection:"row",gap:7},quickLink:{flex:1,backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,paddingVertical:14,borderRadius:15,alignItems:"center",gap:4},linkIcon:{fontSize:19,color:palette.primary},linkText:{fontSize:11,color:palette.ink,fontWeight:"700"},
  searchRow:{flexDirection:"row",gap:8},searchInput:{flex:1,backgroundColor:palette.surface,borderRadius:14,borderColor:palette.border,borderWidth:1,paddingHorizontal:14,paddingVertical:11,color:palette.ink},searchButton:{paddingHorizontal:15,backgroundColor:palette.primary,borderRadius:14,justifyContent:"center"},searchButtonText:{color:"white",fontWeight:"800"},
  filterToggle:{flexDirection:"row",justifyContent:"space-between",padding:14,backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:14},filterText:{color:palette.primary,fontWeight:"800"},filterPanel:{gap:11,backgroundColor:palette.surface,padding:14,borderRadius:18,borderWidth:1,borderColor:palette.border},fieldLabel:{fontSize:13,fontWeight:"800",color:palette.ink},chip:{borderWidth:1,borderColor:palette.border,borderRadius:20,paddingHorizontal:12,paddingVertical:9},chipSelected:{backgroundColor:palette.primary,borderColor:palette.primary},chipText:{fontSize:12,color:palette.primary,fontWeight:"700"},chipTextSelected:{color:"white"},priceInputs:{flexDirection:"row",gap:9},priceInput:{flex:1,padding:11,borderRadius:10,backgroundColor:palette.background,borderWidth:1,borderColor:palette.border,color:palette.ink},sortOptions:{flexDirection:"row",gap:7,flexWrap:"wrap"},pageIndicator:{fontSize:12,color:palette.muted,fontWeight:"700"},pager:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}
});
