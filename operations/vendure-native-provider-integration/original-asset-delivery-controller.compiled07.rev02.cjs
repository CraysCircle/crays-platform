"use strict";
module.paths.unshift('/app/node_modules');
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OriginalAssetDeliveryPlugin = void 0;
// SOURCE ONLY. Necessary private provider transport; no new BFF/SaaS product endpoint.
// Requires Root-qualified current source/image, preserved assets bind, native bearer session,
// original ReadCatalog/ReadAsset permission and actual Asset-to-context-channel association.
// Native provider flow is separate from any SaaS/end-customer authority claim.
const common_1 = require("@nestjs/common");
const core_1 = require("@vendure/core");
let OriginalAssetDeliveryController = class OriginalAssetDeliveryController {
    constructor(connection, config) {
        this.connection = connection;
        this.config = config;
    }
    get(ctx, filename, req, res) {
        return this.deliver(ctx, filename, req, res, false);
    }
    head(ctx, filename, req, res) {
        return this.deliver(ctx, filename, req, res, true);
    }
    async deliver(ctx, filename, req, res, head) {
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        const deny = () => res.status(404).end();
        // Recheck native channel permission even if a deployment accidentally disabled AuthGuard.
        if (this.config.authOptions.disableAuth ||
            !ctx.activeUserId ||
            !ctx.userHasPermissions([core_1.Permission.ReadCatalog, core_1.Permission.ReadAsset]) ||
            !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(filename) ||
            req.originalUrl.includes('?') ||
            Object.keys(req.query ?? {}).length !== 0)
            return deny();
        try {
            // Use the original context-aware repository; no rawConnection/admin context shortcut.
            const matches = await this.connection.getRepository(ctx, core_1.Asset)
                .createQueryBuilder('asset')
                .innerJoin('asset.channels', 'assetChannel', 'assetChannel.id = :channelId', { channelId: ctx.channelId })
                .where('(asset.source = :filename OR asset.preview = :filename)', { filename })
                .take(1).getMany();
            if (matches.length === 0)
                return deny();
            const asset = matches[0];
            if (!['image/avif', 'image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType))
                return deny();
            // Original flat strategy, original file bytes, no stock transform/fallback/static redirect.
            const bytes = await this.config.assetOptions.assetStorageStrategy.readFileToBuffer(filename);
            // Response acceptance cap only: original readFileToBuffer allocates BEFORE this check.
            if (!Buffer.isBuffer(bytes) || bytes.length > 52428800)
                return deny();
            res.status(200);
            res.setHeader('Content-Type', asset.mimeType);
            res.setHeader('Content-Length', String(bytes.length));
            return (head || req.method === 'HEAD') ? res.end() : res.end(bytes);
        }
        catch (_) {
            // No native exception/body/credential/path logging from this derivative handler.
            return deny();
        }
    }
};
__decorate([
    (0, common_1.Get)(':filename'),
    (0, core_1.Allow)(core_1.Permission.ReadCatalog, core_1.Permission.ReadAsset),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof core_1.RequestContext !== "undefined" && core_1.RequestContext) === "function" ? _c : Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], OriginalAssetDeliveryController.prototype, "get", null);
__decorate([
    (0, common_1.Head)(':filename'),
    (0, core_1.Allow)(core_1.Permission.ReadCatalog, core_1.Permission.ReadAsset),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof core_1.RequestContext !== "undefined" && core_1.RequestContext) === "function" ? _d : Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], OriginalAssetDeliveryController.prototype, "head", null);
OriginalAssetDeliveryController = __decorate([
    (0, common_1.Controller)('task-assets'),
    __metadata("design:paramtypes", [typeof (_a = typeof core_1.TransactionalConnection !== "undefined" && core_1.TransactionalConnection) === "function" ? _a : Object, typeof (_b = typeof core_1.ConfigService !== "undefined" && core_1.ConfigService) === "function" ? _b : Object])
], OriginalAssetDeliveryController);
let OriginalAssetDeliveryPlugin = class OriginalAssetDeliveryPlugin {
};
exports.OriginalAssetDeliveryPlugin = OriginalAssetDeliveryPlugin;
exports.OriginalAssetDeliveryPlugin = OriginalAssetDeliveryPlugin = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
        controllers: [OriginalAssetDeliveryController],
    })
], OriginalAssetDeliveryPlugin);
