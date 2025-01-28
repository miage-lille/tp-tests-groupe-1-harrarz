import { PrismaClient } from '@prisma/client';
import { RealDateGenerator } from 'src/core/adapters/real-date-generator';
import { RealIdGenerator } from 'src/core/adapters/real-id-generator';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';

export class AppContainer {
  private prismaClient!: PrismaClient;
  private webinarRepository!: PrismaWebinarRepository;
  private changeSeatsUseCase!: ChangeSeats;
  private organizeWebinarUseCase!: OrganizeWebinars;
  private dateGenerator!: RealDateGenerator;
  private idGenerator!: RealIdGenerator;

  init(prismaClient: PrismaClient) {
    this.prismaClient = prismaClient;
    this.webinarRepository = new PrismaWebinarRepository(this.prismaClient);
    this.dateGenerator = new RealDateGenerator();
    this.idGenerator = new RealIdGenerator();

    this.changeSeatsUseCase = new ChangeSeats(this.webinarRepository);
    this.organizeWebinarUseCase = new OrganizeWebinars(
      this.webinarRepository,
      this.idGenerator,
      this.dateGenerator,
    );
  }

  getPrismaClient() {
    return this.prismaClient;
  }

  getChangeSeatsUseCase() {
    return this.changeSeatsUseCase;
  }

  getOrganizeWebinarUseCase() {
    return this.organizeWebinarUseCase;
  }
}

export const container = new AppContainer();
