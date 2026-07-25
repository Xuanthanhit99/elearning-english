import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthSessionService } from '../../auth/auth-session.service';
import { CommunityGateway } from './community.gateway';

// Covers the realtime-ban-enforcement fix shared (identical pattern) by
// all 5 socket gateways in this codebase — a banned user's already-issued
// JWT stays cryptographically valid until it expires, so every gateway
// needs its own AuthSessionService.isBanned() check on connect, not just
// HTTP's JwtStrategy.
describe('CommunityGateway', () => {
  let gateway: CommunityGateway;

  const jwtServiceMock = { verify: jest.fn() };
  const prismaMock = {};
  const authSessionMock = { isBanned: jest.fn() };

  function fakeClient(cookie?: string) {
    return {
      handshake: { headers: { cookie } },
      data: {} as any,
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    } as any;
  }

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityGateway,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuthSessionService, useValue: authSessionMock },
      ],
    }).compile();

    gateway = module.get<CommunityGateway>(CommunityGateway);
  });

  it('disconnects a banned user even with a valid, unexpired JWT', async () => {
    jwtServiceMock.verify.mockReturnValue({ sub: 'user-1' });
    authSessionMock.isBanned.mockResolvedValue(true);
    const client = fakeClient('access_token=valid.jwt.token');

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith(
      'community:unauthorized',
      expect.objectContaining({ message: expect.stringContaining('banned') }),
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('allows a non-banned, correctly-authenticated user through', async () => {
    jwtServiceMock.verify.mockReturnValue({ sub: 'user-1' });
    authSessionMock.isBanned.mockResolvedValue(false);
    const client = fakeClient('access_token=valid.jwt.token');

    await gateway.handleConnection(client);

    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.data.user).toEqual({ id: 'user-1', role: undefined });
    expect(client.join).toHaveBeenCalledWith('user:user-1');
  });

  it('still rejects an invalid token without ever checking ban status', async () => {
    jwtServiceMock.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const client = fakeClient('access_token=garbage');

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(authSessionMock.isBanned).not.toHaveBeenCalled();
  });
});
