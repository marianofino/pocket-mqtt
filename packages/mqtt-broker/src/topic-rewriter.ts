/**
 * Rewrite MQTT topic for multi-tenant isolation.
 * 
 * This function enforces two critical security rules:
 * 1. Blocks all MQTT reserved topics (no whitelist approach)
 * 2. Prepends tenant namespace to all allowed topics
 * 
 * Reserved topics that are blocked:
 * - $SYS/ - System topics for broker information
 * - $share/ - Shared subscriptions
 * - $queue/ - Queue subscriptions
 * 
 * Topic rewriting ensures that:
 * - Every topic is scoped to a specific tenant
 * - Client-supplied tenant segments are treated as normal subtopics
 * - Cross-tenant access is impossible regardless of wildcards or malicious attempts
 * 
 * @param topic - The original MQTT topic from the client
 * @param tenantId - The authenticated tenant ID for this client
 * @returns The rewritten topic with tenant prefix
 * @throws Error if the topic is a reserved MQTT topic
 * 
 * @example
 * ```typescript
 * // Normal topic rewriting
 * rewriteTopic('devices/foo/telemetry', 1)
 * // Returns: 'tenants/1/devices/foo/telemetry'
 * 
 * // Reserved topic blocking
 * rewriteTopic('$SYS/broker/info', 1)
 * // Throws: Error('Reserved MQTT topics are not allowed')
 * 
 * // Double-prefix protection
 * rewriteTopic('tenants/999/devices/steal', 1)
 * // Returns: 'tenants/1/tenants/999/devices/steal'
 * // (isolated to tenant 1, cannot access tenant 999's data)
 * ```
 */
export function rewriteTopic(topic: string, tenantId: number): string {
  // Block all MQTT reserved topics (no whitelist)
  if (topic.startsWith('$SYS/') || topic.startsWith('$share/') || topic.startsWith('$queue/')) {
    throw new Error('Reserved MQTT topics are not allowed');
  }

  // Always prepend the tenant namespace, regardless of what the client sends
  // This ensures complete isolation - client-supplied tenant prefixes become
  // normal subtopics within the actual tenant's namespace
  return `tenants/${tenantId}/${topic}`;
}
