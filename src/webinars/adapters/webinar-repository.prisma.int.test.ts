import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { TestServerFixture } from 'src/tests/fixtures';

describe('PrismaWebinarRepository', () => {
  let fixture: TestServerFixture;
  let repository: PrismaWebinarRepository;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    const prismaClient = fixture.getPrismaClient();
    repository = new PrismaWebinarRepository(prismaClient);
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  describe('Scenario: repository.create', () => {
    it('should create a webinar', async () => {
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      await repository.create(webinar);

      const maybeWebinar = await fixture.getPrismaClient().webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });
  });

  describe('Scenario: repository.findById', () => {
    it('should find a webinar by id', async () => {
      const webinarData = {
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      };
      await fixture.getPrismaClient().webinar.create({ data: webinarData });

      const foundWebinar = await repository.findById('webinar-id');

      expect(foundWebinar?.props).toEqual(webinarData);
    });

    it('should return null when webinar does not exist', async () => {
      const foundWebinar = await repository.findById('non-existent-id');
      expect(foundWebinar).toBeNull();
    });
  });

  describe('Scenario: repository.update', () => {
    it('should update a webinar', async () => {
      const webinarData = {
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      };
      await fixture.getPrismaClient().webinar.create({ data: webinarData });

      const webinar = new Webinar({
        ...webinarData,
        seats: 200,
      });

      await repository.update(webinar);

      const updatedWebinar = await fixture
        .getPrismaClient()
        .webinar.findUnique({
          where: { id: 'webinar-id' },
        });
      expect(updatedWebinar?.seats).toBe(200);
    });
  });
});
