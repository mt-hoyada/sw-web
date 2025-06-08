"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const integratedReportController_1 = require("../controllers/integratedReportController");
const router = express_1.default.Router();
router.get('/', integratedReportController_1.getIntegratedRows);
router.post('/update', integratedReportController_1.updateIntegratedRow);
exports.default = router;
