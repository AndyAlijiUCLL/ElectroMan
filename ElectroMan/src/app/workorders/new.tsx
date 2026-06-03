import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
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


import { addWorkorder } from "../../../database/db";

const workOrderSchema = z.object({
  city: z.string().trim().min(1, "City is required"),
  device: z.string().trim().min(1, "Device is required"),
  problemCode: z.string().trim().min(1, "Problem code is required"),
  customerName: z.string().trim().min(1, "Name is required"),
  detailedProblemDescription: z.string().trim().optional(),
});

type WorkOrderForm = z.infer<typeof workOrderSchema>;

function Field({
  control,
  name,
  label,
  autoCapitalize = "none",
}: {
  control: ReturnType<typeof useForm<WorkOrderForm>>["control"];
  name: keyof WorkOrderForm;
  label: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  // This helper renders a single form field with a label and error text.
  // Controller wraps the native input and connects it to react-hook-form.
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
            showSoftInputOnFocus
            autoCapitalize={autoCapitalize}
            mode="outlined"
            outlineColor="#cbd5e1"
            activeOutlineColor="#111827"
            style={styles.input}
            contentStyle={styles.inputContent}
            dense={label !== "Detailed problem description"}
            multiline={label === "Detailed problem description"}
            numberOfLines={
              label === "Detailed problem description" ? 5 : undefined
            }
            placeholder={label}
          />
          {/* PaperTextInput is from react-native-paper, a UI library for RN.
              This is not a web <input> or <textarea>. */}
          {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
        </View>
      )}
    />
  );
}

export default function NewWorkOrderScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const [statusMessage, setStatusMessage] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<WorkOrderForm>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      city: "",
      device: "",
      problemCode: "",
      customerName: "",
      detailedProblemDescription: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    // handleSubmit validates the form before calling this handler.
    // If the form is invalid, react-hook-form prevents submission.
    try {
      setStatusMessage("");
      await addWorkorder(
        values.city,
        values.device,
        values.problemCode,
        values.customerName,
        values.detailedProblemDescription,
      );
      router.replace(`/workorders?userId=${params.userId ?? ""}`);
    } catch (error) {
      setStatusIsError(true);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Could not save the work order.",
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
          <Text style={styles.title}>New work order</Text>
          <Text style={styles.subtitle}>Add a work order</Text>

          <Field
            control={control}
            name="city"
            label="City"
            autoCapitalize="words"
          />
          <Field
            control={control}
            name="device"
            label="Device"
            autoCapitalize="words"
          />
          <Field control={control} name="problemCode" label="Problem code" />
          <Field
            control={control}
            name="customerName"
            label="Name"
            autoCapitalize="words"
          />
          <Field
            control={control}
            name="detailedProblemDescription"
            label="Detailed problem description"
            autoCapitalize="sentences"
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
              {isSubmitting ? "Saving..." : "Save work order"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              router.replace(`/workorders?userId=${params.userId ?? ""}`)
            }
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
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
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    color: "#475569",
    marginTop: 4,
    marginBottom: 14,
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
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#111827",
    fontWeight: "600",
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
