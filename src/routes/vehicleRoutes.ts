import { Router } from 'express';
import { searchVehicle } from '../controllers/vehicleController';

const router = Router();

// 차량번호 자동완성 검색 API
// GET /api/dispatch-reports/vehicles/search?query=검색어
router.get('/vehicles/search', searchVehicle);

export default router; 