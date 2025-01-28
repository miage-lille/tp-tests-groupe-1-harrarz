import { FixedDateGenerator } from 'src/core/adapters/fixed-date-generator';
import { FixedIdGenerator } from 'src/core/adapters/fixed-id-generator';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';
import { TestServerFixture } from 'src/tests/fixtures';
import { Webinar } from 'src/webinars/entities/webinar.entity';

describe('Feature: Organize webinars', () => {
  let fixture: TestServerFixture;
  let repository: PrismaWebinarRepository;
  let useCase: OrganizeWebinars;
  let dateGenerator: FixedDateGenerator;
  let idGenerator: FixedIdGenerator;

  const payload = {
    userId: 'user-alice-id',
    title: 'Webinar title',
    seats: 100,
    startDate: new Date('2024-01-10T10:00:00.000Z'),
    endDate: new Date('2024-01-10T11:00:00.000Z'),
  };

  async function expectWebinarToEqual(webinarId: string, expectedWebinar: any) {
    const webinar = await fixture.getPrismaClient().webinar.findUnique({
      where: { id: webinarId },
    });
    expect(webinar).toEqual(expectedWebinar);
  }

  async function expectNoWebinarInDatabase() {
    const webinarCount = await fixture.getPrismaClient().webinar.count();
    expect(webinarCount).toBe(0);
  }

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.reset();
    const prismaClient = fixture.getPrismaClient();
    repository = new PrismaWebinarRepository(prismaClient);
    dateGenerator = new FixedDateGenerator(
      new Date('2024-01-01T00:00:00.000Z'),
    );
    idGenerator = new FixedIdGenerator();
    useCase = new OrganizeWebinars(repository, idGenerator, dateGenerator);
  });

  afterAll(async () => {
    await fixture.stop();
  });

  describe('Scenario: happy path', () => {
    it('should create a webinar', async () => {
      const result = await useCase.execute(payload);
      expect(result).toEqual({ id: 'id-1' });
    });

    it('should insert a new webinar in the repository', async () => {
      await useCase.execute(payload);

      await expectWebinarToEqual('id-1', {
        id: 'id-1',
        organizerId: 'user-alice-id',
        title: 'Webinar title',
        startDate: new Date('2024-01-10T10:00:00.000Z'),
        endDate: new Date('2024-01-10T11:00:00.000Z'),
        seats: 100,
      });
    });
  });

  describe('Scenario: webinar happens too soon', () => {
    const payload = {
      userId: 'user-alice-id',
      title: 'Webinar title',
      seats: 100,
      startDate: new Date('2024-01-03T23:59:59.000Z'),
      endDate: new Date('2024-01-03T23:59:59.000Z'),
    };

    it('should throw an error', async () => {
      await expect(useCase.execute(payload)).rejects.toThrow(
        'Webinar must be scheduled at least 3 days in advance',
      );
    });

    it('should not insert the webinar in the repository', async () => {
      try {
        await useCase.execute(payload);
      } catch (error) {}

      await expectNoWebinarInDatabase();
    });
  });

  describe('Scenario: webinar has too many seats', () => {
    const payload = {
      userId: 'user-alice-id',
      title: 'Webinar title',
      seats: 1001,
      startDate: new Date('2024-01-10T10:00:00.000Z'),
      endDate: new Date('2024-01-10T11:00:00.000Z'),
    };

    it('should throw an error', async () => {
      await expect(useCase.execute(payload)).rejects.toThrow(
        'Webinar must have at most 1000 seats',
      );
    });

    it('should not insert the webinar in the repository', async () => {
      try {
        await useCase.execute(payload);
      } catch (error) {}

      await expectNoWebinarInDatabase();
    });
  });

  describe('Scenario: webinar does not have enough seats', () => {
    const payload = {
      userId: 'user-alice-id',
      title: 'Webinar title',
      seats: 0,
      startDate: new Date('2024-01-10T10:00:00.000Z'),
      endDate: new Date('2024-01-10T11:00:00.000Z'),
    };

    it('should throw an error', async () => {
      await expect(useCase.execute(payload)).rejects.toThrow(
        'Webinar must have at least 1 seat',
      );
    });

    it('should not insert the webinar in the repository', async () => {
      try {
        await useCase.execute(payload);
      } catch (error) {}

      await expectNoWebinarInDatabase();
    });
  });
});
