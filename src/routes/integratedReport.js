"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const integratedReportController_1 = require("../controllers/integratedReportController");
const router = (0, express_1.Router)();
router.get('/', integratedReportController_1.getIntegratedRows);
exports.default = router;
