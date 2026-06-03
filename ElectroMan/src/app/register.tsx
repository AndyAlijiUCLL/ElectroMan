import { useState } from "react";

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

import { createLocalUser } from "../../database/db";

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  birthdate: z.string().trim().min(1, "Birthdate is required"),
  municipality: z.string().trim().min(1, "Municipality is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  street: z.string().trim().min(1, "Street is required"),
  houseNumber: z.string().trim().min(1, "House number is required"),
  box: z.string().trim(),
  username: z.string().trim().min(1, "Username is required"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(3, "Password must be at least 3 characters"),
  termsAccepted: z.boolean().refine((value) => value === true, {
    message: "You must agree to the terms and conditions",
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

function formatBirthdate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

type RegisterTextFieldName = Exclude<keyof RegisterForm, "termsAccepted">;

function Field({
  control,
  name,
  label,
  secureTextEntry = false,
  autoCapitalize = "none",
  keyboardType,
  onValueChange,
}: {
  control: ReturnType<typeof useForm<RegisterForm>>["control"];
  name: RegisterTextFieldName;
  label: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  onValueChange?: (value: string) => string;
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
            onChangeText={(nextValue) =>
              onChange(onValueChange ? onValueChange(nextValue) : nextValue)
            }
            secureTextEntry={secureTextEntry}
            showSoftInputOnFocus
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
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

function CheckboxField({
  control,
  name,
  label,
}: {
  control: ReturnType<typeof useForm<RegisterForm>>["control"];
  name: keyof RegisterForm;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View style={styles.fieldBlock}>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => onChange(!value)}
          >
            <View
              style={[styles.checkbox, value ? styles.checkboxChecked : null]}
            >
              {value ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>{label}</Text>
          </Pressable>
          {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
        </View>
      )}
    />
  );
}

export default function RegisterScreen() {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      birthdate: "",
      municipality: "",
      postalCode: "",
      street: "",
      houseNumber: "",
      box: "",
      username: "",
      password: "",
      termsAccepted: false,
    },
  });

  const onSubmit = handleSubmit(async (values: RegisterForm) => {
    try {
      setStatusMessage("");
      await createLocalUser(values);
      setStatusIsError(false);
      setStatusMessage("Account created. Returning to login...");
      setTimeout(() => {
        router.replace("/");
      }, 1200);
    } catch (error) {
      setStatusIsError(true);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Could not create the account.",
      );
    }
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
        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            register youself on ElectroMan to manage your work orders
          </Text>

          <View style={styles.gridRow}>
            <View style={styles.gridHalf}>
              <Field
                control={control}
                name="firstName"
                label="First name"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.gridHalf}>
              <Field
                control={control}
                name="lastName"
                label="Last name"
                autoCapitalize="words"
              />
            </View>
          </View>

          <Field
            control={control}
            name="birthdate"
            label="Birthdate (YYYY-MM-DD)"
            keyboardType="numeric"
            onValueChange={formatBirthdate}
          />
          <Field
            control={control}
            name="municipality"
            label="Municipality"
            autoCapitalize="words"
          />
          <Field
            control={control}
            name="postalCode"
            label="Postal code"
            keyboardType="numeric"
          />
          <Field
            control={control}
            name="street"
            label="Street"
            autoCapitalize="words"
          />

          <View style={styles.gridRow}>
            <View style={styles.gridHalf}>
              <Field
                control={control}
                name="houseNumber"
                label="House number"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridHalf}>
              <Field control={control} name="box" label="Box" />
            </View>
          </View>

          <Field control={control} name="username" label="Username" />
          <Field
            control={control}
            name="password"
            label="Password"
            secureTextEntry
          />

          <CheckboxField
            control={control}
            name="termsAccepted"
            label="I agree to the terms and conditions"
          />

          {statusMessage ? (
            <Text
              style={statusIsError ? styles.errorBanner : styles.successBanner}
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
              {isSubmitting ? "Saving..." : "Create account"}
            </Text>
          </Pressable>

          <Pressable style={styles.linkButton} onPress={() => router.back()}>
            <Text style={styles.linkText}>Back to login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    color: "#475569",
    marginBottom: 12,
  },
  fieldBlock: {
    marginBottom: 10,
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
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  gridHalf: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  checkboxMark: {
    color: "#fff",
    fontWeight: "700",
  },
  checkboxLabel: {
    color: "#334155",
    fontSize: 14,
    flexShrink: 1,
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  linkText: {
    color: "#111827",
    fontWeight: "600",
  },
  errorBanner: {
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  successBanner: {
    color: "#166534",
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 6,
  },
});
