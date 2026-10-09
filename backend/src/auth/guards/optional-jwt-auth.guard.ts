import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Oturum acmis kullaniciyi request'e ekler, acmamissa engellemez.
 * Herkese acik ama kullaniciya gore kisisellestirilen uclar icin kullanilir
 * (ornegin kanitlarda "benim oyum" alani).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // token yok veya gecersiz: anonim devam
    }
    return true;
  }

  handleRequest<TUser = any>(_err: any, user: any): TUser {
    return (user || undefined) as TUser;
  }
}
