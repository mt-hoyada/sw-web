import express from 'express';
import { buildRouteHistoryCache, getRouteHistoryCacheByKey, getRouteHistoryRowsByKey, searchRouteHistoryCache, getRouteStatsByRoute } from '../controllers/routeHistoryCacheController';

const router = express.Router();

router.post('/build-route-cache', buildRouteHistoryCache);

// 운송구간 부분 문자열 검색 (순서 위로 이동)
router.get('/route-history-cache/search', searchRouteHistoryCache);

// 운송구간+차종별 통계
router.get('/route-history-cache/stats/:route', getRouteStatsByRoute);

// 단건 조회
router.get('/route-history-cache/:routeKey', getRouteHistoryCacheByKey);

router.get('/route-history-rows/:routeKey', getRouteHistoryRowsByKey);

export default router; 