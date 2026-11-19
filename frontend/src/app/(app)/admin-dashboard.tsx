import { useCallback, useState } from "react";
import { chooseProductImage, uploadProductImage } from "../../services/productImage";
import { useAppearance } from "../../context/AppearanceContext";
import { Alert, ScrollView, Text, TextInput, View } from "../../components/ui/LocalizedNative";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { ActionButton, commerceStyles as s, getErrorText, palette } from "../../components/ui/CommerceUi";
import { createBrand, createProduct, getAdminBrands, getAdminProducts, getAdminUsers, getDashboard, setUserActive, updateProduct, type AdminBrand, type AdminDashboard, type AdminProduct, type AdminUser } from "../../services/admin";

function Field({label,value,onChangeText,keyboardType}:{label:string;value:string;onChangeText:(value:string)=>void;keyboardType?:"decimal-pad"|"number-pad"}) {
  return <View style={{gap:5}}><Text style={s.muted}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} style={{borderColor:palette.border,borderWidth:1,borderRadius:12,padding:12,color:palette.ink,backgroundColor:palette.surface}} /></View>;
}
export default function AdminDashboardScreen(){
  const {user}=useAuth();const router=useRouter();
  const {translate:t}=useAppearance();
  const [stats,setStats]=useState<AdminDashboard|null>(null);
  const [users,setUsers]=useState<AdminUser[]>([]);const [brands,setBrands]=useState<AdminBrand[]>([]);const [products,setProducts]=useState<AdminProduct[]>([]);
  const [brandName,setBrandName]=useState("");const [brandDescription,setBrandDescription]=useState("");
  const [name,setName]=useState("");const [shade,setShade]=useState("");const [price,setPrice]=useState("");const [stock,setStock]=useState("");const [description,setDescription]=useState("");const [brandId,setBrandId]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{if(!user?.is_staff){setLoading(false);return;}try{
    const [nextStats,nextUsers,nextBrands,nextProducts]=await Promise.all([getDashboard(),getAdminUsers(),getAdminBrands(),getAdminProducts()]);
    setStats(nextStats);setUsers(nextUsers);setBrands(nextBrands);setProducts(nextProducts);setError("");
  }catch(reason){setError(getErrorText(reason));}finally{setLoading(false);}},[user?.is_staff]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  async function perform(action:()=>Promise<unknown>,success:string){if(busy)return;setBusy(true);try{await action();await load();Alert.alert("Operación completada",success);}catch(reason){Alert.alert("No se pudo completar",getErrorText(reason));}finally{setBusy(false);}}
  async function updatePhoto(productId:number) {
    if (busy) return;
    setBusy(true);
    try {
      const image = await chooseProductImage("library");
      if (!image) return;
      await uploadProductImage(productId,image);
      await load();
      Alert.alert(t("Fotografía actualizada","Photo updated"),t("La imagen se guardó correctamente.","Image saved successfully."));
    } catch (reason) {
      Alert.alert(t("No se pudo subir la fotografía","Could not upload photo"),getErrorText(reason));
    } finally { setBusy(false); }
  }
  function submitBrand(){if(brandName.trim().length<2){Alert.alert("Validación","La marca necesita al menos dos caracteres.");return;}void perform(()=>createBrand(brandName.trim(),brandDescription.trim()),"Marca registrada correctamente.");}
  function submitProduct(){const amount=Number(price);const inventory=stock.trim()===""?null:Number(stock);
    if(!brandId||name.trim().length<3||shade.trim().length<2||!Number.isFinite(amount)||amount<=0||!/^[0-9]+(\.[0-9]{1,2})?$/.test(price.trim())||inventory!==null&&(!Number.isInteger(inventory)||inventory<0)){
      Alert.alert("Validación","Elige una marca, escribe nombre y tono válidos, precio positivo con hasta dos decimales y existencias enteras no negativas.");return;
    }
    void perform(()=>createProduct({brand_id:brandId,name:name.trim(),shade:shade.trim(),price:price.trim(),stock:inventory,description:description.trim(),is_active:true}),"Producto registrado correctamente.");
  }
  if(!user?.is_staff)return <View style={s.content}><Text style={s.error}>No tienes permisos de administrador.</Text></View>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text style={s.title}>Panel administrativo</Text><Text style={s.subtitle}>Control de catálogo, inventario y cuentas.</Text>
    {error?<Text style={s.error}>{error}</Text>:null}
    <ActionButton title={loading?"Cargando...":"Actualizar información"} secondary disabled={busy||loading} onPress={()=>void load()}/>
    {stats?<View style={s.card}><Text style={s.heading}>Resumen de la tienda</Text><Text style={s.text}>Marcas: {stats.brands} · Productos: {stats.products}</Text><Text style={s.text}>Usuarios: {stats.users} · Pedidos: {stats.orders}</Text><Text style={s.text}>Pedidos pendientes: {stats.pending_orders}</Text><Text style={s.text}>Productos con poco inventario: {stats.low_stock_products}</Text><Text style={s.muted}>Total en pedidos no cancelados: ${stats.sales_total} MXN</Text><Text style={s.muted}>Este importe no equivale a pagos recibidos.</Text></View>:null}
    <View style={s.card}><Text style={s.heading}>Registrar marca</Text><Field label="Nombre de marca" value={brandName} onChangeText={setBrandName}/><Field label="Descripción" value={brandDescription} onChangeText={setBrandDescription}/><ActionButton title="Guardar marca" disabled={busy} onPress={submitBrand}/></View>
    <View style={s.card}><Text style={s.heading}>Registrar producto</Text><Text style={s.muted}>Selecciona una marca:</Text>
      {brands.map(b=><ActionButton key={b.id} title={`${brandId===b.id?"✓ ":""}${b.name}`} secondary={brandId!==b.id} disabled={busy} onPress={()=>setBrandId(b.id)}/>)}
      <Field label="Nombre" value={name} onChangeText={setName}/><Field label="Tono" value={shade} onChangeText={setShade}/>
      <Field label="Precio (MXN)" keyboardType="decimal-pad" value={price} onChangeText={setPrice}/>
      <Field label="Existencias (vacío = sin control de inventario)" keyboardType="number-pad" value={stock} onChangeText={setStock}/>
      <Field label="Descripción" value={description} onChangeText={setDescription}/>
      <ActionButton title="Registrar producto" disabled={busy||!brands.length} onPress={submitProduct}/>
    </View>
    <View style={s.card}><Text style={s.heading}>Gestionar inventario y catálogo</Text><Text style={s.muted}>Mostrando hasta 30 productos. Utiliza Postman o Django Admin para el resto.</Text>
      {products.map(product=><View key={product.id} style={{gap:7,borderTopWidth:1,borderTopColor:palette.border,paddingVertical:10}}>
        <Text style={s.text}>{product.brand.name} · {product.name} ({product.shade})</Text><Text style={s.muted}>Existencias: {product.stock===null?"Sin seguimiento":product.stock} · ${product.price}</Text>
        <ActionButton title={t("Cambiar fotografía", "Change photo")} secondary disabled={busy} onPress={()=>void updatePhoto(product.id)}/>
        <ActionButton title={product.is_active?"Desactivar producto":"Activar producto"} secondary disabled={busy} onPress={()=>void perform(()=>updateProduct(product.id,{is_active:!product.is_active}),"Disponibilidad actualizada.")}/>
        <ActionButton title="Actualizar existencias" secondary disabled={busy} onPress={()=>Alert.prompt("Actualizar existencias","Escribe una cantidad entera no negativa.",(value: string)=>{
          if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))) {Alert.alert("Validación","Escribe una cantidad válida.");return;}
          void perform(()=>updateProduct(product.id,{stock:Number(value)}),"Inventario actualizado.");
        },"plain-text",product.stock===null?"0":String(product.stock),"number-pad")}/>
      </View>)}
    </View>
    <View style={s.card}><Text style={s.heading}>Gestionar usuarios</Text><Text style={s.muted}>Solo se permite activar o desactivar cuentas normales. Los roles administrativos no se modifican aquí.</Text>
      {users.map(target=><View key={target.id} style={{gap:6,borderTopWidth:1,borderTopColor:palette.border,paddingVertical:10}}>
        <Text style={s.text}>{target.username} · {target.is_active?"Activo":"Inactivo"}</Text>
        <Text style={s.muted}>{target.email}</Text>
        {!target.is_staff&&!target.is_active?<ActionButton title="Activar cuenta" secondary disabled={busy} onPress={()=>void perform(()=>setUserActive(target.id,true),"Cuenta activada.")}/>:null}
        {!target.is_staff&&target.is_active?<ActionButton title="Desactivar cuenta" secondary disabled={busy} onPress={()=>Alert.alert("Confirmar","¿Desactivar esta cuenta?",[{text:"Cancelar",style:"cancel"},{text:"Desactivar",style:"destructive",onPress:()=>void perform(()=>setUserActive(target.id,false),"Cuenta desactivada.")}])}/>:null}
      </View>)}
    </View>
    <ActionButton title="Gestionar pedidos" secondary onPress={()=>router.push("/(app)/admin-orders")}/>
  </ScrollView>;
}
