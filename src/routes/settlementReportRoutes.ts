import express from 'express';
import { getSettlementRows, updateSettlementRow, getCompanyList, getCompanySettlementRows, getItemNames, getDriverSettlementRows } from '../controllers/settlementReportController';

const router = express.Router();

router.get('/', getSettlementRows);
router.post('/update', updateSettlementRow);
router.get('/companies', getCompanyList);
router.get('/company/:company', getCompanySettlementRows);
router.get('/itemNames', getItemNames);
router.get('/driver', getDriverSettlementRows);

export default router; 