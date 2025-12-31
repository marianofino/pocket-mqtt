import { createMessageRepository } from '../repositories/repository.factory.js';
import type { MessageRepository } from '../repositories/MessageRepository.interface.js';

interface TelemetryMessage {
  tenantId: number;
  topic: string;
  payload: string;
  timestamp: Date;
}

/**
 * TelemetryService handles buffering and batching of telemetry messages.
 * 
 * As per ARCHITECTURE.md, this service:
 * - Buffers incoming MQTT messages in memory
 * - Flushes to database every 2 seconds or 100 messages (whichever comes first)
 * - Supports >1000 msg/min capacity
 * - Uses Repository Pattern to abstract database operations
 * - Supports both SQLite (WAL mode) and PostgreSQL
 */
export class TelemetryService {
  private buffer: TelemetryMessage[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly flushInterval = 2000; // 2 seconds
  private readonly maxBufferSize = 100; // Max messages before forced flush
  private readonly maxRetries = 3; // Max retry attempts for failed flushes
  private retryCount = 0; // Current retry count
  private repository: MessageRepository;
  private isRunning = true;
  private isFlushing = false;

  constructor() {
    this.repository = createMessageRepository();
    this.startFlushTimer();
  }

  /**
   * Get the repository instance for database operations.
   */
  getRepository(): MessageRepository {
    return this.repository;
  }

  /**
   * Add a message to the buffer.
   * If buffer reaches max size, flush immediately.
   * 
   * @param topic MQTT topic
   * @param payload Message payload
   * @param tenantId Required tenant ID
   */
  async addMessage(topic: string, payload: string, tenantId: number): Promise<void> {
    if (!this.isRunning) {
      throw new Error('TelemetryService is stopped');
    }

    if (!tenantId || typeof tenantId !== 'number' || tenantId < 1) {
      throw new Error('tenantId is required and must be a positive number');
    }

    const message: TelemetryMessage = {
      tenantId,
      topic,
      payload,
      timestamp: new Date(),
    };

    // Determine if adding this message will fill or exceed the buffer
    const willReachMaxBufferSize = this.buffer.length + 1 >= this.maxBufferSize;

    this.buffer.push(message);

    // If buffer is full and no flush is currently in progress, flush immediately
    if (willReachMaxBufferSize && !this.isFlushing) {
      await this.flush();
    }
  }

  /**
   * Flush all buffered messages to the database in a single transaction.
   */
  async flush(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    // Swap buffer to avoid blocking new messages during flush
    const messagesToFlush = this.buffer;
    this.buffer = [];

    try {
      // Batch insert all messages using repository
      await this.repository.insertBatch(
        messagesToFlush.map(msg => ({
          tenantId: msg.tenantId,
          topic: msg.topic,
          payload: msg.payload,
          timestamp: msg.timestamp,
        }))
      );

      // Reset retry count on successful flush
      this.retryCount = 0;
    } catch (error) {
      // On error, restore messages to buffer to avoid data loss
      console.error('Failed to flush telemetry messages:', error);
      
      this.retryCount++;
      
      // Implement circuit breaker: if max retries exceeded, drop oldest messages
      if (this.retryCount >= this.maxRetries) {
        console.error(`Max retries (${this.maxRetries}) exceeded. Dropping ${messagesToFlush.length} messages to prevent memory overflow.`);
        this.retryCount = 0; // Reset for next batch
      } else {
        // Prepend failed messages back to the buffer to retry in next flush
        this.buffer = [...messagesToFlush, ...this.buffer];
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Start the periodic flush timer.
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('Error during scheduled flush:', err);
      });
    }, this.flushInterval);
  }

  /**
   * Stop the service and flush any remaining messages.
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Clear the timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining messages
    await this.flush();
  }

  /**
   * Get the current buffer size (for testing/monitoring).
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}
