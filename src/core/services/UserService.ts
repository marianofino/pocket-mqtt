import { createUserRepository } from '../repositories/repository.factory.js';
import type { UserRepository, User, NewUser } from '../repositories/UserRepository.interface.js';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Service for managing per-tenant admin users.
 * 
 * Handles business logic for:
 * - Creating users for a specific tenant
 * - Hashing passwords securely
 * - Managing user authentication
 */
export class UserService {
  private repository: UserRepository;

  constructor(repository?: UserRepository) {
    this.repository = repository ?? createUserRepository();
  }

  /**
   * Create a new user for a specific tenant.
   * 
   * @param data User data (tenantId, username, password)
   * @returns Promise with created user (password hash is included but should not be exposed in API responses)
   * @throws Error if username already exists for the tenant
   */
  async createUser(data: {
    tenantId: number;
    username: string;
    password: string;
  }): Promise<User> {
    // Check if user with this username already exists for the tenant
    const existing = await this.repository.findByTenantAndUsername(data.tenantId, data.username);
    if (existing) {
      throw new Error('Username already exists for this tenant');
    }

    // Hash the password with a random salt
    const passwordHash = this.hashPassword(data.password);

    const newUser: NewUser = {
      tenantId: data.tenantId,
      username: data.username,
      passwordHash,
    };

    return await this.repository.create(newUser);
  }

  /**
   * Get a user by its ID.
   * 
   * @param id User ID
   * @returns Promise with user or undefined if not found
   */
  async getUser(id: number): Promise<User | undefined> {
    return await this.repository.findById(id);
  }

  /**
   * Get a user by tenant ID and username.
   * 
   * @param tenantId Tenant ID
   * @param username Username
   * @returns Promise with user or undefined if not found
   */
  async getUserByTenantAndUsername(tenantId: number, username: string): Promise<User | undefined> {
    return await this.repository.findByTenantAndUsername(tenantId, username);
  }

  /**
   * List all users for a tenant with optional pagination.
   * 
   * @param tenantId Tenant ID
   * @param options Pagination options
   * @returns Promise with array of users
   */
  async listUsersByTenant(tenantId: number, options?: {
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    return await this.repository.findByTenant(tenantId, options);
  }

  /**
   * Count total users for a tenant.
   * 
   * @param tenantId Tenant ID
   * @returns Promise with total count
   */
  async countUsersByTenant(tenantId: number): Promise<number> {
    return await this.repository.countByTenant(tenantId);
  }

  /**
   * Verify a user's password.
   * Uses constant-time comparison to prevent timing attacks.
   * 
   * @param user User to verify
   * @param password Password to verify
   * @returns True if password matches, false otherwise
   */
  verifyPassword(user: User, password: string): boolean {
    const hash = this.hashPassword(password, this.extractSalt(user.passwordHash));
    
    // Use constant-time comparison to prevent timing attacks
    if (hash.length !== user.passwordHash.length) {
      return false;
    }
    
    const hashBuffer = Buffer.from(hash, 'utf8');
    const storedHashBuffer = Buffer.from(user.passwordHash, 'utf8');
    
    try {
      return timingSafeEqual(hashBuffer, storedHashBuffer);
    } catch {
      // timingSafeEqual throws if buffers have different lengths
      return false;
    }
  }

  /**
   * Delete a user.
   * 
   * @param id User ID
   * @returns Promise that resolves when delete is complete
   */
  async deleteUser(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Hash a password with a salt using SHA-256.
   * Format: salt$hash
   * 
   * NOTE: This is a basic implementation for initial multi-tenant support.
   * For production use, consider migrating to bcrypt, scrypt, or Argon2
   * which provide better security against timing attacks and brute force.
   * 
   * @param password Password to hash
   * @param salt Optional salt (generated if not provided)
   * @returns Hashed password with salt
   */
  private hashPassword(password: string, salt?: string): string {
    const actualSalt = salt ?? randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(actualSalt + password)
      .digest('hex');
    return `${actualSalt}$${hash}`;
  }

  /**
   * Extract salt from a hashed password.
   * 
   * @param passwordHash Hashed password (format: salt$hash)
   * @returns Salt
   * @throws Error if password hash format is invalid
   */
  private extractSalt(passwordHash: string): string {
    const separatorIndex = passwordHash.indexOf('$');

    // Validate format: must contain a '$' with non-empty salt and hash parts
    if (separatorIndex <= 0 || separatorIndex === passwordHash.length - 1) {
      throw new Error('Invalid password hash format; expected "salt$hash".');
    }

    return passwordHash.substring(0, separatorIndex);
  }

  /**
   * Get the underlying repository (for testing or direct access).
   * 
   * @returns UserRepository instance
   */
  getRepository(): UserRepository {
    return this.repository;
  }
}
