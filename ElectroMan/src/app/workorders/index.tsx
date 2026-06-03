import { useEffect, useMemo, useState } from "react";

import { router, useLocalSearchParams } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import {
  getUserById,
  getWorkorders,
  type User,
  type Workorder,
} from "../../../database/db";

// flex shares horizontal space; processed keeps a fixed width for the checkbox column.
const columns = {
  city: { flex: 1.15, minWidth: 56 },
  device: { flex: 1, minWidth: 52 },
  problem: { flex: 0.65, minWidth: 44 },
  name: { flex: 1.35, minWidth: 64 },
  processed: { width: 72 },
} as const;

export default function WorkOrdersScreen() {
  // userId is passed from login: /workorders?userId=1
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = Number(params.userId);
  const [user, setUser] = useState<User | null>(null);
  const [workOrders, setWorkOrders] = useState<Workorder[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data when the screen opens; "active" avoids setState after unmount.
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      const [userResult, workOrderResult] = await Promise.all([
        Number.isFinite(userId) ? getUserById(userId) : Promise.resolve(null),
        getWorkorders(),
      ]);

      if (!active) {
        return;
      }

      setUser(userResult ?? null);
      setWorkOrders(workOrderResult);
      setLoading(false);
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [userId]);

  // useMemo recalculates only when workOrders changes (performance + clarity).
  const processedCount = useMemo(
    () => workOrders.filter((workOrder) => workOrder.processed).length,
    [workOrders],
  );

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarActions}>
          <Pressable
            onPress={() =>
              router.push(`/workorders/new?userId=${String(userId)}`)
            }
          >
            <Text style={styles.toolbarActionText}>Add</Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/")}>
            <Text style={styles.toolbarActionText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeading}>
            Welcome {user ? `${user.firstName} ${user.lastName}` : "worker"}
          </Text>
          <Text style={styles.summaryText}>
            {loading
              ? "Loading work orders..."
              : `${workOrders.length} work orders available, ${processedCount} already processed.`}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <HeaderCell text="City" style={columns.city} />
            <HeaderCell text="Device" style={columns.device} />
            <HeaderCell text="Problem" style={columns.problem} />
            <HeaderCell text="Name" style={columns.name} />
            <HeaderCell text="Processed" style={columns.processed} />
          </View>

          {workOrders.length === 0 ? (
            <Text style={styles.emptyText}>No work orders found.</Text>
          ) : (
            workOrders.map((item, index) => (
              <Pressable
                key={String(item.id)}
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                ]}
                onPress={() =>
                  router.push(`/workorders/${item.id}?userId=${String(userId)}`)
                }
              >
                <Cell text={item.city ?? ""} style={columns.city} />
                <Cell text={item.device ?? ""} style={columns.device} />
                <Cell text={item.problemCode ?? ""} style={columns.problem} />
                <Cell text={item.customerName ?? ""} style={columns.name} />
                <View style={[styles.processedCell, columns.processed]}>
                  <View
                    style={[
                      styles.checkbox,
                      item.processed ? styles.checkboxChecked : null,
                    ]}
                  >
                    {item.processed ? (
                      <Text style={styles.checkboxMark}>✓</Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderCell({ text, style }: { text: string; style: ViewStyle }) {
  return (
    <View style={[styles.headerCell, style]}>
      <Text style={styles.headerText}>{text}</Text>
    </View>
  );
}

function Cell({ text, style }: { text: string; style: ViewStyle }) {
  return (
    <View style={[styles.cell, style]}>
      <Text style={styles.cellText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  toolbarActions: {
    flexDirection: "row",
    gap: 16,
  },
  toolbarActionText: {
    color: "#0f766e",
    fontWeight: "700",
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  summaryHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  summaryText: {
    marginTop: 6,
    color: "#475569",
  },
  table: {
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    alignSelf: "stretch",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
  },
  headerCell: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    justifyContent: "center",
  },
  headerText: {
    fontWeight: "700",
    color: "#334155",
    fontSize: 13,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  tableRowEven: {
    backgroundColor: "#ffffff",
  },
  tableRowOdd: {
    backgroundColor: "#f8fafc",
  },
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    justifyContent: "center",
  },
  cellText: {
    color: "#111827",
    fontSize: 14,
  },
  processedCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    flexShrink: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    borderColor: "#0f766e",
    backgroundColor: "#0f766e",
  },
  checkboxMark: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
    lineHeight: 16,
  },
  emptyText: {
    padding: 20,
    color: "#64748b",
  },
});
