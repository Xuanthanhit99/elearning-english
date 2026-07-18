import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { NotificationCookieAuthService } from './notification-cookie-auth.service';

describe('NotificationCookieAuthService', () => {
  const jwt = new JwtService();
  let service: NotificationCookieAuthService;
  const previousSecret = process.env.JWT_ACCESS_SECRET;

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    service = new NotificationCookieAuthService(jwt);
  });

  afterAll(() => {
    process.env.JWT_ACCESS_SECRET = previousSecret;
  });

  it('authenticates the user from an HttpOnly access token cookie', () => {
    const token = jwt.sign(
      { sub: 'user-1', role: 'USER' },
      { secret: 'test-access-secret' },
    );
    const user = service.authenticate({
      handshake: { headers: { cookie: `access_token=${token}; ignored=1` } },
    } as Socket);

    expect(user).toEqual({ id: 'user-1', role: 'USER' });
  });

  it('rejects missing cookies', () => {
    expect(() =>
      service.authenticate({ handshake: { headers: {} } } as Socket),
    ).toThrow();
  });

  it('rejects tokens signed with a different secret', () => {
    const token = jwt.sign({ sub: 'user-1' }, { secret: 'wrong-secret' });

    expect(() =>
      service.authenticate({
        handshake: { headers: { cookie: `access_token=${token}` } },
      } as Socket),
    ).toThrow();
  });
});
