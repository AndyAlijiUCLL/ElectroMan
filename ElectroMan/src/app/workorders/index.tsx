import { useEffect, useMemo, useState } from "react";

import { router, useLocalSearchParams } from "expo-router";
import {
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    getUserById,
    listWorkOrders,
    type UserRow,
    type WorkOrderRow,
} from "../../../database/db";

export default function WorkOrdersScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = Number(params.userId);
  const [user, setUser] = useState<UserRow | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      const [userResult, workOrderResult] = await Promise.all([
        Number.isFinite(userId) ? getUserById(userId) : Promise.resolve(null),
        listWorkOrders(),
      ]);

      if (!active) {
        return;
      }

      setUser(userResult);
      setWorkOrders(workOrderResult);
      setLoading(false);
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [userId]);

  const processedCount = useMemo(
    () => workOrders.filter((workOrder) => workOrder.processed === 1).length,
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tableWrapper}
      >
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <HeaderCell text="City" width={80} />
            <HeaderCell text="Device" width={90} />
            <HeaderCell text="Problem" width={60} />
            <HeaderCell text="Name" width={80} />
            <HeaderCell text="Processed" width={60} />
          </View>

          <FlatList
            data={workOrders}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <Pressable
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                ]}
                onPress={() =>
                  router.push(`/workorders/${item.id}?userId=${String(userId)}`)
                }
              >
                <Cell text={item.city} width={80} />
                <Cell text={item.device} width={90} />
                <Cell text={item.problemCode} width={60} />
                <Cell text={item.customerName} width={80} />
                <View style={[styles.processedCell, { width: 60 }]}>
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
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No work orders found.</Text>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderCell({ text, width }: { text: string; width: number }) {
  return (
    <View style={[styles.headerCell, { width }]}>
      <Text style={styles.headerText}>{text}</Text>
    </View>
  );
}

function Cell({ text, width }: { text: string; width: number }) {
  return (
    <View style={[styles.cell, { width }]}>
      <Text style={styles.cellText} numberOfLines={1}>
        {text}
      </Text>
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
  toolbarTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  toolbarActions: {
    flexDirection: "row",
    gap: 16,
  },
  toolbarActionText: {
    color: "#0f766e",
    fontWeight: "700",
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
  tableWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
  },
  headerCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  headerText: {
    fontWeight: "700",
    color: "#334155",
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
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    justifyContent: "center",
  },
  cellText: {
    color: "#111827",
  },
  processedCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
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
