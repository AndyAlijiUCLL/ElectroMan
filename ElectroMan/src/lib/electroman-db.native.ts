import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

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

let databasePromise: Promise<SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(databaseName);
  }

  return databasePromise;
}

async function ensureSchema(db: SQLiteDatabase) {
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

async function seedDatabase(db: SQLiteDatabase) {
  const existingUser = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [defaultUser.username],
  );

  if (!existingUser) {
    await db.runAsync(
      `INSERT INTO users (
        firstName, lastName, username, password, birthdate, municipality, postalCode, street, houseNumber, box
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  }

  for (const [index, workOrder] of defaultWorkOrders.entries()) {
    const id = index + 1;
    const existingWorkOrder = await db.getFirstAsync<WorkOrderRow>(
      "SELECT * FROM workOrders WHERE id = ? LIMIT 1",
      [id],
    );

    if (!existingWorkOrder) {
      await db.runAsync(
        `INSERT INTO workOrders (
          id, city, device, problemCode, customerName, processed, detailedProblemDescription, repairInformation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
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
}

function mapUser(row: UserRow): UserRow {
  return row;
}

function mapWorkOrder(row: WorkOrderRow): WorkOrderRow {
  return row;
}

export async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await getDatabase();
      await ensureSchema(db);
      await seedDatabase(db);
    })();
  }

  return initializationPromise;
}

export async function authenticateUser(username: string, password: string) {
  await initializeDatabase();

  const db = await getDatabase();
  const user = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [username.trim()],
  );

  if (!user || user.password !== password) {
    return null;
  }

  return mapUser(user);
}

export async function createLocalUser(input: UserInput) {
  await initializeDatabase();

  const db = await getDatabase();
  const existing = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [input.username.trim()],
  );

  if (existing) {
    throw new Error("A user with that username already exists.");
  }

  await db.runAsync(
    `INSERT INTO users (
      firstName, lastName, username, password, birthdate, municipality, postalCode, street, houseNumber, box
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  await initializeDatabase();

  const db = await getDatabase();
  const user = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  return user ? mapUser(user) : null;
}

export async function getUserByUsername(username: string) {
  await initializeDatabase();

  const db = await getDatabase();
  const user = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [username.trim()],
  );

  return user ? mapUser(user) : null;
}

export async function listWorkOrders() {
  await initializeDatabase();

  const db = await getDatabase();
  const workOrders = await db.getAllAsync<WorkOrderRow>(
    "SELECT * FROM workOrders ORDER BY id ASC",
  );

  return workOrders.map(mapWorkOrder);
}

export async function getWorkOrderById(workOrderId: number) {
  await initializeDatabase();

  const db = await getDatabase();
  const workOrder = await db.getFirstAsync<WorkOrderRow>(
    "SELECT * FROM workOrders WHERE id = ? LIMIT 1",
    [workOrderId],
  );

  return workOrder ? mapWorkOrder(workOrder) : null;
}

export async function createWorkOrder(input: WorkOrderInput) {
  await initializeDatabase();

  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO workOrders (
      city, device, problemCode, customerName, processed, detailedProblemDescription, repairInformation
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
  await initializeDatabase();

  const db = await getDatabase();
  await db.runAsync(
    "UPDATE workOrders SET processed = 1, repairInformation = ? WHERE id = ?",
    [repairInformation.trim(), workOrderId],
  );
}
