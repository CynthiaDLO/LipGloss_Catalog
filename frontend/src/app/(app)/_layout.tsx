import { Stack, usePathname, useRouter, type Href } from "expo-router";
import { StyleSheet } from "react-native";
import { Pressable, Text, View } from "../../components/ui/LocalizedNative";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useAppearance } from "../../context/AppearanceContext";

type NavigationEntry = { label: string; icon: string; href: string };

const customerNavigation: NavigationEntry[] = [
  { label: "Catálogo", icon: "⌂", href: "/" },
  { label: "Carrito", icon: "▣", href: "/cart" },
  { label: "Compras", icon: "◷", href: "/orders" },
  { label: "Favoritos", icon: "♡", href: "/favorites" },
  { label: "Ajustes", icon: "⚙", href: "/settings" },
];
const administratorNavigation: NavigationEntry[] = [
  { label: "Catálogo", icon: "⌂", href: "/" },
  { label: "Inventario", icon: "▣", href: "/admin-dashboard" },
  { label: "Marcas", icon: "◇", href: "/admin-brands" },
  { label: "Usuarios", icon: "♙", href: "/admin-users" },
  { label: "Pedidos", icon: "◷", href: "/admin-orders" },
  { label: "Ajustes", icon: "⚙", href: "/settings" },
];

function BottomNavigation() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, fontScale, translate } = useAppearance();
  const navigation = user?.is_staff ? administratorNavigation : customerNavigation;
  return (
    <View style={[styles.navigation, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.surface, borderColor: colors.border }]}>
      {navigation.map(item => {
        const active = item.href === "/" ? pathname === "/" || pathname === "/index" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return <Pressable key={item.href} accessibilityRole="tab" accessibilityState={{selected: active}}
          accessibilityLabel={item.label} onPress={() => router.replace(item.href as Href)}
          style={[styles.tab, active && {backgroundColor: colors.soft}]}>
          <Text style={[styles.icon, {color: active ? colors.primary : colors.muted, fontSize: 20}]}>{item.icon}</Text>
          <Text numberOfLines={1} style={[styles.label, {color: active ? colors.primary : colors.muted, fontSize: (user?.is_staff ? 9 : 10)}]}>{translate(item.label, ({"Catálogo":"Catalog","Carrito":"Cart","Compras":"Orders","Favoritos":"Favorites","Ajustes":"Settings","Inventario":"Inventory","Marcas":"Brands","Usuarios":"Users","Pedidos":"Orders"} as Record<string,string>)[item.label] || item.label)}</Text>
        </Pressable>;
      })}
    </View>
  );
}

export default function AppLayout() {
  const { colors, translate } = useAppearance();
  return <View style={[styles.screen,{backgroundColor:colors.background}]}>
    <View style={styles.content}>
      <Stack screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.primary,headerTitleStyle:{fontWeight:"700",color:colors.ink},contentStyle:{backgroundColor:colors.background}}}>
        <Stack.Screen name="index" options={{title:"LipGloss Beauty",headerBackVisible:false}} />
        <Stack.Screen name="product/[id]" options={{title:translate("Detalles del producto","Product details")}} />
        <Stack.Screen name="favorites" options={{title:translate("Mis favoritos","My favorites")}} />
        <Stack.Screen name="settings" options={{title:translate("Mis ajustes","My settings")}} />
        <Stack.Screen name="cart" options={{title:translate("Mi carrito","My cart")}} />
        <Stack.Screen name="orders" options={{title:translate("Mis compras","My purchases")}} />
        <Stack.Screen name="admin-dashboard" options={{title:translate("Inventario y catálogo","Inventory and catalog")}} />
        <Stack.Screen name="admin-orders" options={{title:translate("Gestión de pedidos","Order management")}} />
        <Stack.Screen name="admin-brands" options={{title:translate("Marcas","Brands")}} />
        <Stack.Screen name="admin-brand/[id]" options={{title:translate("Detalle de marca","Brand details")}} />
        <Stack.Screen name="admin-users" options={{title:translate("Usuarios","Users")}} />
      </Stack>
    </View>
    <BottomNavigation />
  </View>;
}
const styles = StyleSheet.create({
  screen:{flex:1},content:{flex:1},
  navigation:{flexDirection:"row",borderTopWidth:1,paddingTop:7,paddingHorizontal:4},
  tab:{flex:1,alignItems:"center",justifyContent:"center",paddingVertical:5,gap:2,borderRadius:12},
  icon:{fontSize:20},label:{fontSize:10,fontWeight:"600"},
});
