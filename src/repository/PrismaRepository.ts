import type { PrismaClient } from '@prisma/client';
import type {
  IRepository,
  ITelemetryRepository,
  IDeviceTokenRepository,
  TelemetryData,
  TelemetryRecord,
  TelemetryQueryOptions,
  DeviceTokenData,
  DeviceTokenRecord,
} from './interfaces.js';

/**
 * Telemetry repository implementation using Prisma.
 */
class PrismaTelemetryRepository implements ITelemetryRepository {
  constructor(private prisma: PrismaClient) {}

  async createMany(data: TelemetryData[]): Promise<void> {
    await this.prisma.telemetry.createMany({
      data,
    });
  }

  async findMany(options: TelemetryQueryOptions): Promise<TelemetryRecord[]> {
    const where = options.topic ? { topic: options.topic } : {};
    const orderBy = options.orderBy
      ? { [options.orderBy]: (options.orderDirection || 'desc') as 'asc' | 'desc' }
      : { timestamp: 'desc' as const };

    return this.prisma.telemetry.findMany({
      where,
      orderBy,
      take: options.limit,
      skip: options.offset,
    });
  }

  async count(options: Pick<TelemetryQueryOptions, 'topic'>): Promise<number> {
    const where = options.topic ? { topic: options.topic } : {};
    return this.prisma.telemetry.count({ where });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.telemetry.deleteMany();
  }
}

/**
 * Device token repository implementation using Prisma.
 */
class PrismaDeviceTokenRepository implements IDeviceTokenRepository {
  constructor(private prisma: PrismaClient) {}

  async findByToken(token: string): Promise<DeviceTokenRecord | null> {
    return this.prisma.deviceToken.findUnique({
      where: { token },
    });
  }

  async create(data: DeviceTokenData): Promise<DeviceTokenRecord> {
    return this.prisma.deviceToken.create({
      data: {
        deviceId: data.deviceId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.deviceToken.deleteMany();
  }
}

/**
 * Main repository implementation using Prisma.
 * Works with both SQLite and PostgreSQL adapters.
 */
export class PrismaRepository implements IRepository {
  public telemetry: ITelemetryRepository;
  public deviceToken: IDeviceTokenRepository;

  constructor(private prisma: PrismaClient) {
    this.telemetry = new PrismaTelemetryRepository(prisma);
    this.deviceToken = new PrismaDeviceTokenRepository(prisma);
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Get the underlying Prisma client (for legacy code migration).
   */
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }
}
