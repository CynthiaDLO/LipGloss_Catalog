/**
 * Shared presentation primitives. Existing screens keep their business logic and
 * API requests; these wrappers apply app preferences at render time to static
 * StyleSheet and inline styles, including native modal descendants.
 */
import React, { forwardRef } from "react";
import * as RN from "react-native";
import { useAppearance } from "../../context/AppearanceContext";
import { translateText } from "../../localization/translate";

const lightColors: Record<string, string> = {
  "#fff9f8": "background", "#ffffff": "surface", "#fff": "surface",
  "#9a3159": "primary", "#fbeaf0": "soft", "#321f2a": "ink",
  "#796a71": "muted", "#f0dde3": "border", "#ab2747": "danger",
  "#fce9ed": "soft", "#fff5f8": "background", "#fdf0f5": "soft",
  "#faf7fa": "background", "#fffafa": "background", "#f8e9ef": "soft",
  "#000000": "ink", "#000": "ink", "#333333": "ink", "#333": "ink",
};

type Palette = ReturnType<typeof useAppearance>["colors"];
function resolveColor(raw: string, property: string, colors: Palette, dark: boolean): string {
  const highContrast = colors.background === "#FFFFFF" || colors.background === "#000000";
  if (!dark && !highContrast) return raw;
  const c = raw.toLowerCase().trim();
  // White text remains readable on the deeper primary button background.
  if (property === "color" && (c === "white" || c === "#fff" || c === "#ffffff")) return "#FFFFFF";
  if (property === "backgroundColor" && (c === "white" || c === "#fff" || c === "#ffffff")) return colors.surface;
  const role = lightColors[c];
  if (role === "primary" && property === "backgroundColor") return dark ? "#93345E" : colors.primary;
  if (role) return colors[role as keyof Palette];
  if (c === "#f7f7f7" || c === "#fafafa" || c === "#f5f5f5" || c === "#f9f9f9") return property === "color" ? colors.ink : colors.surface;
  if (c === "#eeeeee" || c === "#eaeaea" || c === "#dddddd") return colors.border;
  if (c === "#666666" || c === "#777777" || c === "#888888") return colors.muted;
  if (/^#[0-9a-f]{6}$/.test(c)) {
    const n = parseInt(c.slice(1),16);
    const red=(n>>16)&255, green=(n>>8)&255, blue=n&255;
    const max=Math.max(red,green,blue),min=Math.min(red,green,blue);
    if (min>225 && property!=="color") return colors.surface;
    if (max-min<20 && min>105 && max<200) return property==="borderColor" ? colors.border : colors.muted;
    if (max<95 && property==="color") return colors.ink;
  }
  return raw;
}
function adjustStyle(style: RN.StyleProp<any>, colors: Palette, dark: boolean, scale: number, family: string, kind: "text"|"view"|"input" = "view") {
  if (!style && kind === "view") return style;
  const flattened = RN.StyleSheet.flatten(style) || {};
  const out: Record<string, any> = { ...flattened };
  for (const prop of ["color", "backgroundColor", "borderColor", "borderTopColor", "borderBottomColor", "borderLeftColor", "borderRightColor", "tintColor", "textDecorationColor"]) {
    if (typeof out[prop] === "string") out[prop] = resolveColor(out[prop],prop,colors,dark);
  }
  if (kind === "text" || kind === "input") {
    if (typeof out.fontSize === "number") out.fontSize = out.fontSize * scale;
    else out.fontSize = 14 * scale;
    if (typeof out.lineHeight === "number") out.lineHeight = out.lineHeight * scale;
    // Avoid overriding an explicitly configured typeface (e.g. icon fonts).
    if (!out.fontFamily && family !== "system") out.fontFamily = family === "serif" ? "Georgia" : RN.Platform.select({ios:"Menlo",android:"monospace",default:"monospace"});
    if (kind === "text" && !out.color) out.color = colors.ink;
    if (kind === "input" && !out.color) out.color = colors.ink;
  }
  return out;
}

export const Text = forwardRef<React.ElementRef<typeof RN.Text>, RN.TextProps>(function LocalizedText({ children, style, ...props }, ref) {
  const { colors, fontScale, preferences, fontFamily, dark } = useAppearance();
  const convert = (child: React.ReactNode): React.ReactNode => {
    if (typeof child === "string") return translateText(child,preferences.language);
    if (Array.isArray(child)) return child.map(convert);
    return child;
  };
  return <RN.Text ref={ref} {...props} style={adjustStyle(style,colors,dark,fontScale,fontFamily,"text")}>{convert(children)}</RN.Text>;
});
export const View = forwardRef<React.ElementRef<typeof RN.View>, RN.ViewProps>(function ThemedView({style,...props},ref) {
  const {colors,dark} = useAppearance();return <RN.View ref={ref} {...props} style={adjustStyle(style,colors,dark,1,"system")}/>;
});
export const Pressable = forwardRef<React.ElementRef<typeof RN.Pressable>, RN.PressableProps>(function ThemedPressable({style,accessibilityLabel,...props},ref) {
  const {colors,preferences,dark} = useAppearance();
  const map = (s: RN.ViewStyle) => adjustStyle(s,colors,dark,1,"system");
  const nextStyle: RN.PressableProps["style"] = typeof style === "function" ? state => map(style(state) as RN.ViewStyle) : map(style as RN.ViewStyle);
  return <RN.Pressable ref={ref} {...props} accessibilityLabel={accessibilityLabel ? translateText(accessibilityLabel, preferences.language):undefined} style={nextStyle}/>;
});
export const ScrollView = forwardRef<React.ElementRef<typeof RN.ScrollView>, RN.ScrollViewProps>(function ThemedScrollView({style,contentContainerStyle,...props},ref) {
  const {colors,dark}=useAppearance();
  return <RN.ScrollView ref={ref} {...props} style={adjustStyle(style,colors,dark,1,"system")} contentContainerStyle={adjustStyle(contentContainerStyle,colors,dark,1,"system")}/>;
});
export const TextInput = forwardRef<React.ElementRef<typeof RN.TextInput>, RN.TextInputProps>(function ThemedTextInput({style,placeholder,accessibilityLabel,placeholderTextColor,...props},ref) {
  const {colors,fontScale,fontFamily,preferences,dark}=useAppearance();
  return <RN.TextInput ref={ref} {...props} style={adjustStyle(style,colors,dark,fontScale,fontFamily,"input")} placeholder={placeholder ? translateText(placeholder,preferences.language):undefined} accessibilityLabel={accessibilityLabel ? translateText(accessibilityLabel,preferences.language):undefined} placeholderTextColor={colors.muted}/>;
});
export const FlatList = forwardRef<any, RN.FlatListProps<any>>(function ThemedList({style,contentContainerStyle,columnWrapperStyle,...props},ref) {
  const {colors,dark}=useAppearance();
  return <RN.FlatList ref={ref} {...props} style={adjustStyle(style,colors,dark,1,"system")} contentContainerStyle={adjustStyle(contentContainerStyle,colors,dark,1,"system")} columnWrapperStyle={adjustStyle(columnWrapperStyle,colors,dark,1,"system")}/>;
}) as unknown as typeof RN.FlatList;
export const KeyboardAvoidingView = forwardRef<React.ElementRef<typeof RN.KeyboardAvoidingView>, RN.KeyboardAvoidingViewProps>(function ThemedKeyboard({style,...props},ref) {
  const {colors,dark}=useAppearance();return <RN.KeyboardAvoidingView ref={ref} {...props} style={adjustStyle(style,colors,dark,1,"system")}/>;
});
export const ActivityIndicator = RN.ActivityIndicator;
export const StyleSheet = RN.StyleSheet;
export const Platform = RN.Platform;
export const Image = RN.Image;
export const RefreshControl = RN.RefreshControl;
export const Switch = RN.Switch;
export const Modal = RN.Modal;
export const Alert = {
  ...RN.Alert,
  alert(title: string, message?: string, buttons?: RN.AlertButton[], options?: RN.AlertOptions) {
    const tr = (s:string) => translateText(s);
    RN.Alert.alert(tr(title),message ? tr(message) : undefined,buttons?.map(b=>({...b,text:b.text ? tr(b.text):undefined})),options);
  },
  prompt(title:string,message?:string,callbackOrButtons?:any,type?:any,defaultValue?:string,keyboardType?:any){
    RN.Alert.prompt(translateText(title),message?translateText(message):undefined,
      Array.isArray(callbackOrButtons)?callbackOrButtons.map(b=>({...b,text:b.text?translateText(b.text):undefined})):callbackOrButtons,
      type,defaultValue,keyboardType);
  },
};
