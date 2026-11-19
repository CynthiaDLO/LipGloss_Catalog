
import { useState } from "react";
import { Link, useRouter } from "expo-router";

import { ActivityIndicator, Platform, StyleSheet } from "react-native";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "../../components/ui/LocalizedNative";

import { useAuth } from "../../context/AuthContext";

import {
  validateLogin,
  type ValidationErrors,
} from "../../validators/authValidators";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;

    const validationErrors = validateLogin({
      username,
      password,
    });

    setErrors(validationErrors);
    setServerError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      await signIn(username.trim(), password);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            LipGloss Catalog
          </Text>

          <Text style={styles.subtitle}>
            Inicia sesión para descubrir tus brillos favoritos
          </Text>

          <Text style={styles.label}>
            Nombre de usuario
          </Text>

          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Ingresa tu usuario"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {errors.username && (
            <Text style={styles.error}>
              {errors.username}
            </Text>
          )}

          <Text style={styles.label}>
            Contraseña
          </Text>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Ingresa tu contraseña"
            secureTextEntry
            editable={!loading}
          />

          {errors.password && (
            <Text style={styles.error}>
              {errors.password}
            </Text>
          )}

          {serverError !== "" && (
            <Text style={styles.error}>
              {serverError}
            </Text>
          )}

          <Pressable
            style={[
              styles.button,
              loading && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                Iniciar sesión
              </Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text>¿No tienes cuenta? </Text>

            <Link
              href="/register"
              style={styles.link}
            >
              Regístrate
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff0f5",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    padding: 24,
    backgroundColor: "#ffffff",
    borderRadius: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#b34470",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#777777",
    marginBottom: 24,
  },
  label: {
    fontWeight: "600",
    color: "#333333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dfbfd0",
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
    fontSize: 16,
  },
  error: {
    color: "#c0392b",
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#b34470",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  link: {
    color: "#b34470",
    fontWeight: "bold",
  },
});
