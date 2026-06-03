import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

type DBState = {
  users: UserRow[];
  workOrders: WorkOrderRow[];
};

export type UserRow = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  birthdate: string;
  municipality: string;
  postalCode: string;
  street: string;
  houseNumber: string;
  box: string;
};

export type WorkOrderRow = {
  id: number;
  city: string;
  device: string;
  problemCode: string;
  customerName: string;
  processed: number;
  detailedProblemDescription: string;
  repairInformation: string;
};

export type UserInput = Omit<UserRow, "id">;
export type WorkOrderInput = Omit<
  WorkOrderRow,
  "id" | "processed" | "repairInformation"
> & {
  repairInformation?: string;
  processed?: boolean;
};

const databaseName = "electroman.db";
const storageKey = "electroman-web-db";

const defaultUser: UserInput = {
  firstName: "Test",
  lastName: "Worker",
  username: "test",
  password: "test",
  birthdate: "1990-01-01",
  municipality: "Ghent",
  postalCode: "9000",
  street: "Main Street",
  houseNumber: "12",
  box: "A",
};

const defaultWorkOrders: WorkOrderInput[] = [
  {
    city: "Brussels",
    device: "Microwave",
    problemCode: "12",
    customerName: "Smith",
    detailedProblemDescription:
      "Microwave shuts off after 30 seconds and smells like burned plastic.",
  },
  {
    city: "Leuven",
    device: "Washing machine",
    problemCode: "18",
    customerName: "De Smet",
    detailedProblemDescription:
      "Machine does not start and shows an intermittent error code on the panel.",
  },
  {
    city: "Antwerp",
    device: "Laptop",
    problemCode: "07",
    customerName: "Van Dijck",
    detailedProblemDescription:
      "Laptop overheats and reboots when the charger is connected.",
  },
  {
    city: "Ghent",
    device: "Television",
    problemCode: "23",
    customerName: "Peeters",
    detailedProblemDescription:
      "Screen flickers and loses sound after a few minutes of use.",
  },
  {
    city: "Mechelen",
    device: "Coffee machine",
    problemCode: "05",
    customerName: "Jacobs",
    detailedProblemDescription:
      "Device leaks water and no longer heats the water properly.",
  },
];

let sqliteDatabasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function createSeedState(): DBState {
  return {
    users: [{ ...defaultUser, id: 1 }],
    workOrders: defaultWorkOrders.map((workOrder, index) => ({
      ...workOrder,
      id: index + 1,
      processed: 0,
      repairInformation: "",
    })),
  };
}

function readWebState(): DBState {
  if (typeof window === "undefined") {
    return createSeedState();
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) {
    return createSeedState();
  }

  try {
    return JSON.parse(rawValue) as DBState;
  } catch {
    return createSeedState();
  }
}

function writeWebState(state: DBState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

async function getDatabase() {
  if (Platform.OS === "web") {
    return null;
  }

  if (!sqliteDatabasePromise) {
    sqliteDatabasePromise = SQLite.openDatabaseAsync(databaseName).catch(
      (error) => {
        sqliteDatabasePromise = null;
        throw error;
      },
    );
  }

  return sqliteDatabasePromise;
}

async function createDatabaseSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      birthdate TEXT NOT NULL,
      municipality TEXT NOT NULL,
      postalCode TEXT NOT NULL,
      street TEXT NOT NULL,
      houseNumber TEXT NOT NULL,
      box TEXT NOT NULL DEFAULT ''
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workOrders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city TEXT NOT NULL,
      device TEXT NOT NULL,
      problemCode TEXT NOT NULL,
      customerName TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      detailedProblemDescription TEXT NOT NULL,
      repairInformation TEXT NOT NULL DEFAULT ''
    );
  `);
}

async function seedNativeDatabase(
  db: Awaited<ReturnType<typeof import("expo-sqlite").openDatabaseAsync>>,
) {
  await db.runAsync(
    `INSERT INTO users (firstName, lastName, username, password, birthdate, municipality, postalCode, street, houseNumber, box)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      defaultUser.firstName,
      defaultUser.lastName,
      defaultUser.username,
      defaultUser.password,
      defaultUser.birthdate,
      defaultUser.municipality,
      defaultUser.postalCode,
      defaultUser.street,
      defaultUser.houseNumber,
      defaultUser.box,
    ],
  );

  for (const [index, workOrder] of defaultWorkOrders.entries()) {
    await db.runAsync(
      `INSERT INTO workOrders (id, city, device, problemCode, customerName, processed, detailedProblemDescription, repairInformation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        index + 1,
        workOrder.city,
        workOrder.device,
        workOrder.problemCode,
        workOrder.customerName,
        0,
        workOrder.detailedProblemDescription,
        workOrder.repairInformation ?? "",
      ],
    );
  }
}

export async function initDB() {
  if (Platform.OS === "web") {
    writeWebState(createSeedState());
    return;
  }

  const db = await getDatabase();
  if (!db) {
    return;
  }

  try {
    await db.execAsync(`DROP TABLE IF EXISTS workOrders;`);
    await db.execAsync(`DROP TABLE IF EXISTS users;`);
    await createDatabaseSchema(db);
    await seedNativeDatabase(db);
  } catch (error) {
    console.warn("Failed to initialize database:", error);
    sqliteDatabasePromise = null;
    throw error;
  }
}

export async function authenticateUser(
  username: string,
  password: string,
): Promise<UserRow | null> {
  if (Platform.OS === "web") {
    const user = readWebState().users.find(
      (candidate) => candidate.username === username.trim(),
    );
    return user && user.password === password ? user : null;
  }

  const db = await getDatabase();
  if (!db) {
    return null;
  }

  const user = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [username.trim()],
  );

  if (!user || user.password !== password) {
    return null;
  }

  return user;
}

export async function createLocalUser(input: UserInput) {
  if (Platform.OS === "web") {
    const state = readWebState();
    if (
      state.users.some(
        (candidate) => candidate.username === input.username.trim(),
      )
    ) {
      throw new Error("A user with that username already exists.");
    }

    const nextId = Math.max(0, ...state.users.map((user) => user.id)) + 1;
    state.users.push({ ...input, id: nextId });
    writeWebState(state);
    return getUserByUsername(input.username);
  }

  const db = await getDatabase();
  if (!db) {
    throw new Error("Database unavailable.");
  }

  const existing = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [input.username.trim()],
  );

  if (existing) {
    throw new Error("A user with that username already exists.");
  }

  await db.runAsync(
    `INSERT INTO users (firstName, lastName, username, password, birthdate, municipality, postalCode, street, houseNumber, box)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.firstName.trim(),
      input.lastName.trim(),
      input.username.trim(),
      input.password,
      input.birthdate.trim(),
      input.municipality.trim(),
      input.postalCode.trim(),
      input.street.trim(),
      input.houseNumber.trim(),
      input.box.trim(),
    ],
  );

  return getUserByUsername(input.username);
}

export async function getUserById(userId: number) {
  if (Platform.OS === "web") {
    return readWebState().users.find((user) => user.id === userId) ?? null;
  }

  const db = await getDatabase();
  if (!db) {
    return null;
  }

  return db.getFirstAsync<UserRow>("SELECT * FROM users WHERE id = ? LIMIT 1", [
    userId,
  ]);
}

export async function getUserByUsername(username: string) {
  if (Platform.OS === "web") {
    return (
      readWebState().users.find((user) => user.username === username.trim()) ??
      null
    );
  }

  const db = await getDatabase();
  if (!db) {
    return null;
  }

  return db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [username.trim()],
  );
}

export async function listWorkOrders() {
  if (Platform.OS === "web") {
    return readWebState().workOrders;
  }

  const db = await getDatabase();
  if (!db) {
    return [];
  }

  return db.getAllAsync<WorkOrderRow>(
    "SELECT * FROM workOrders ORDER BY id ASC",
  );
}

export async function getWorkOrderById(workOrderId: number) {
  if (Platform.OS === "web") {
    return (
      readWebState().workOrders.find(
        (workOrder) => workOrder.id === workOrderId,
      ) ?? null
    );
  }

  const db = await getDatabase();
  if (!db) {
    return null;
  }

  return db.getFirstAsync<WorkOrderRow>(
    "SELECT * FROM workOrders WHERE id = ? LIMIT 1",
    [workOrderId],
  );
}

export async function createWorkOrder(input: WorkOrderInput) {
  if (Platform.OS === "web") {
    const state = readWebState();
    const nextId =
      Math.max(0, ...state.workOrders.map((workOrder) => workOrder.id)) + 1;
    state.workOrders.push({
      id: nextId,
      city: input.city.trim(),
      device: input.device.trim(),
      problemCode: input.problemCode.trim(),
      customerName: input.customerName.trim(),
      processed: input.processed ? 1 : 0,
      detailedProblemDescription: input.detailedProblemDescription.trim(),
      repairInformation: input.repairInformation?.trim() ?? "",
    });
    writeWebState(state);
    return nextId;
  }

  const db = await getDatabase();
  if (!db) {
    throw new Error("Database unavailable.");
  }

  const result = await db.runAsync(
    `INSERT INTO workOrders (city, device, problemCode, customerName, processed, detailedProblemDescription, repairInformation)
      VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      input.city.trim(),
      input.device.trim(),
      input.problemCode.trim(),
      input.customerName.trim(),
      input.processed ? 1 : 0,
      input.detailedProblemDescription.trim(),
      input.repairInformation?.trim() ?? "",
    ],
  );

  return result.lastInsertRowId;
}

export async function saveRepairInformation(
  workOrderId: number,
  repairInformation: string,
) {
  if (Platform.OS === "web") {
    const state = readWebState();
    const workOrder = state.workOrders.find((item) => item.id === workOrderId);
    if (!workOrder) {
      throw new Error("Work order not found.");
    }

    workOrder.processed = 1;
    workOrder.repairInformation = repairInformation.trim();
    writeWebState(state);
    return;
  }

  const db = await getDatabase();
  if (!db) {
    throw new Error("Database unavailable.");
  }

  await db.runAsync(
    "UPDATE workOrders SET processed = 1, repairInformation = ? WHERE id = ?;",
    [repairInformation.trim(), workOrderId],
  );
}

export async function reopenWorkOrder(workOrderId: number) {
  if (Platform.OS === "web") {
    const state = readWebState();
    const workOrder = state.workOrders.find((item) => item.id === workOrderId);
    if (!workOrder) {
      throw new Error("Work order not found.");
    }

    workOrder.processed = 0;
    writeWebState(state);
    return;
  }

  const db = await getDatabase();
  if (!db) {
    throw new Error("Database unavailable.");
  }

  await db.runAsync("UPDATE workOrders SET processed = 0 WHERE id = ?;", [
    workOrderId,
  ]);
}
