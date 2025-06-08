"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settlementReportController_1 = require("../controllers/settlementReportController");
const router = express_1.default.Router();
router.get('/', settlementReportController_1.getSettlementRows);
router.post('/update', settlementReportController_1.updateSettlementRow);
router.get('/companies', settlementReportController_1.getCompanyList);
router.get('/company/:company', settlementReportController_1.getCompanySettlementRows);
router.get('/itemNames', settlementReportController_1.getItemNames);
router.get('/driver', settlementReportController_1.getDriverSettlementRows);
exports.default = router;
