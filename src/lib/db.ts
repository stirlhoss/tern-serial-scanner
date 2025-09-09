import { createClient } from "@libsql/client";

interface User {
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
  url: process.env.TURSO_DATABASE_URL ?? process.env.LOCAL_DB!,
  syncUrl: process.env.DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60,
};

export const turso = createClient(config);

export const createDB = (function () {
  turso.execute({
    sql: "CREATE TABLE IF NOT EXISTS users (id INTEGER Primary Key AUTOINCREMENT, email TEXT NOT NULL, name TEXT DEFAULT Null, location INTEGER DEFAULT NUll)",
  });
})();

export async function createUser(email: string) {
  await turso.execute({
    sql: "INSERT INTO users (email) VALUES (?)",
    args: [email],
  });
  const user = await findUserByEmail(email);

  return user!;
}

export async function findUserByEmail(email: string) {
  try {
    const rs = await turso.execute({
      sql: "SELECT * FROM users WHERE email is $email",
      args: { email: email },
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
    throw new Error(`Error finding user: ${error}`);
  }
}

export async function findUserById(userId: string) {
  try {
    const rs = await turso.execute({
      sql: "SELECT * FROM users WHERE id is $id",
      args: { id: userId },
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
    throw new Error(`Error finding user: ${error}`);
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
