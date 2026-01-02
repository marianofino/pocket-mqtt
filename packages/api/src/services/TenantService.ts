import { createTenantRepository } from '@pocket-mqtt/db';
import type { TenantRepository, Tenant, NewTenant } from '@pocket-mqtt/db';
import { validateTenantToken, generateTenantApiKey, validateTenantNameFormat } from '@pocket-mqtt/core';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Service for managing tenants in a multi-tenant environment.
 * 
 * Handles business logic for:
 * - Creating tenants with token validation
 * - Generating unique API keys for tenants
 * - Validating tenant names and tokens
 */
export class TenantService {
  private repository: TenantRepository;
  private logger?: FastifyBaseLogger;

  constructor(repository?: TenantRepository, logger?: FastifyBaseLogger) {
    this.repository = repository ?? createTenantRepository();
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
   * Create a new tenant with token validation.
   * 
   * @param data Tenant data (name and token for validation)
   * @returns Promise with created tenant including generated API key
   * @throws Error if name format is invalid, token validation fails, or tenant name already exists
   */
  async createTenant(data: {
    name: string;
    token: string;
  }): Promise<Tenant> {
    // Validate name format (lowercase and hyphen only)
    if (!validateTenantNameFormat(data.name)) {
      throw new Error('Tenant name must contain only lowercase letters, numbers, and hyphens, and must not start/end with hyphen or have consecutive hyphens');
    }

    // Validate token (must match hash of name + pepper)
    if (!validateTenantToken(data.name, data.token)) {
      throw new Error('Invalid tenant token');
    }

    // Check if tenant with this name already exists
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new Error('Tenant name already exists');
    }

    // Generate unique API key for this tenant
    const apiKey = await this.generateUniqueApiKey();

    const newTenant: NewTenant = {
      name: data.name,
      apiKey,
    };

    return await this.repository.create(newTenant);
  }

  /**
   * Get a tenant by its ID.
   * 
   * @param id Tenant ID
   * @returns Promise with tenant or undefined if not found
   */
  async getTenant(id: number): Promise<Tenant | undefined> {
    return await this.repository.findById(id);
  }

  /**
   * Get a tenant by its ID (alias for getTenant).
   * 
   * @param id Tenant ID
   * @returns Promise with tenant or undefined if not found
   */
  async getTenantById(id: number): Promise<Tenant | undefined> {
    return await this.getTenant(id);
  }

  /**
   * Get a tenant by its name.
   * 
   * @param name Tenant name
   * @returns Promise with tenant or undefined if not found
   */
  async getTenantByName(name: string): Promise<Tenant | undefined> {
    return await this.repository.findByName(name);
  }

  /**
   * Get a tenant by its API key.
   * 
   * @param apiKey Tenant API key
   * @returns Promise with tenant or undefined if not found
   */
  async getTenantByApiKey(apiKey: string): Promise<Tenant | undefined> {
    return await this.repository.findByApiKey(apiKey);
  }

  /**
   * List all tenants with optional pagination.
   * 
   * @param options Pagination options
   * @returns Promise with array of tenants
   */
  async listTenants(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Tenant[]> {
    return await this.repository.findMany(options);
  }

  /**
   * Count total tenants.
   * 
   * @returns Promise with total count
   */
  async countTenants(): Promise<number> {
    return await this.repository.count();
  }

  /**
   * Delete a tenant.
   * 
   * @param id Tenant ID
   * @returns Promise that resolves when delete is complete
   */
  async deleteTenant(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Generate a unique API key by checking for collisions.
   * In the extremely unlikely event of a collision, generates a new key.
   * 
   * @returns Promise with unique API key
   */
  private async generateUniqueApiKey(): Promise<string> {
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      const apiKey = generateTenantApiKey();
      const existing = await this.repository.findByApiKey(apiKey);
      
      if (!existing) {
        return apiKey;
      }
      
      // Collision detected, try again
      const message = `API key collision detected (attempt ${i + 1}/${maxAttempts}), generating new key`;
      if (this.logger) {
        this.logger.warn(message);
      } else {
        console.error(message);
      }
    }
    
    throw new Error('Failed to generate unique API key after maximum attempts');
  }

  /**
   * Get the underlying repository (for testing or direct access).
   * 
   * @returns TenantRepository instance
   */
  getRepository(): TenantRepository {
    return this.repository;
  }
}
