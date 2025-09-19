// /backend/src/common/guards/proxy-aware-throttler.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const ips = req.ips as string[] | undefined;
    const ip = req.ip as string | undefined;
    const hostname = req.hostname as string | undefined;
    return Promise.resolve(
      (Array.isArray(ips) && ips[0]) || ip || hostname || 'unknown',
    );
  }
}
