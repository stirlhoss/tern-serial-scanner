import { createClient } from "@libsql/client";

export interface User {
  id: string;
  email: string;
  name?: string;
  location?: 15 | 16;
}

interface updateUserPayload {
  email?: string;
  name?: string;
  location?: 15 | 16;
}

const config = {
  url:
    process.env.TURSO_DATABASE_URL ??
    process.env.LOCAL_DB ??
    "file:.data/sqlite.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
};

export const turso = createClient(config);

// Initialize database and create tables if needed
export async function initializeDB() {
  try {
    console.log("Initializing database...");
    await turso.execute({
      sql: "CREATE TABLE IF NOT EXISTS users (id INTEGER Primary Key AUTOINCREMENT, email TEXT NOT NULL, name TEXT DEFAULT Null, location INTEGER DEFAULT NUll)",
    });
    console.log("Database initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }
}

// Ensure DB is initialized before any operations
let dbInitialized = false;

// Helper to ensure DB is ready before operations
async function ensureDBInitialized() {
  if (!dbInitialized) {
    dbInitialized = await initializeDB();
    if (!dbInitialized) {
      throw new Error("Database initialization failed");
    }
  }
  return dbInitialized;
}

export async function createUser(email: string) {
  try {
    await ensureDBInitialized();

    await turso.execute({
      sql: "INSERT INTO users (email) VALUES (?)",
      args: [email],
    });

    const user = await findUserByEmail(email);
    if (!user) {
      throw new Error("Failed to create user: User not found after creation");
    }

    return user;
  } catch (error) {
    console.error(`Error creating user with email ${email}:`, error);
    throw new Error(
      `Failed to create user: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function findUserByEmail(email: string) {
  try {
    await ensureDBInitialized();

    const rs = await turso.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });

    if (rs.rows.length === 0) {
      return null;
    }

    const userRow = rs.rows[0];

    const user: User = {
      id: userRow.id as string,
      email: userRow.email as string,
      name: userRow.name as string,
      location: userRow.location as 15 | 16 | undefined,
    };

    return user;
  } catch (error) {
    console.error(`Error finding user by email ${email}:`, error);
    throw new Error(
      `Error finding user: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function findUserById(userId: string) {
  try {
    await ensureDBInitialized();

    const rs = await turso.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [userId],
    });

    if (rs.rows.length === 0) {
      return null;
    }

    const userRow = rs.rows[0];

    const user: User = {
      id: userRow.id as string,
      email: userRow.email as string,
      name: userRow.name as string,
      location: userRow.location as 15 | 16 | undefined,
    };

    return user;
  } catch (error) {
    console.error(`Error finding user by ID ${userId}:`, error);
    throw new Error(
      `Error finding user: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function updateUser(userId: string, updates: updateUserPayload) {
  const setClauses: string[] = [];
  const args: (string | null)[] = [];

  if (updates.email !== undefined) {
    setClauses.push("email = ?");
    args.push(updates.email);
  }
  if (updates.name !== undefined) {
    setClauses.push("name = ?");
    args.push(updates.name);
  }
  if (updates.location !== undefined) {
    setClauses.push("name = ?");
    args.push(updates.location.toString());
  }

  if (setClauses.length === 0) {
    console.warn("No fields provided for user update.");
    return findUserById(userId);
  }

  args.push(userId);

  const sql = `
    UPDATE users
    SET ${setClauses.join(", ")}
    WHERE id = ?;
  `;

  try {
    await ensureDBInitialized();

    const rs = await turso.execute({
      sql: sql,
      args: args,
    });

    // If 0, the user with that ID probably didn't exist.
    if (rs.rowsAffected === 0) {
      console.log(`User with ID ${userId} not found for update.`);
      return null;
    }

    console.log(`User with ID ${userId} updated successfully.`);

    // After updating, it's common to fetch the fresh data to return the complete,
    // up-to-date user object.
    const updatedUser = await findUserById(userId);
    return updatedUser;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error; // Re-throw or handle as appropriate
  }
}
