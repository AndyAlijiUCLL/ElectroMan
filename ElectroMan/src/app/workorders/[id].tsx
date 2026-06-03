import { useEffect, useState } from "react";

import { router, useLocalSearchParams } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getWorkOrderById,
  reopenWorkOrder,
  saveRepairInformation,
  type WorkOrderRow,
} from "../../../database/db";

export default function WorkOrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; userId?: string }>();
  const workOrderId = Number(params.id);
  const [workOrder, setWorkOrder] = useState<WorkOrderRow | null>(null);
  const [repairInformation, setRepairInformation] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadWorkOrder() {
      if (!Number.isFinite(workOrderId)) {
        setStatusIsError(true);
        setStatusMessage("Invalid work order.");
        return;
      }

      const result = await getWorkOrderById(workOrderId);

      if (!active) {
        return;
      }

      if (!result) {
        setStatusIsError(true);
        setStatusMessage("Work order not found.");
        return;
      }

      setWorkOrder(result);
      setRepairInformation(result.repairInformation);
      setStatusMessage("");
    }

    void loadWorkOrder();

    return () => {
      active = false;
    };
  }, [workOrderId]);

  const onSave = async () => {
    if (!repairInformation.trim()) {
      setStatusIsError(true);
      setStatusMessage("Not saved. No repair information was entered!");
      return;
    }

    await saveRepairInformation(workOrderId, repairInformation);
    router.replace(`/workorders?userId=${params.userId ?? ""}`);
  };

  const onReopen = async () => {
    await reopenWorkOrder(workOrderId);
    setWorkOrder((current) =>
      current ? { ...current, processed: 0 } : current,
    );
    setStatusIsError(false);
    setStatusMessage("Work order reopened. You can now edit repair details.");
  };

  const onCancel = () => {
    router.replace(`/workorders?userId=${params.userId ?? ""}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <Pressable onPress={onCancel}>
          <Text style={styles.toolbarAction}>Cancel</Text>
        </Pressable>
        <Text style={styles.toolbarTitle}>Detail</Text>
        <Pressable
          onPress={workOrder?.processed ? onReopen : onSave}
          disabled={workOrder?.processed !== 1 && !repairInformation.trim()}
        >
          <Text style={styles.toolbarAction}>
            {workOrder?.processed ? "Re-open" : "Save"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Detailed problem description:</Text>
        <Text style={styles.bodyText}>
          {workOrder?.detailedProblemDescription ?? "Loading..."}
        </Text>

        <Text style={styles.sectionTitle}>Repair information:</Text>
        {workOrder?.processed ? (
          <View style={styles.readonlyBox}>
            <Text style={styles.bodyText}>
              {workOrder.repairInformation ||
                "No repair information recorded yet."}
            </Text>
          </View>
        ) : (
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={8}
            value={repairInformation}
            onChangeText={setRepairInformation}
            placeholder="Describe the repair actions you took"
            textAlignVertical="top"
          />
        )}

        {statusMessage ? (
          <Text
            style={statusIsError ? styles.errorBanner : styles.successBanner}
          >
            {statusMessage}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    paddingBottom: 24,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toolbarTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  toolbarAction: {
    color: "#0f766e",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
    marginTop: 8,
  },
  bodyText: {
    color: "#334155",
    lineHeight: 22,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    padding: 14,
    minHeight: 160,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  readonlyBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#f8fafc",
  },
  errorBanner: {
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  successBanner: {
    color: "#166534",
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
});
