// SOURCE ONLY. Necessary private provider transport; no new BFF/SaaS product endpoint.
// Requires Root-qualified current source/image, preserved assets bind, native bearer session,
// original ReadCatalog/ReadAsset permission and actual Asset-to-context-channel association.
// Native provider flow is separate from any SaaS/end-customer authority claim.
import { Controller, Get, Head, Param, Req, Res } from '@nestjs/common';
import { Allow, Asset, ConfigService, Ctx, Permission, PluginCommonModule,
  RequestContext, TransactionalConnection, VendurePlugin } from '@vendure/core';
import type { Request, Response } from 'express';

@Controller('task-assets')
class OriginalAssetDeliveryController {
  constructor(private readonly connection: TransactionalConnection,
              private readonly config: ConfigService) {}

  @Get(':filename')
  @Allow(Permission.ReadCatalog, Permission.ReadAsset)
  get(@Ctx() ctx: RequestContext, @Param('filename') filename: string,
      @Req() req: Request, @Res() res: Response) {
    return this.deliver(ctx, filename, req, res, false);
  }

  @Head(':filename')
  @Allow(Permission.ReadCatalog, Permission.ReadAsset)
  head(@Ctx() ctx: RequestContext, @Param('filename') filename: string,
       @Req() req: Request, @Res() res: Response) {
    return this.deliver(ctx, filename, req, res, true);
  }

  private async deliver(ctx: RequestContext, filename: string,
                        req: Request, res: Response, head: boolean) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const deny = () => res.status(404).end();
    // Recheck native channel permission even if a deployment accidentally disabled AuthGuard.
    if (this.config.authOptions.disableAuth ||
        !ctx.activeUserId ||
        !ctx.userHasPermissions([Permission.ReadCatalog, Permission.ReadAsset]) ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(filename) ||
        req.originalUrl.includes('?') ||
        Object.keys(req.query ?? {}).length !== 0) return deny();
    try {
      // Use the original context-aware repository; no rawConnection/admin context shortcut.
      const matches = await this.connection.getRepository(ctx, Asset)
        .createQueryBuilder('asset')
        .innerJoin('asset.channels', 'assetChannel',
          'assetChannel.id = :channelId', { channelId: ctx.channelId })
        .where('(asset.source = :filename OR asset.preview = :filename)', { filename })
        .take(1).getMany();
      if (matches.length === 0) return deny();
      const asset = matches[0];
      if (!['image/avif', 'image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) return deny();
      // Original flat strategy, original file bytes, no stock transform/fallback/static redirect.
      const bytes = await this.config.assetOptions.assetStorageStrategy.readFileToBuffer(filename);
      // Response acceptance cap only: original readFileToBuffer allocates BEFORE this check.
      if (!Buffer.isBuffer(bytes) || bytes.length > 52428800) return deny();
      res.status(200);
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Content-Length', String(bytes.length));
      return (head || req.method === 'HEAD') ? res.end() : res.end(bytes);
    } catch (_) {
      // No native exception/body/credential/path logging from this derivative handler.
      return deny();
    }
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  controllers: [OriginalAssetDeliveryController],
})
export class OriginalAssetDeliveryPlugin {}
