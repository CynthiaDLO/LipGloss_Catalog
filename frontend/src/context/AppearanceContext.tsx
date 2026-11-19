import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "./AuthContext";
import { getPreferences, savePreferences, type UserPreferences } from "../services/discovery";
import { setActiveLanguage, translateText } from "../localization/translate";

export type Appearance = UserPreferences;
export type FontFamilyName = "system" | "serif" | "monospace";
export type LocalPreferences = {font_family: FontFamilyName; high_contrast: boolean; reduce_motion: boolean};
const defaults: Appearance = {theme:"system",page_size:10,language:"es",font_scale:"1.00"};
const localDefaults: LocalPreferences = {font_family:"system",high_contrast:false,reduce_motion:false};
const colorsLight = { background:"#FFF9F8",surface:"#FFFFFF",primary:"#9A3159",soft:"#FBEAF0",ink:"#321F2A",muted:"#796A71",border:"#F0DDE3",danger:"#AB2747" };
const colorsDark = { background:"#171017",surface:"#281D27",primary:"#F3A0BB",soft:"#392532",ink:"#FFF1F6",muted:"#D2B7C3",border:"#57404F",danger:"#FF879D" };
const colorsContrastLight = {background:"#FFFFFF",surface:"#FFFFFF",primary:"#701136",soft:"#F5E4EB",ink:"#17000D",muted:"#442332",border:"#70394E",danger:"#860025"};
const colorsContrastDark = {background:"#000000",surface:"#101010",primary:"#FFBDD6",soft:"#232023",ink:"#FFFFFF",muted:"#E5E5E5",border:"#BBBBBB",danger:"#FF9DAE"};
export type ThemeColors = typeof colorsLight;
type State = {
  preferences: Appearance; colors: ThemeColors; fontScale: number; fontFamily: FontFamilyName;
  local: LocalPreferences; ready: boolean; dark: boolean;
  update: (changes: Partial<Appearance>) => Promise<void>;
  updateLocal: (changes: Partial<LocalPreferences>) => Promise<void>;
  reload: () => Promise<void>;
  reset: () => Promise<void>;
  translate: (spanish:string, english:string) => string;
};
const Context = createContext<State | null>(null);
const key = (id:number, part:string) => `lipgloss_${part}_${id}`;
async function readStorage(name:string):Promise<string|null>{
  try {if(Platform.OS==="web") return typeof localStorage==="undefined"?null:localStorage.getItem(name);return await SecureStore.getItemAsync(name);}catch{return null;}
}
async function writeStorage(name:string,value:string):Promise<void>{
  if(Platform.OS==="web") {if(typeof localStorage!=="undefined")localStorage.setItem(name,value);return;}
  await SecureStore.setItemAsync(name,value);
}
function validateRemote(input: Partial<Appearance>): Partial<Appearance> {
  const out: Partial<Appearance>={};
  if(input.theme!==undefined){if(!["light","dark","system"].includes(input.theme))throw new Error("Tema inválido.");out.theme=input.theme;}
  if(input.language!==undefined){if(!["es","en"].includes(input.language))throw new Error("Idioma inválido.");out.language=input.language;}
  if(input.font_scale!==undefined){if(!["0.90","1.00","1.15","1.30"].includes(String(input.font_scale)))throw new Error("Tamaño de letra inválido.");out.font_scale=String(input.font_scale);}
  if(input.page_size!==undefined){if(![5,10,15,20,30].includes(input.page_size))throw new Error("Cantidad por página inválida.");out.page_size=input.page_size;}
  return out;
}
export function AppearanceProvider({children}:{children:ReactNode}){
  const {user}=useAuth();
  const scheme=useColorScheme();
  const [preferences,setPreferences]=useState<Appearance>(defaults);
  const [local,setLocal]=useState<LocalPreferences>(localDefaults);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    let mounted=true;setReady(false);setPreferences(defaults);setLocal(localDefaults);setActiveLanguage("es");
    if(!user){setReady(true);return()=>{mounted=false;};}
    const userId=user.id;
    void (async()=>{
      const [remoteCache,localCache]=await Promise.all([readStorage(key(userId,"remote")),readStorage(key(userId,"local"))]);
      if(!mounted)return;
      if(remoteCache){try{const cached=JSON.parse(remoteCache);setPreferences({...defaults,...validateRemote(cached)});}catch{}}
      if(localCache){try{const cached=JSON.parse(localCache);setLocal({...localDefaults,...cached});}catch{}}
      try{const remote=await getPreferences();if(mounted){setPreferences({...defaults,...remote});await writeStorage(key(userId,"remote"),JSON.stringify(remote));}}catch{ /* Keep the last known working configuration when offline. */ }
      finally{if(mounted)setReady(true);}
    })();
    return()=>{mounted=false;};
  },[user?.id]);
  useEffect(()=>{setActiveLanguage(preferences.language);},[preferences.language]);
  async function reload(){if(!user)return;const remote=await getPreferences();setPreferences({...defaults,...remote});await writeStorage(key(user.id,"remote"),JSON.stringify(remote));}
  async function update(changes:Partial<Appearance>){
    if(!user)throw new Error("Inicia sesión para guardar tus preferencias.");
    const valid=validateRemote(changes);
    const saved=await savePreferences(valid);
    const next={...defaults,...saved};setPreferences(next);setActiveLanguage(next.language);
    await writeStorage(key(user.id,"remote"),JSON.stringify(next));
  }
  async function updateLocal(changes:Partial<LocalPreferences>){
    if(!user)throw new Error("Inicia sesión para guardar tus preferencias.");
    if(changes.font_family && !["system","serif","monospace"].includes(changes.font_family))throw new Error("Fuente inválida.");
    for(const field of ["high_contrast","reduce_motion"] as const){if(changes[field]!==undefined&&typeof changes[field]!=="boolean")throw new Error("Preferencia inválida.");}
    const next={...local,...changes};await writeStorage(key(user.id,"local"),JSON.stringify(next));setLocal(next);
  }
  async function reset(){await update(defaults);await updateLocal(localDefaults);}
  const dark=preferences.theme==="dark"||(preferences.theme==="system"&&scheme==="dark");
  const colors=local.high_contrast?(dark?colorsContrastDark:colorsContrastLight):(dark?colorsDark:colorsLight);
  const value=useMemo<State>(()=>({preferences,local,colors,ready,dark,fontScale:Number(preferences.font_scale)||1,fontFamily:local.font_family,update,updateLocal,reload,reset,translate:(es,en)=>preferences.language==="en"?en:es}),[preferences,local,colors,ready,dark,user]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppearance(){const context=useContext(Context);if(!context)throw new Error("AppearanceProvider is missing");return context;}
