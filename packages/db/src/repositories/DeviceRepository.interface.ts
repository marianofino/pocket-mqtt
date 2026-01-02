/**
 * Device record from database.
 * 
 * Security: The token field contains the hashed token, not the plaintext.
 * The plaintext token is only available during device creation.
 */
export interface Device {
  id: number;
  tenantId: number;
  deviceId: string;
  tokenHash: string;
  name: string;
  labels: string | null; // JSON string array
  notes: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

/**
 * New device to insert.
 * 
 * Security: tokenHash should contain the hashed token, not plaintext.
 */
export interface NewDevice {
  tenantId: number;
  deviceId: string;
  tokenHash: string;
  name: string;
  labels?: string | null; // JSON string array
  notes?: string | null;
  expiresAt?: Date | null;
}

/**
 * Device update data (for token regeneration and metadata updates).
 * 
 * Security: tokenHash should contain the hashed token, not plaintext.
 */
export interface UpdateDevice {
  tokenHash?: string;
  name?: string;
  labels?: string | null;
  notes?: string | null;
  expiresAt?: Date | null;
}

/**
 * Repository interface for device management.
 * 
 * This abstraction follows the Repository Pattern as per ARCHITECTURE.md:
 * - Makes DB/ORM calls abstract and adaptable for future storage engines
 * - Allows switching between SQLite and PostgreSQL
 * - Maintains consistent API regardless of underlying database
 */
export interface DeviceRepository {
  /**
   * Create a new device with hashed token.
   * @param device Device data to insert (with tokenHash)
   * @returns Promise with created device
   */
  create(device: NewDevice): Promise<Device>;

  /**
   * Find a device by its ID.
   * @param id Device ID
   * @returns Promise with device or undefined if not found
   */
  findById(id: number): Promise<Device | undefined>;

  /**
   * Find a device by its deviceId.
   * @param deviceId Unique device identifier
   * @returns Promise with device or undefined if not found
   */
  findByDeviceId(deviceId: string): Promise<Device | undefined>;

  /**
   * List all devices with optional pagination.
   * @param options Query options for pagination
   * @returns Promise with array of devices
   */
  findMany(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Device[]>;

  /**
   * Update a device (e.g., regenerate token, update metadata).
   * @param id Device ID
   * @param data Update data
   * @returns Promise with updated device or undefined if not found
   */
  update(id: number, data: UpdateDevice): Promise<Device | undefined>;

  /**
   * Delete a device.
   * @param id Device ID
   * @returns Promise that resolves when delete is complete
   */
  delete(id: number): Promise<void>;

  /**
   * Count total devices.
   * @returns Promise with total count
   */
  count(): Promise<number>;

  /**
   * Delete all devices (for testing).
   * @returns Promise that resolves when delete is complete
   */
  deleteAll(): Promise<void>;
}
