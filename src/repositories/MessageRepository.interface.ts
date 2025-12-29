/**
 * Telemetry message record from database.
 */
export interface Telemetry {
  id: number;
  topic: string;
  payload: string;
  timestamp: Date;
}

/**
 * New telemetry message to insert.
 */
export interface NewTelemetry {
  topic: string;
  payload: string;
  timestamp: Date;
}

/**
 * Repository interface for telemetry message storage.
 * 
 * This abstraction follows the Repository Pattern as per ARCHITECTURE.md:
 * - Makes DB/ORM calls abstract and adaptable for future storage engines
 * - Allows switching between SQLite and PostgreSQL
 * - Maintains consistent API regardless of underlying database
 */
export interface MessageRepository {
  /**
   * Insert multiple telemetry messages in a single batch operation.
   * @param messages Array of telemetry messages to insert
   * @returns Promise that resolves when insert is complete
   */
  insertBatch(messages: NewTelemetry[]): Promise<void>;

  /**
   * Find telemetry messages with optional filtering and pagination.
   * @param options Query options for filtering and pagination
   * @returns Promise with array of telemetry messages
   */
  findMany(options: {
    topic?: string;
    limit?: number;
    offset?: number;
  }): Promise<Telemetry[]>;

  /**
   * Count total telemetry messages with optional topic filter.
   * @param topic Optional topic to filter by
   * @returns Promise with total count
   */
  count(topic?: string): Promise<number>;

  /**
   * Delete all telemetry messages (for testing).
   * @returns Promise that resolves when delete is complete
   */
  deleteAll(): Promise<void>;
}
