import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('est défini', () => {
    const service = new PrismaService();
    expect(service).toBeDefined();
  });

  it('onModuleInit() appelle $connect()', async () => {
    const service = new PrismaService();
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy() appelle $disconnect()', async () => {
    const service = new PrismaService();
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
