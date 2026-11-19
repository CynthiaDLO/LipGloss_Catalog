
import { useState } from "react";
import { Link, useRouter } from "expo-router";

import { ActivityIndicator, Platform, StyleSheet } from "react-native";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "../../components/ui/LocalizedNative";

import { registerUser } from "../../utils/auth";

import {
  validateRegister,
  type ValidationErrors,
} from "../../validators/authValidators";

export default function RegisterScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleRegister() {
    if (loading) return;

    const validationErrors = validateRegister({
      username,
      email,
      password,
      confirmPassword,
    });

    setErrors(validationErrors);
    setServerError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setRegistered(true);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el usuario."
      );
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>
            ¡Registro exitoso!
          </Text>

          <Text style={styles.subtitle}>
            Tu cuenta se creó correctamente.
            Ahora puedes iniciar sesión.
          </Text>

          <Pressable
            style={styles.button}
            onPress={() =>
              router.replace("/login")
            }
          >
            <Text style={styles.buttonText}>
              Ir a iniciar sesión
            </Text>
          </Pressable>
        </View>
      </View>
    );
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
            Crear cuenta
          </Text>

          <Text style={styles.subtitle}>
            Regístrate en LipGloss Catalog
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
            maxLength={150}
            editable={!loading}
          />

          {errors.username && (
            <Text style={styles.error}>
              {errors.username}
            </Text>
          )}

          <Text style={styles.label}>
            Correo electrónico
          </Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="ejemplo@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={254}
            editable={!loading}
          />

          {errors.email && (
            <Text style={styles.error}>
              {errors.email}
            </Text>
          )}

          <Text style={styles.label}>
            Contraseña
          </Text>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            editable={!loading}
          />

          {errors.password && (
            <Text style={styles.error}>
              {errors.password}
            </Text>
          )}

          <Text style={styles.label}>
            Confirmar contraseña
          </Text>

          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repite tu contraseña"
            secureTextEntry
            editable={!loading}
          />

          {errors.confirmPassword && (
            <Text style={styles.error}>
              {errors.confirmPassword}
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
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                Registrarse
              </Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text>¿Ya tienes cuenta? </Text>

            <Link
              href="/(auth)/login"
              style={styles.link}
            >
              Inicia sesión
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
    justifyContent: "center",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 18,
    margin: 20,
  },
  title: {
    fontSize: 27,
    fontWeight: "bold",
    color: "#b34470",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#777777",
    textAlign: "center",
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
    fontSize: 16,
    marginBottom: 9,
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
    marginTop: 16,
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
