"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vehicleController_1 = require("../controllers/vehicleController");
const router = (0, express_1.Router)();
// 차량번호 자동완성 검색 API
// GET /api/dispatch-reports/vehicles/search?query=검색어
router.get('/vehicles/search', vehicleController_1.searchVehicle);
exports.default = router;
