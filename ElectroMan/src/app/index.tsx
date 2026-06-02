import { useEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { TextInput as PaperTextInput } from "react-native-paper";
import { z } from "zod";

import { authenticateUser } from "../lib/electroman-db";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function Field({
  control,
  name,
  label,
  secureTextEntry = false,
}: {
  control: ReturnType<typeof useForm<LoginForm>>["control"];
  name: keyof LoginForm;
  label: string;
  secureTextEntry?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{label}</Text>
          <PaperTextInput
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry={secureTextEntry}
            showSoftInputOnFocus
            autoCapitalize="none"
            mode="outlined"
            outlineColor="#cbd5e1"
            activeOutlineColor="#0f766e"
            style={styles.input}
            contentStyle={styles.inputContent}
            dense
            placeholder={label}
          />
          {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
        </View>
      )}
    />
  );
}

export default function LoginScreen() {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const user = await authenticateUser(values.username, values.password);

    if (!user) {
      setStatusIsError(true);
      setStatusMessage("Username/password incorrect!");
      return;
    }

    setStatusIsError(false);
    setStatusMessage(
      "Login successful. The main screen will open in a few seconds.",
    );
    timerRef.current = setTimeout(() => {
      router.replace(`./workorders?userId=${String(user.id)}`);
    }, 3000);
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero} />
        <View style={styles.containerInner}>
          <View style={styles.card}>
            <Text style={styles.title}>ElectroMan</Text>
            <Text style={styles.subtitle}>Field worker work-order access</Text>

            <Field control={control} name="username" label="Username" />
            <Field
              control={control}
              name="password"
              label="Password"
              secureTextEntry
            />

            {statusMessage ? (
              <Text
                style={
                  statusIsError ? styles.errorBanner : styles.successBanner
                }
              >
                {statusMessage}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? "Checking..." : "Login"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("./register")}
            >
              <Text style={styles.secondaryButtonText}>Create account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e2e8f0",
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    height: 180,
    backgroundColor: "#0f766e",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  containerInner: {
    flexGrow: 1,
    marginTop: -90,
    paddingHorizontal: 20,
    justifyContent: "center",
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    color: "#475569",
    marginTop: 4,
    marginBottom: 16,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    color: "#334155",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fff",
  },
  inputContent: {
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
  errorText: {
    marginTop: 4,
    color: "#dc2626",
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  errorBanner: {
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  successBanner: {
    color: "#166534",
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
});
