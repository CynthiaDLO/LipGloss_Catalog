import { useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "../../components/ui/LocalizedNative";
import { useAuth } from "../../context/AuthContext";
import { useAppearance, type Appearance, type FontFamilyName, type LocalPreferences } from "../../context/AppearanceContext";

const themeOptions=[{value:"system",es:"Sistema",en:"System"},{value:"light",es:"Claro",en:"Light"},{value:"dark",es:"Oscuro",en:"Dark"}] as const;
const languageOptions=[{value:"es",label:"Español"},{value:"en",label:"English"}] as const;
const sizeOptions=[{value:"0.90",label:"90%"},{value:"1.00",label:"100%"},{value:"1.15",label:"115%"},{value:"1.30",label:"130%"}] as const;

export default function SettingsScreen(){
  const {user,signOut}=useAuth();
  const {preferences,local,colors,dark,fontScale,ready,update,updateLocal,reset,translate:t}=useAppearance();
  const [saving,setSaving]=useState(false);
  const [loggingOut,setLoggingOut]=useState(false);
  function confirmLogout(){
    if(saving||loggingOut)return;
    Alert.alert(
      t("Cerrar sesión","Sign out"),
      t("¿Quieres cerrar tu sesión?","Do you want to sign out?"),
      [
        {text:t("Cancelar","Cancel"),style:"cancel"},
        {text:t("Cerrar sesión","Sign out"),style:"destructive",onPress:()=>void handleLogout()},
      ],
    );
  }
  async function handleLogout(){
    if(loggingOut)return;
    setLoggingOut(true);
    try{await signOut();}
    catch(error){Alert.alert(t("No se pudo cerrar sesión","Could not sign out"),error instanceof Error?error.message:t("Intenta de nuevo.","Try again."));}
    finally{setLoggingOut(false);}
  }
  async function changeRemote(changes:Partial<Appearance>){
    if(saving)return;setSaving(true);
    try{await update(changes);}catch(error){Alert.alert(t("No se pudieron guardar las preferencias.","Could not save preferences."),error instanceof Error?error.message:t("Intenta de nuevo.","Try again."));}finally{setSaving(false);}
  }
  async function changeLocal(changes:Partial<LocalPreferences>){
    if(saving)return;setSaving(true);
    try{await updateLocal(changes);}catch(error){Alert.alert(t("No se pudieron guardar las preferencias.","Could not save preferences."),error instanceof Error?error.message:t("Intenta de nuevo.","Try again."));}finally{setSaving(false);}
  }
  const text=(size:number,weight?:"700"|"800")=>({color:colors.ink,fontSize:size,fontWeight:weight});
  function selector<T extends string|number|boolean>(options:{value:T;label:string}[],selected:T,onPress:(value:T)=>void){
    return <View style={styles.options}>{options.map(item=>{
      const selectedItem=item.value===selected;
      return <Pressable key={String(item.value)} disabled={saving} accessibilityRole="button" accessibilityState={{selected:selectedItem}} onPress={()=>onPress(item.value)} style={[styles.option,{backgroundColor:selectedItem?(dark?"#78304E":colors.primary):colors.soft,borderColor:colors.border}]}><Text style={{color:selectedItem?"#FFFFFF":colors.ink,fontSize:13,fontWeight:"700"}}>{item.label}</Text></Pressable>;
    })}</View>;
  }
  const section=(title:string,children:ReactNode,caption?:string)=><View style={[styles.card,{backgroundColor:colors.surface,borderColor:colors.border}]}><Text style={text(17,"700")}>{title}</Text>{children}{caption?<Text style={{color:colors.muted,fontSize:12}}>{caption}</Text>:null}</View>;
  return <ScrollView style={{backgroundColor:colors.background,flex:1}} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={text(26,"800")}>{t("Ajustes","Settings")}</Text>
    <Text style={{color:colors.muted,fontSize:14}}>{t("Personaliza tu experiencia.","Customize your experience.")}</Text>
    {!ready||saving?<ActivityIndicator color={colors.primary}/>:null}
    {section(t("Mi cuenta","My account"),<><Text style={text(14)}>{t("Usuario","User")}: {user?.username}</Text><Text style={text(14)}>{t("Correo","Email")}: {user?.email||"—"}</Text><Text style={text(14)}>{t("Rol","Role")}: {user?.is_staff?t("Administrador","Administrator"):t("Cliente","Customer")}</Text></>)}
    {section(t("Apariencia","Appearance"),<><Text style={text(13)}>{t("Tema","Theme")}</Text>{selector(themeOptions.map(x=>({value:x.value,label:t(x.es,x.en)})),preferences.theme,value=>void changeRemote({theme:value}))}</>,t("Sistema sigue el aspecto de iOS.","System follows your device appearance."))}
    {section(t("Idioma","Language"),selector(languageOptions.map(x=>({value:x.value,label:x.label})),preferences.language,value=>void changeRemote({language:value})),t("Se sincroniza con tu cuenta.","Synced with your account."))}
    {section(t("Tamaño del texto","Text size"),selector(sizeOptions.map(x=>({value:x.value,label:x.label})),preferences.font_scale,value=>void changeRemote({font_scale:value})),t("Se sincroniza con tu cuenta.","Synced with your account."))}
    {section(t("Fuente del texto","Font family"),selector<FontFamilyName>([{value:"system",label:t("Fuente del sistema","System font")},{value:"serif",label:t("Fuente clásica","Serif font")},{value:"monospace",label:"Monospace"}],local.font_family,value=>void changeLocal({font_family:value})),t("Se guarda en este dispositivo.","Saved on this device."))}
    {section(t("Accesibilidad","Accessibility"),<>
      <Text style={text(13)}>{t("Alto contraste","High contrast")}</Text>
      {selector([{value:false,label:t("No","No")},{value:true,label:t("Sí","Yes")}],local.high_contrast,value=>void changeLocal({high_contrast:value}))}
      <Text style={text(13)}>{t("Reducir movimiento","Reduce motion")}</Text>
      {selector([{value:false,label:t("No","No")},{value:true,label:t("Sí","Yes")}],local.reduce_motion,value=>void changeLocal({reduce_motion:value}))}
    </>,t("Se guarda en este dispositivo.","Saved on this device."))}
    {section(t("Vista previa","Preview"),<Text style={{fontSize:17,color:colors.ink}}>{t("Texto de muestra para comprobar la legibilidad.","Sample text to check readability.")}</Text>)}
    {section(t("Productos por página","Products per page"),selector([5,10,15,20,30].map(value=>({value,label:String(value)})),preferences.page_size,value=>void changeRemote({page_size:value})),t("Se sincroniza con tu cuenta.","Synced with your account."))}
    <Pressable disabled={saving} accessibilityRole="button" onPress={()=>Alert.alert(t("Restablecer preferencias","Reset preferences"),t("¿Quieres restablecer los ajustes predeterminados?","Reset settings to their defaults?"),[{text:t("Cancelar","Cancel"),style:"cancel"},{text:t("Confirmar","Confirm"),onPress:()=>void (async()=>{setSaving(true);try{await reset();Alert.alert(t("Preferencias guardadas","Preferences saved"),t("La configuración se ha restablecido.","Settings have been reset."));}catch(e){Alert.alert(t("Error","Error"),e instanceof Error?e.message:"Error");}finally{setSaving(false);}})()}])} style={[styles.reset,{borderColor:colors.border,backgroundColor:colors.surface}]}><Text style={{fontSize:14,color:colors.primary,fontWeight:"700",textAlign:"center"}}>{t("Restablecer preferencias","Reset preferences")}</Text></Pressable>
    {section(t("Sesión","Session"),<Pressable disabled={saving||loggingOut} accessibilityRole="button" accessibilityLabel={t("Cerrar sesión","Sign out")} onPress={confirmLogout} style={[styles.logout,{backgroundColor:colors.surface,borderColor:colors.border,opacity:saving||loggingOut?0.6:1}]}><Text style={{fontSize:15,color:colors.primary,fontWeight:"800",textAlign:"center"}}>{loggingOut?t("Cerrando sesión...","Signing out..."):t("Cerrar sesión","Sign out")}</Text></Pressable>,t("Puedes volver a iniciar sesión cuando quieras.","You can sign in again whenever you like."))}
  </ScrollView>;
}
const styles=StyleSheet.create({content:{padding:18,paddingBottom:64,gap:14},card:{borderWidth:1,borderRadius:16,padding:16,gap:12},options:{flexDirection:"row",flexWrap:"wrap",gap:8},option:{borderRadius:12,borderWidth:1,paddingHorizontal:12,paddingVertical:10},reset:{borderWidth:1,borderRadius:12,padding:16},logout:{borderWidth:1,borderRadius:12,padding:14}});
