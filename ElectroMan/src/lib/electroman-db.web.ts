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

const storageKey = "electroman-web-db";

type DatabaseState = {
  users: UserRow[];
  workOrders: WorkOrderRow[];
};

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

function createSeedState(): DatabaseState {
  return {
    users: [
      {
        ...defaultUser,
        id: 1,
      },
    ],
    workOrders: defaultWorkOrders.map((workOrder, index) => ({
      ...workOrder,
      id: index + 1,
      processed: 0,
      repairInformation: "",
    })),
  };
}

function readState(): DatabaseState {
  if (typeof window === "undefined") {
    return createSeedState();
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return createSeedState();
  }

  try {
    return JSON.parse(rawValue) as DatabaseState;
  } catch {
    return createSeedState();
  }
}

function writeState(state: DatabaseState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function ensureSeeded() {
  const state = readState();

  if (state.users.length === 0 || state.workOrders.length === 0) {
    writeState(createSeedState());
  }
}

export async function initializeDatabase() {
  ensureSeeded();
}

export async function authenticateUser(username: string, password: string) {
  ensureSeeded();
  const state = readState();
  const user = state.users.find(
    (candidate) => candidate.username === username.trim(),
  );

  if (!user || user.password !== password) {
    return null;
  }

  return user;
}

export async function createLocalUser(input: UserInput) {
  ensureSeeded();
  const state = readState();

  if (
    state.users.some(
      (candidate) => candidate.username === input.username.trim(),
    )
  ) {
    throw new Error("A user with that username already exists.");
  }

  const nextId = Math.max(0, ...state.users.map((user) => user.id)) + 1;
  state.users.push({
    ...input,
    id: nextId,
  });
  writeState(state);

  return getUserByUsername(input.username);
}

export async function getUserById(userId: number) {
  ensureSeeded();
  return readState().users.find((user) => user.id === userId) ?? null;
}

export async function getUserByUsername(username: string) {
  ensureSeeded();
  return (
    readState().users.find((user) => user.username === username.trim()) ?? null
  );
}

export async function listWorkOrders() {
  ensureSeeded();
  return readState().workOrders;
}

export async function getWorkOrderById(workOrderId: number) {
  ensureSeeded();
  return (
    readState().workOrders.find((workOrder) => workOrder.id === workOrderId) ??
    null
  );
}

export async function createWorkOrder(input: WorkOrderInput) {
  ensureSeeded();
  const state = readState();
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
  writeState(state);

  return nextId;
}

export async function saveRepairInformation(
  workOrderId: number,
  repairInformation: string,
) {
  ensureSeeded();
  const state = readState();
  const workOrder = state.workOrders.find((item) => item.id === workOrderId);

  if (!workOrder) {
    throw new Error("Work order not found.");
  }

  workOrder.processed = 1;
  workOrder.repairInformation = repairInformation.trim();
  writeState(state);
}
