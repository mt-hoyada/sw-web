"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routeStatsCacheController_1 = require("../controllers/routeStatsCacheController");
const router = express_1.default.Router();
// 통계 캐시 생성 (관리자/배치용)
router.post('/route-stats-cache/build', routeStatsCacheController_1.buildRouteStatsCache);
// route별 통계 조회
router.get('/route-stats-cache/:route', routeStatsCacheController_1.getRouteStatsFromCache);
exports.default = router;
