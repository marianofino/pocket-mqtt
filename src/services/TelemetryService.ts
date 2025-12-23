import { getPrismaClient } from '../database.js';
import type { PrismaClient } from '../generated/prisma/index.js';

interface TelemetryMessage {
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
 * - Uses SQLite WAL mode for concurrent I/O
 */
export class TelemetryService {
  private buffer: TelemetryMessage[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly flushInterval = 2000; // 2 seconds
  private readonly maxBufferSize = 100; // Max messages before forced flush
  private prisma: PrismaClient;
  private isRunning = true;
  private isFlushing = false;

  constructor() {
    this.prisma = getPrismaClient();
    this.startFlushTimer();
  }

  /**
   * Get the Prisma client instance for database operations.
   */
  getPrisma(): PrismaClient {
    return this.prisma;
  }

  /**
   * Add a message to the buffer.
   * If buffer reaches max size, flush immediately.
   */
  async addMessage(topic: string, payload: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('TelemetryService is stopped');
    }

    const message: TelemetryMessage = {
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
      // Batch insert all messages in a single transaction
      await this.prisma.telemetry.createMany({
        data: messagesToFlush.map(msg => ({
          topic: msg.topic,
          payload: msg.payload,
          timestamp: msg.timestamp,
        })),
      });

      // Reset the flush timer after successful flush
      this.resetFlushTimer();
    } catch (error) {
      // On error, restore messages to buffer to avoid data loss
      console.error('Failed to flush telemetry messages:', error);
      
      // Prepend failed messages back to the buffer to retry in next flush
      this.buffer = [...messagesToFlush, ...this.buffer];
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
   * Reset the flush timer (called after manual flush).
   */
  private resetFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.startFlushTimer();
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
