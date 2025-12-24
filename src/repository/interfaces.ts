/**
 * Repository Pattern interfaces for database abstraction.
 * As per ARCHITECTURE.md, this abstracts Prisma calls to support multiple databases.
 */

export interface TelemetryData {
  topic: string;
  payload: string;
  timestamp: Date;
}

export interface TelemetryRecord extends TelemetryData {
  id: number;
}

export interface DeviceTokenData {
  deviceId: string;
  token: string;
  expiresAt?: Date | null;
}

export interface DeviceTokenRecord extends DeviceTokenData {
  id: number;
  createdAt: Date;
}

export interface TelemetryQueryOptions {
  topic?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Repository interface for telemetry data operations.
 */
export interface ITelemetryRepository {
  /**
   * Create multiple telemetry records in a batch.
   */
  createMany(data: TelemetryData[]): Promise<void>;

  /**
   * Find telemetry records with optional filtering and pagination.
   */
  findMany(options: TelemetryQueryOptions): Promise<TelemetryRecord[]>;

  /**
   * Count telemetry records matching the query.
   */
  count(options: Pick<TelemetryQueryOptions, 'topic'>): Promise<number>;

  /**
   * Delete all telemetry records (for testing).
   */
  deleteAll(): Promise<void>;
}

/**
 * Repository interface for device token operations.
 */
export interface IDeviceTokenRepository {
  /**
   * Find a device token by token string.
   */
  findByToken(token: string): Promise<DeviceTokenRecord | null>;

  /**
   * Create a new device token.
   */
  create(data: DeviceTokenData): Promise<DeviceTokenRecord>;

  /**
   * Delete all device tokens (for testing).
   */
  deleteAll(): Promise<void>;
}

/**
 * Main repository interface combining all repository types.
 */
export interface IRepository {
  telemetry: ITelemetryRepository;
  deviceToken: IDeviceTokenRepository;
  disconnect(): Promise<void>;
}
