"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routeHistoryCacheController_1 = require("../controllers/routeHistoryCacheController");
const router = express_1.default.Router();
router.post('/build-route-cache', routeHistoryCacheController_1.buildRouteHistoryCache);
// 운송구간 부분 문자열 검색 (순서 위로 이동)
router.get('/route-history-cache/search', routeHistoryCacheController_1.searchRouteHistoryCache);
// 운송구간+차종별 통계
router.get('/route-history-cache/stats/:route', routeHistoryCacheController_1.getRouteStatsByRoute);
// 단건 조회
router.get('/route-history-cache/:routeKey', routeHistoryCacheController_1.getRouteHistoryCacheByKey);
router.get('/route-history-rows/:routeKey', routeHistoryCacheController_1.getRouteHistoryRowsByKey);
exports.default = router;
