import { ActivityIndicator, StyleSheet } from "react-native";
import { Pressable, Text, View } from "../../components/ui/LocalizedNative";
import type { ReactNode } from "react";

export const palette = { background: "#FFF9F8", surface: "#FFFFFF", primary: "#9A3159", soft: "#FBEAF0", ink: "#321F2A", muted: "#796A71", border: "#F0DDE3", danger: "#AB2747" };
export const commerceStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  title: { fontSize: 27, color: palette.ink, fontWeight: "800" },
  subtitle: { fontSize: 14, color: palette.muted, lineHeight: 20 },
  card: { padding: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 18, gap: 9 },
  heading: { fontSize: 17, fontWeight: "700", color: palette.ink },
  text: { color: palette.ink, fontSize: 14 },
  muted: { color: palette.muted, fontSize: 13 },
  total: { color: palette.primary, fontWeight: "800", fontSize: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  error: { color: palette.danger, backgroundColor: "#FCE9ED", padding: 12, borderRadius: 12 },
  button: { backgroundColor: palette.primary, paddingHorizontal: 18, paddingVertical: 14, alignItems: "center", borderRadius: 12 },
  secondaryButton: { backgroundColor: palette.soft, paddingHorizontal: 13, paddingVertical: 11, alignItems: "center", borderRadius: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryText: { color: palette.primary, fontWeight: "700" },
});
export function ActionButton({ title, onPress, disabled = false, secondary = false }: {title: string; onPress: () => void; disabled?: boolean; secondary?: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} style={[secondary ? commerceStyles.secondaryButton : commerceStyles.button, disabled && {opacity: 0.5}]} onPress={onPress}><Text style={secondary ? commerceStyles.secondaryText : commerceStyles.buttonText}>{title}</Text></Pressable>;
}
export function ScreenLoading() { return <View style={{flex: 1, justifyContent:"center", alignItems:"center", backgroundColor: palette.background}}><ActivityIndicator size="large" color={palette.primary}/><Text style={{marginTop: 10, color:palette.muted}}>Cargando...</Text></View>; }
export function ScreenMessage({ children }: {children: ReactNode}) {return <View style={commerceStyles.card}><Text style={commerceStyles.muted}>{children}</Text></View>;}
export function getErrorText(error: unknown): string {return error instanceof Error ? error.message : "Ocurrió un error inesperado. Intenta nuevamente.";}
