/**
 * Tenant record from database.
 */
export interface Tenant {
    id: number;
    name: string;
    apiKey: string;
    createdAt: Date;
}
/**
 * New tenant to insert.
 */
export interface NewTenant {
    name: string;
    apiKey: string;
}
/**
 * Repository interface for tenant management.
 *
 * This abstraction follows the Repository Pattern as per ARCHITECTURE.md:
 * - Makes DB/ORM calls abstract and adaptable for future storage engines
 * - Allows switching between SQLite and PostgreSQL
 * - Maintains consistent API regardless of underlying database
 */
export interface TenantRepository {
    /**
     * Create a new tenant.
     * @param tenant Tenant data to insert
     * @returns Promise with created tenant
     */
    create(tenant: NewTenant): Promise<Tenant>;
    /**
     * Find a tenant by its ID.
     * @param id Tenant ID
     * @returns Promise with tenant or undefined if not found
     */
    findById(id: number): Promise<Tenant | undefined>;
    /**
     * Find a tenant by its name.
     * @param name Tenant name
     * @returns Promise with tenant or undefined if not found
     */
    findByName(name: string): Promise<Tenant | undefined>;
    /**
     * Find a tenant by its API key.
     * @param apiKey Tenant API key
     * @returns Promise with tenant or undefined if not found
     */
    findByApiKey(apiKey: string): Promise<Tenant | undefined>;
    /**
     * List all tenants with optional pagination.
     * @param options Query options for pagination
     * @returns Promise with array of tenants
     */
    findMany(options?: {
        limit?: number;
        offset?: number;
    }): Promise<Tenant[]>;
    /**
     * Count total tenants.
     * @returns Promise with total count
     */
    count(): Promise<number>;
    /**
     * Delete a tenant.
     * @param id Tenant ID
     * @returns Promise that resolves when delete is complete
     */
    delete(id: number): Promise<void>;
    /**
     * Delete all tenants (for testing).
     * @returns Promise that resolves when delete is complete
     */
    deleteAll(): Promise<void>;
}
//# sourceMappingURL=TenantRepository.interface.d.ts.map