import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { FixedDateGenerator } from 'src/core/adapters/fixed-date-generator';
import { FixedIdGenerator } from 'src/core/adapters/fixed-id-generator';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';
import { promisify } from 'util';

const asyncExec = promisify(exec);

describe('OrganizeWebinars Integration', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;
  let useCase: OrganizeWebinars;
  let dateGenerator: FixedDateGenerator;
  let idGenerator: FixedIdGenerator;

  beforeAll(async () => {
    // Connect to database
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    // Run migrations to populate the database
    await asyncExec(`DATABASE_URL=${dbUrl} npx prisma migrate deploy`);
    return prismaClient.$connect();
  });

  beforeEach(async () => {
    // Reset database and initialize dependencies
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');

    repository = new PrismaWebinarRepository(prismaClient);
    dateGenerator = new FixedDateGenerator(
      new Date('2024-01-01T00:00:00.000Z'),
    );
    idGenerator = new FixedIdGenerator();
    useCase = new OrganizeWebinars(repository, idGenerator, dateGenerator);
  });

  afterAll(async () => {
    await container.stop({ timeout: 1000 });
    return prismaClient.$disconnect();
  });

  describe('Scenario: Successfully organize a webinar', () => {
    it('should create a webinar in the database', async () => {
      // ARRANGE
      const payload = {
        userId: 'user-alice-id',
        title: 'Integration Test Webinar',
        seats: 100,
        startDate: new Date('2024-01-10T10:00:00.000Z'),
        endDate: new Date('2024-01-10T11:00:00.000Z'),
      };

      // ACT
      const result = await useCase.execute(payload);

      // ASSERT
      const createdWebinar = await prismaClient.webinar.findUnique({
        where: { id: result.id },
      });

      expect(createdWebinar).toEqual({
        id: 'id-1',
        organizerId: 'user-alice-id',
        title: 'Integration Test Webinar',
        startDate: new Date('2024-01-10T10:00:00.000Z'),
        endDate: new Date('2024-01-10T11:00:00.000Z'),
        seats: 100,
      });
    });
  });

  describe('Scenario: Fail to organize a webinar', () => {
    it('should not create webinar when date is too soon', async () => {
      // ARRANGE
      const payload = {
        userId: 'user-alice-id',
        title: 'Too Soon Webinar',
        seats: 100,
        startDate: new Date('2024-01-02T10:00:00.000Z'), // Less than 3 days from fixed date
        endDate: new Date('2024-01-02T11:00:00.000Z'),
      };

      // ACT & ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(
        'Webinar must be scheduled at least 3 days in advance',
      );

      // Verify no webinar was created
      const webinarCount = await prismaClient.webinar.count();
      expect(webinarCount).toBe(0);
    });

    it('should not create webinar when seats exceed maximum', async () => {
      // ARRANGE
      const payload = {
        userId: 'user-alice-id',
        title: 'Too Many Seats Webinar',
        seats: 1001,
        startDate: new Date('2024-01-10T10:00:00.000Z'),
        endDate: new Date('2024-01-10T11:00:00.000Z'),
      };

      // ACT & ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(
        'Webinar must have at most 1000 seats',
      );

      // Verify no webinar was created
      const webinarCount = await prismaClient.webinar.count();
      expect(webinarCount).toBe(0);
    });

    it('should not create webinar when seats are insufficient', async () => {
      // ARRANGE
      const payload = {
        userId: 'user-alice-id',
        title: 'No Seats Webinar',
        seats: 0,
        startDate: new Date('2024-01-10T10:00:00.000Z'),
        endDate: new Date('2024-01-10T11:00:00.000Z'),
      };

      // ACT & ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(
        'Webinar must have at least 1 seat',
      );

      // Verify no webinar was created
      const webinarCount = await prismaClient.webinar.count();
      expect(webinarCount).toBe(0);
    });
  });
});
