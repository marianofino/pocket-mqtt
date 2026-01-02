/**
 * User record from database.
 */
export interface User {
  id: number;
  tenantId: number;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

/**
 * New user to insert.
 */
export interface NewUser {
  tenantId: number;
  username: string;
  passwordHash: string;
}

/**
 * Repository interface for user management.
 * 
 * This abstraction follows the Repository Pattern as per ARCHITECTURE.md:
 * - Makes DB/ORM calls abstract and adaptable for future storage engines
 * - Allows switching between SQLite and PostgreSQL
 * - Maintains consistent API regardless of underlying database
 */
export interface UserRepository {
  /**
   * Create a new user.
   * @param user User data to insert
   * @returns Promise with created user
   */
  create(user: NewUser): Promise<User>;

  /**
   * Find a user by its ID.
   * @param id User ID
   * @returns Promise with user or undefined if not found
   */
  findById(id: number): Promise<User | undefined>;

  /**
   * Find a user by tenant ID and username.
   * @param tenantId Tenant ID
   * @param username Username
   * @returns Promise with user or undefined if not found
   */
  findByTenantAndUsername(tenantId: number, username: string): Promise<User | undefined>;

  /**
   * List all users for a tenant with optional pagination.
   * @param tenantId Tenant ID
   * @param options Query options for pagination
   * @returns Promise with array of users
   */
  findByTenant(tenantId: number, options?: {
    limit?: number;
    offset?: number;
  }): Promise<User[]>;

  /**
   * Count total users for a tenant.
   * @param tenantId Tenant ID
   * @returns Promise with total count
   */
  countByTenant(tenantId: number): Promise<number>;

  /**
   * Delete a user.
   * @param id User ID
   * @returns Promise that resolves when delete is complete
   */
  delete(id: number): Promise<void>;

  /**
   * Delete all users (for testing).
   * @returns Promise that resolves when delete is complete
   */
  deleteAll(): Promise<void>;
}
