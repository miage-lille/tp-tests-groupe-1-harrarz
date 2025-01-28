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
          organizerId: 'different-user', // Different from test-user in the route
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
});
