import { initializeDB } from './db';

// Initialize the database on server startup
export async function initDatabaseOnStartup() {
  try {
    console.log('Starting database initialization at app startup...');
    const success = await initializeDB();
    if (success) {
      console.log('Database successfully initialized on app startup');
      return true;
    } else {
      console.error('Database initialization failed on app startup');
      return false;
    }
  } catch (error) {
    console.error('Error during database initialization at app startup:', error);
    return false;
  }
}

// Run database initialization when this module is imported
let initPromise: Promise<boolean> | null = null;

export function ensureDatabaseInitialized() {
  if (!initPromise) {
    initPromise = initDatabaseOnStartup();
  }
  return initPromise;
}

// Export this function so it can be awaited at key entry points
export async function waitForDatabaseInitialization() {
  return await ensureDatabaseInitialized();
}
