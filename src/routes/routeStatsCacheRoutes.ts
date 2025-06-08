import express from 'express';
import { buildRouteStatsCache, getRouteStatsFromCache } from '../controllers/routeStatsCacheController';

const router = express.Router();

console.log('[routeStatsCacheRoutes] 라우터 초기화 시작');

// 통계 캐시 생성 (관리자/배치용)
router.post('/route-stats-cache/build', (req, res, next) => {
  console.log('==========================================');
  console.log('[routeStatsCacheRoutes] POST /route-stats-cache/build 요청 수신됨!');
  console.log('[routeStatsCacheRoutes] 요청 URL:', req.originalUrl);
  console.log('[routeStatsCacheRoutes] 요청 메소드:', req.method);
  console.log('[routeStatsCacheRoutes] 요청 헤더:', req.headers);
  console.log('[routeStatsCacheRoutes] 요청 바디:', req.body);
  console.log('==========================================');
  buildRouteStatsCache(req, res, next);
});

// route별 통계 조회
router.get('/route-stats-cache/:route', (req, res, next) => {
  console.log('==========================================');
  console.log('[routeStatsCacheRoutes] GET /route-stats-cache/:route 요청 수신됨!');
  console.log('[routeStatsCacheRoutes] 요청 URL:', req.originalUrl);
  console.log('[routeStatsCacheRoutes] 요청 메소드:', req.method);
  console.log('[routeStatsCacheRoutes] 요청 파라미터:', req.params);
  console.log('[routeStatsCacheRoutes] 요청 쿼리:', req.query);
  console.log('==========================================');
  getRouteStatsFromCache(req, res, next);
});

console.log('[routeStatsCacheRoutes] 라우터 초기화 완료');

export default router; 