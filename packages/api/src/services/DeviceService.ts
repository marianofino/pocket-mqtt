import { createDeviceRepository } from '@pocket/db';
import type { DeviceRepository, Device, NewDevice, UpdateDevice } from '@pocket/db';
import { generateDeviceToken } from '@pocket/core';
import { randomBytes } from 'crypto';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Service for managing MQTT devices with auto-generated tokens.
 * 
 * Handles business logic for:
 * - Creating devices with unique tokens
 * - Regenerating device tokens
 * - Managing device metadata (name, labels, notes)
 */
export class DeviceService {
  private repository: DeviceRepository;
  private logger?: FastifyBaseLogger;

  constructor(repository?: DeviceRepository, logger?: FastifyBaseLogger) {
    this.repository = repository ?? createDeviceRepository();
    this.logger = logger;
  }

  /**
   * Attach a logger after construction (useful when services are created
   * before the Fastify instance is available).
   */
  setLogger(logger?: FastifyBaseLogger): void {
    this.logger = logger;
  }

  /**
   * Create a new device with auto-generated token.
   * 
   * @param data Device data (tenantId and name required, labels and notes optional)
   * @returns Promise with created device including generated token
   */
  async createDevice(data: {
    tenantId: number;
    name: string;
    labels?: string[];
    notes?: string;
  }): Promise<Device> {
    // Generate unique device ID using crypto for security
    const randomSuffix = randomBytes(4).toString('hex');
    const deviceId = `device-${Date.now()}-${randomSuffix}`;
    const token = await this.generateUniqueToken();

    // Serialize labels to JSON if provided
    const labelsJson = data.labels ? JSON.stringify(data.labels) : null;

    const newDevice: NewDevice = {
      tenantId: data.tenantId,
      deviceId,
      token,
      name: data.name,
      labels: labelsJson,
      notes: data.notes ?? null,
    };

    return await this.repository.create(newDevice);
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
   * @param id Device ID
   * @returns Promise with updated device or undefined if not found
   */
  async regenerateToken(id: number): Promise<Device | undefined> {
    const newToken = await this.generateUniqueToken();
    return await this.repository.update(id, { token: newToken });
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
   * Generate a unique token by checking for collisions.
   * In the extremely unlikely event of a collision, generates a new token.
   * 
   * @returns Promise with unique token
   */
  private async generateUniqueToken(): Promise<string> {
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      const token = generateDeviceToken();
      const existing = await this.repository.findByToken(token);
      
      if (!existing) {
        return token;
      }
      
      // Collision detected, try again
      const message = `Token collision detected (attempt ${i + 1}/${maxAttempts}), generating new token`;
      if (this.logger) {
        this.logger.warn(message);
      } else {
        console.error(message);
      }
    }
    
    throw new Error('Failed to generate unique token after maximum attempts');
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
