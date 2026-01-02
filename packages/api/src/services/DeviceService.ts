import { createDeviceRepository } from '@pocket/db';
import type { DeviceRepository, Device, NewDevice, UpdateDevice } from '@pocket/db';
import { generateDeviceToken, hashDeviceToken } from '@pocket/core';
import { randomBytes } from 'crypto';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Service for managing MQTT devices with auto-generated tokens.
 * 
 * Handles business logic for:
 * - Creating devices with unique tokens (stored as hashed values)
 * - Regenerating device tokens
 * - Managing device metadata (name, labels, notes)
 * 
 * Security: Device tokens are hashed using scrypt before storage.
 * The plaintext token is only returned once during device creation.
 */
export class DeviceService {
  private repository: DeviceRepository;

  constructor(repository?: DeviceRepository) {
    this.repository = repository ?? createDeviceRepository();
  }

  /**
   * Attach a logger after construction (useful when services are created
   * before the Fastify instance is available).
   * 
   * Note: Logger is no longer used since token collision checking has been removed.
   */
  setLogger(_logger?: FastifyBaseLogger): void {
    // Logger no longer needed - method kept for backward compatibility
  }

  /**
   * Create a new device with auto-generated token.
   * 
   * Security: The plaintext token is returned in the response but
   * only a hashed version is stored in the database.
   * 
   * @param data Device data (tenantId and name required, labels and notes optional)
   * @returns Promise with created device including plaintext token (only available once)
   */
  async createDevice(data: {
    tenantId: number;
    name: string;
    labels?: string[];
    notes?: string;
  }): Promise<Device & { token: string }> {
    // Generate unique device ID using crypto for security
    const randomSuffix = randomBytes(4).toString('hex');
    const deviceId = `device-${Date.now()}-${randomSuffix}`;
    const plaintextToken = generateDeviceToken();
    const tokenHash = await hashDeviceToken(plaintextToken);

    // Serialize labels to JSON if provided
    const labelsJson = data.labels ? JSON.stringify(data.labels) : null;

    const newDevice: NewDevice = {
      tenantId: data.tenantId,
      deviceId,
      tokenHash,
      name: data.name,
      labels: labelsJson,
      notes: data.notes ?? null,
    };

    const created = await this.repository.create(newDevice);
    
    // Return device with plaintext token (only available once)
    return {
      ...created,
      token: plaintextToken,
    };
  }

  /**
   * Get a device by its ID.
   * 
   * @param id Device ID
   * @returns Promise with device or undefined if not found
   */
  async getDevice(id: number): Promise<Device | undefined> {
    return await this.repository.findById(id);
  }

  /**
   * Get a device by its deviceId.
   * 
   * @param deviceId Unique device identifier
   * @returns Promise with device or undefined if not found
   */
  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    return await this.repository.findByDeviceId(deviceId);
  }

  /**
   * List all devices with optional pagination.
   * 
   * @param options Pagination options
   * @returns Promise with array of devices
   */
  async listDevices(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Device[]> {
    return await this.repository.findMany(options);
  }

  /**
   * Count total devices.
   * 
   * @returns Promise with total count
   */
  async countDevices(): Promise<number> {
    return await this.repository.count();
  }

  /**
   * Regenerate a device token.
   * Invalidates the old token and generates a new one.
   * 
   * Security: Returns the plaintext token (only available once).
   * Only a hashed version is stored in the database.
   * 
   * @param id Device ID
   * @returns Promise with updated device and new plaintext token, or undefined if not found
   */
  async regenerateToken(id: number): Promise<(Device & { token: string }) | undefined> {
    const plaintextToken = generateDeviceToken();
    const tokenHash = await hashDeviceToken(plaintextToken);
    
    const updated = await this.repository.update(id, { tokenHash });
    
    if (!updated) {
      return undefined;
    }
    
    // Return device with plaintext token (only available once)
    return {
      ...updated,
      token: plaintextToken,
    };
  }

  /**
   * Update device metadata (name, labels, notes).
   * 
   * @param id Device ID
   * @param data Update data
   * @returns Promise with updated device or undefined if not found
   */
  async updateDevice(id: number, data: {
    name?: string;
    labels?: string[];
    notes?: string;
  }): Promise<Device | undefined> {
    const updateData: UpdateDevice = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.labels !== undefined) {
      updateData.labels = JSON.stringify(data.labels);
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    return await this.repository.update(id, updateData);
  }

  /**
   * Delete a device.
   * 
   * @param id Device ID
   * @returns Promise that resolves when delete is complete
   */
  async deleteDevice(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Get the underlying repository (for testing or direct access).
   * 
   * @returns DeviceRepository instance
   */
  getRepository(): DeviceRepository {
    return this.repository;
  }
}
