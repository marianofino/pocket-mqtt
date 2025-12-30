import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import type { DeviceService } from '../../core/services/DeviceService.js';

/**
 * Options for device routes plugin
 */
export interface DeviceRoutesOptions extends FastifyPluginOptions {
  deviceService: DeviceService;
}

/**
 * Validation constants for device fields
 */
const MAX_NAME_LENGTH = 255;
const MAX_NOTES_LENGTH = 1000;
const MAX_LABELS = 50;
const MAX_LABEL_LENGTH = 100;

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate device name field
 */
function validateName(name: unknown, required: boolean = true): ValidationResult {
  if (name === undefined) {
    return required 
      ? { valid: false, error: 'name is required' }
      : { valid: true };
  }

  if (typeof name !== 'string') {
    return { valid: false, error: 'name must be a string' };
  }

  if (name.trim().length === 0) {
    return { valid: false, error: 'name must be a non-empty string' };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `name must not exceed ${MAX_NAME_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Validate device labels field
 */
function validateLabels(labels: unknown): ValidationResult {
  if (labels === undefined) {
    return { valid: true };
  }

  if (!Array.isArray(labels)) {
    return { valid: false, error: 'labels must be an array of strings' };
  }

  if (labels.length > MAX_LABELS) {
    return { valid: false, error: `labels must not contain more than ${MAX_LABELS} items` };
  }

  const invalidLabel = labels.find(
    (l) =>
      typeof l !== 'string' ||
      l.trim().length === 0 ||
      l.length > MAX_LABEL_LENGTH
  );

  if (invalidLabel !== undefined) {
    return {
      valid: false,
      error: `each label must be a non-empty string with a maximum length of ${MAX_LABEL_LENGTH} characters`
    };
  }

  return { valid: true };
}

/**
 * Validate device notes field
 */
function validateNotes(notes: unknown): ValidationResult {
  if (notes === undefined) {
    return { valid: true };
  }

  if (typeof notes !== 'string') {
    return { valid: false, error: 'notes must be a string' };
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return { valid: false, error: `notes must not exceed ${MAX_NOTES_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Device route plugin
 * Provides endpoints for managing MQTT devices with auto-generated tokens
 * Requires JWT authentication for all endpoints
 */
export async function deviceRoutes(
  fastify: FastifyInstance,
  opts: DeviceRoutesOptions
): Promise<void> {
  const { deviceService } = opts;

  /**
   * POST /api/devices - Create a new device (protected)
   * Requires JWT authentication
   * Auto-generates a unique token for the device
   * 
   * @param request - Fastify request with name, labels (optional), notes (optional) in body
   * @param reply - Fastify reply object
   * @returns Created device with generated token
   */
  fastify.post('/api/devices', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { tenantId?: number; name?: string; labels?: string[]; notes?: string } | undefined;
    const { tenantId, name, labels, notes } = body ?? {};
    
    // Validate tenantId (required)
    if (tenantId === undefined || typeof tenantId !== 'number' || tenantId < 1) {
      reply.code(400).send({ error: 'tenantId is required and must be a positive integer' });
      return;
    }
    
    // Validate name (required)
    const nameValidation = validateName(name, true);
    if (!nameValidation.valid) {
      reply.code(400).send({ error: nameValidation.error });
      return;
    }

    // Validate labels (optional)
    const labelsValidation = validateLabels(labels);
    if (!labelsValidation.valid) {
      reply.code(400).send({ error: labelsValidation.error });
      return;
    }

    // Validate notes (optional)
    const notesValidation = validateNotes(notes);
    if (!notesValidation.valid) {
      reply.code(400).send({ error: notesValidation.error });
      return;
    }

    try {
      const device = await deviceService.createDevice({
        tenantId,
        name: name!.trim(),
        labels,
        notes
      });

      // Parse labels back to array for response
      const responseDevice = {
        ...device,
        labels: device.labels ? JSON.parse(device.labels) : null
      };

      return reply.code(201).send({
        success: true,
        device: responseDevice
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      fastify.log.error({ err }, 'Error creating device');
      return reply.code(500).send({ error: 'Failed to create device' });
    }
  });

  /**
   * GET /api/devices - List all devices (protected)
   * Requires JWT authentication
   * Supports pagination with limit and offset query parameters
   * 
   * @param request - Fastify request with optional query parameters (limit, offset)
   * @param reply - Fastify reply object
   * @returns List of devices with pagination metadata
   */
  fastify.get('/api/devices', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { limit?: string; offset?: string };
    
    const MAX_LIMIT = 1000;
    
    let limit = 100;
    if (query.limit !== undefined) {
      const parsedLimit = parseInt(query.limit, 10);
      if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
        reply.code(400).send({ error: `limit must be an integer between 1 and ${MAX_LIMIT}` });
        return;
      }
      limit = parsedLimit;
    }

    let offset = 0;
    if (query.offset !== undefined) {
      const parsedOffset = parseInt(query.offset, 10);
      if (Number.isNaN(parsedOffset) || parsedOffset < 0) {
        reply.code(400).send({ error: 'offset must be a non-negative integer' });
        return;
      }
      offset = parsedOffset;
    }
    
    try {
      const devices = await deviceService.listDevices({ limit, offset });
      const total = await deviceService.countDevices();

      // Parse labels back to arrays for response
      const responseDevices = devices.map(device => ({
        ...device,
        labels: device.labels ? JSON.parse(device.labels) : null
      }));

      return {
        data: responseDevices,
        pagination: {
          total,
          limit,
          offset
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      fastify.log.error({ err }, 'Error listing devices');
      return reply.code(500).send({ error: 'Failed to list devices' });
    }
  });

  /**
   * GET /api/devices/:id - Get a specific device (protected)
   * Requires JWT authentication
   * 
   * @param request - Fastify request with id parameter
   * @param reply - Fastify reply object
   * @returns Device details
   */
  fastify.get('/api/devices/:id', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const id = parseInt(params.id, 10);
    
    if (Number.isNaN(id) || id < 1) {
      reply.code(400).send({ error: 'id must be a positive integer' });
      return;
    }
    
    try {
      const device = await deviceService.getDevice(id);
      
      if (!device) {
        reply.code(404).send({ error: 'Device not found' });
        return;
      }

      // Parse labels back to array for response
      const responseDevice = {
        ...device,
        labels: device.labels ? JSON.parse(device.labels) : null
      };

      return { device: responseDevice };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      fastify.log.error({ err }, 'Error getting device');
      return reply.code(500).send({ error: 'Failed to get device' });
    }
  });

  /**
   * POST /api/devices/:id/regenerate-token - Regenerate device token (protected)
   * Requires JWT authentication
   * Invalidates old token and generates a new one
   * 
   * @param request - Fastify request with id parameter
   * @param reply - Fastify reply object
   * @returns Updated device with new token
   */
  fastify.post('/api/devices/:id/regenerate-token', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const id = parseInt(params.id, 10);
    
    if (Number.isNaN(id) || id < 1) {
      reply.code(400).send({ error: 'id must be a positive integer' });
      return;
    }
    
    try {
      const device = await deviceService.regenerateToken(id);
      
      if (!device) {
        reply.code(404).send({ error: 'Device not found' });
        return;
      }

      // Parse labels back to array for response
      const responseDevice = {
        ...device,
        labels: device.labels ? JSON.parse(device.labels) : null
      };

      return {
        success: true,
        device: responseDevice,
        message: 'Token regenerated successfully'
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      fastify.log.error({ err }, 'Error regenerating token');
      return reply.code(500).send({ error: 'Failed to regenerate token' });
    }
  });

  /**
   * PATCH /api/devices/:id - Update device metadata (protected)
   * Requires JWT authentication
   * Updates name, labels, and/or notes
   * 
   * @param request - Fastify request with id parameter and update data in body
   * @param reply - Fastify reply object
   * @returns Updated device
   */
  fastify.patch('/api/devices/:id', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const id = parseInt(params.id, 10);
    
    if (Number.isNaN(id) || id < 1) {
      reply.code(400).send({ error: 'id must be a positive integer' });
      return;
    }

    const body = request.body as { name?: string; labels?: string[]; notes?: string } | undefined;
    const { name, labels, notes } = body ?? {};

    // At least one field must be provided
    if (name === undefined && labels === undefined && notes === undefined) {
      reply.code(400).send({ error: 'At least one field (name, labels, notes) must be provided' });
      return;
    }

    // Validate name if provided
    const nameValidation = validateName(name, false);
    if (!nameValidation.valid) {
      reply.code(400).send({ error: nameValidation.error });
      return;
    }

    // Validate labels if provided
    const labelsValidation = validateLabels(labels);
    if (!labelsValidation.valid) {
      reply.code(400).send({ error: labelsValidation.error });
      return;
    }

    // Validate notes if provided
    const notesValidation = validateNotes(notes);
    if (!notesValidation.valid) {
      reply.code(400).send({ error: notesValidation.error });
      return;
    }
    
    try {
      const device = await deviceService.updateDevice(id, { 
        name: name?.trim(), 
        labels, 
        notes 
      });
      
      if (!device) {
        reply.code(404).send({ error: 'Device not found' });
        return;
      }

      // Parse labels back to array for response
      const responseDevice = {
        ...device,
        labels: device.labels ? JSON.parse(device.labels) : null
      };

      return {
        success: true,
        device: responseDevice
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      fastify.log.error({ err }, 'Error updating device');
      return reply.code(500).send({ error: 'Failed to update device' });
    }
  });

  /**
   * DELETE /api/devices/:id - Delete a device (protected)
   * Requires JWT authentication
   * 
   * @param request - Fastify request with id parameter
   * @param reply - Fastify reply object
   * @returns Success message
   */
  fastify.delete('/api/devices/:id', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const id = parseInt(params.id, 10);
    
    if (Number.isNaN(id) || id < 1) {
      reply.code(400).send({ error: 'id must be a positive integer' });
      return;
    }
    
    try {
      // Check if device exists first
      const device = await deviceService.getDevice(id);
      if (!device) {
        reply.code(404).send({ error: 'Device not found' });
        return;
      }

      await deviceService.deleteDevice(id);
      
      return {
        success: true,
        message: 'Device deleted successfully'
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      fastify.log.error({ err }, 'Error deleting device');
      return reply.code(500).send({ error: 'Failed to delete device' });
    }
  });
}
