import supertest from 'supertest';
import { TestServerFixture } from 'src/tests/fixtures';

describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  describe('POST /webinars/:id/seats', () => {
    it('should update webinar seats', async () => {
      // Arrange
      const prisma = fixture.getPrismaClient();
      const server = fixture.getServer();
      const webinar = await prisma.webinar.create({
        data: {
          id: 'test-webinar',
          title: 'Webinar Test',
          seats: 10,
          startDate: new Date(),
          endDate: new Date(),
          organizerId: 'test-user',
        },
      });

      // Act
      const response = await supertest(server)
        .post(`/webinars/${webinar.id}/seats`)
        .send({ seats: '30' })
        .expect(200);

      // Assert
      expect(response.body).toEqual({ message: 'Seats updated' });
      const updatedWebinar = await prisma.webinar.findUnique({
        where: { id: webinar.id },
      });
      expect(updatedWebinar?.seats).toBe(30);
    });

    it('should return 404 when webinar does not exist', async () => {
      // Arrange
      const server = fixture.getServer();

      // Act & Assert
      const response = await supertest(server)
        .post('/webinars/non-existent-id/seats')
        .send({ seats: '30' })
        .expect(404);

      expect(response.body).toEqual({ error: 'Webinar not found' });
    });

    it('should return 401 when user is not the organizer', async () => {
      // Arrange
      const prisma = fixture.getPrismaClient();
      const server = fixture.getServer();
      const webinar = await prisma.webinar.create({
        data: {
          id: 'test-webinar',
          title: 'Webinar Test',
          seats: 10,
          startDate: new Date(),
          endDate: new Date(),
          organizerId: 'different-user',
        },
      });

      // Act & Assert
      const response = await supertest(server)
        .post(`/webinars/${webinar.id}/seats`)
        .send({ seats: '30' })
        .expect(401);

      expect(response.body).toEqual({
        error: 'User is not allowed to update this webinar',
      });
    });
  });

  describe('POST /webinars', () => {
    const getFutureDate = (daysFromNow: number) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString();
    };

    it('should create a new webinar', async () => {
      // Arrange
      const server = fixture.getServer();
      const prisma = fixture.getPrismaClient();

      const webinarData = {
        title: 'E2E Test Webinar',
        seats: 100,
        startDate: getFutureDate(4),
        endDate: getFutureDate(4),
      };

      // Act
      const response = await supertest(server)
        .post('/webinars')
        .send(webinarData)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('id');

      const createdWebinar = await prisma.webinar.findUnique({
        where: { id: response.body.id },
      });

      expect(createdWebinar).toMatchObject({
        title: webinarData.title,
        seats: webinarData.seats,
        startDate: new Date(webinarData.startDate),
        endDate: new Date(webinarData.endDate),
        organizerId: 'test-user',
      });
    });

    it('should return 400 when date is too soon', async () => {
      const server = fixture.getServer();

      const response = await supertest(server)
        .post('/webinars')
        .send({
          title: 'Too Soon Webinar',
          seats: 100,
          startDate: getFutureDate(1),
          endDate: getFutureDate(1),
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Webinar must be scheduled at least 3 days in advance',
      });
    });

    it('should return 400 when trying to create webinar with no seats', async () => {
      const server = fixture.getServer();

      const response = await supertest(server)
        .post('/webinars')
        .send({
          title: 'Invalid Webinar',
          seats: 0,
          startDate: getFutureDate(4),
          endDate: getFutureDate(4),
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Webinar must have at least 1 seat',
      });
    });

    it('should return 400 when creating webinar with too many seats', async () => {
      const server = fixture.getServer();

      const response = await supertest(server)
        .post('/webinars')
        .send({
          title: 'Too Many Seats',
          seats: 1001,
          startDate: getFutureDate(4),
          endDate: getFutureDate(4),
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Webinar must have at most 1000 seats',
      });
    });
  });
});
