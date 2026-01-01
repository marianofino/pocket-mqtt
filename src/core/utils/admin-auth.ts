/**
 * Validates admin credentials against environment variables
 * 
 * @param username - Username to validate
 * @param password - Password to validate
 * @returns true if credentials are valid, false otherwise
 */
export function validateAdminCredentials(username: string, password: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  return username === adminUsername && password === adminPassword;
}
