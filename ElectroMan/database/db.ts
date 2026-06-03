import * as SQLite from "expo-sqlite";

// TypeScript interfaces mirror the entity diagram (User + WorkOrder).
export interface User {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  username: string;
  password: string;
  birthdate?: string | null;
  municipality?: string | null;
  postalcode?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  box?: string | null;
}

export interface Workorder {
  id: number;
  city?: string | null;
  device?: string | null;
  problemCode?: string | null;
  customerName?: string | null;
  processed?: boolean | null;
  detailedProblemDescription?: string | null;
  repairInformation?: string | null;
}

let db: SQLite.SQLiteDatabase | undefined;

// SQLite may return BOOLEAN as true/false or as 0/1 — we normalize to boolean for the app.
type SqliteBool = boolean | number | null | undefined;

function toProcessed(value: SqliteBool): boolean {
  return value === true || value === 1;
}

// birthdate column is DATE in SQL; reads are converted to "YYYY-MM-DD" strings for the UI.
function toBirthdate(value: string | number | null | undefined): string | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return text;
}

function mapUser(row: User): User {
  return {
    ...row,
    birthdate: toBirthdate(row.birthdate as string | number | null | undefined),
  };
}

function mapWorkorder(row: Workorder): Workorder {
  return {
    ...row,
    processed: toProcessed(row.processed as SqliteBool),
  };
}

// Open the database once and reuse it for the whole app session.
function getDB() {
  if (!db) {
    try {
      db = SQLite.openDatabaseSync("electroman.db");
    } catch (e) {
      db = SQLite.openDatabaseSync(":memory:");
    }
  }
  return db;
}

// Called from _layout.tsx on startup: creates tables and inserts demo rows.
export function initDB() {
  const db = getDB();

  // Work orders are recreated on each start so seed/mock data stays predictable during development.
  db.execSync(`DROP TABLE IF EXISTS workorders;`);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT, lastName TEXT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      birthdate DATE, municipality TEXT,
      postalcode TEXT, street TEXT,
      houseNumber TEXT, box TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS workorders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city TEXT, device TEXT, problemCode TEXT,
      customerName TEXT, processed BOOLEAN DEFAULT 0,
      detailedProblemDescription TEXT, repairInformation TEXT
    );
  `);

  db.runSync(
    `INSERT OR IGNORE INTO users (firstName, lastName, username, password) VALUES (?, ?, ?, ?)`,
    ["Test", "User", "test", "test"],
  );

  // Mock INSERT: problemCode is short text (e.g. "12"); descriptions can be short or long (TEXT, no limit).
  db.execSync(`
    INSERT INTO workorders (city, device, problemCode, customerName, detailedProblemDescription)
    VALUES
      ('Gent',      'TV',      '12', 'Marie Peeters', 'Scherm toont geen beeld'),
      ('Brussel',   'Laptop',  '01', 'Luc Claes',     'Start niet op'),
      ('Antwerpen', 'GSM',     '02', 'Emma Wouters',  'Scherm gebarsten'),
      ('Leuven',    'Tablet',  '32', 'Jonas Hermans', 'Laadt niet op'),
      ('Gent',      'Printer', '11', 'Sara Declercq', 'Papierstoring');
  `);

  getDB().runSync(
    `DELETE FROM workorders WHERE
       city LIKE ? OR city LIKE ? OR
       device LIKE ? OR device LIKE ? OR
       customerName LIKE ? OR customerName LIKE ?`,
    ["{%", "%city=%", "{%", "%city=%", "{%", "%city=%"],
  );
}

export function getUserByUsername(username: string) {
  const row = getDB().getFirstSync("SELECT * FROM users WHERE username = ?", [
    username,
  ]) as User | undefined;
  return row ? mapUser(row) : undefined;
}

export function getUserById(id: number) {
  const row = getDB().getFirstSync("SELECT * FROM users WHERE id = ?", [id]) as
    | User
    | undefined;
  return row ? mapUser(row) : undefined;
}

// Login: compare username + password (demo app — no hashing).
export function authenticateUser(username: string, password: string) {
  const user = getUserByUsername(username);
  if (user && user.password === password) {
    return user;
  }
  return undefined;
}

export function createUser(
  firstName: string,
  lastName: string,
  username: string,
  password: string,
  birthdate?: string,
  municipality?: string,
  postalcode?: string,
  street?: string,
  houseNumber?: string,
  box?: string,
) {
  try {
    getDB().runSync(
      `INSERT INTO users (firstName, lastName, username, password, birthdate, municipality, postalcode, street, houseNumber, box)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName,
        lastName,
        username,
        password,
        birthdate ?? null,
        municipality ?? null,
        postalcode ?? null,
        street ?? null,
        houseNumber ?? null,
        box ?? null,
      ],
    );
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint failed: users.username")) {
      throw new Error(
        "Username already exists. Please choose a different username.",
      );
    }
    throw error;
  }
}

// List screen: all work orders, with processed as a real boolean.
export function getWorkorders() {
  const rows = getDB().getAllSync("SELECT * FROM workorders") as Workorder[];
  return rows.map((row: Workorder) => {
    const mapped = mapWorkorder(row);
    return {
      id: Number(mapped.id),
      city: String(mapped.city ?? ""),
      device: String(mapped.device ?? ""),
      problemCode: String(mapped.problemCode ?? ""),
      customerName: String(mapped.customerName ?? ""),
      processed: mapped.processed ?? false,
    };
  });
}
export function getWorkorderById(id: number) {
  const row = getDB().getFirstSync("SELECT * FROM workorders WHERE id = ?", [
    id,
  ]) as Workorder | undefined;
  return row ? mapWorkorder(row) : undefined;
}

export function addWorkorder(
  city: string,
  device: string,
  problemCode: string,
  customerName: string,
  detailedProblemDescription?: string,
) {
  const existing = getDB().getFirstSync(
    "SELECT id FROM workorders WHERE city = ? AND device = ? AND customerName = ?",
    [city, device, customerName],
  );
  if (existing) throw new Error("Werkorder bestaat al");

  getDB().runSync(
    `INSERT INTO workorders (city, device, problemCode, customerName, processed, detailedProblemDescription)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      city,
      device,
      problemCode,
      customerName,
      false,
      detailedProblemDescription ?? "",
    ],
  );
}

// Saving repair info marks the work order as processed (BOOLEAN true in the database).
export function saveRepairInfo(id: number, repairInformation: string) {
  getDB().runSync(
    "UPDATE workorders SET repairInformation = ?, processed = ? WHERE id = ?",
    [repairInformation, true, id],
  );
}

// Re-open: processed = false and clear repair text so the technician can edit again.
export function reopenWorkorder(id: number) {
  getDB().runSync(
    "UPDATE workorders SET processed = ?, repairInformation = NULL WHERE id = ?",
    [false, id],
  );
}
