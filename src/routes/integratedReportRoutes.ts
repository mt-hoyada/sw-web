import express from 'express';
import { getIntegratedRows, updateIntegratedRow } from '../controllers/integratedReportController';

const router = express.Router();

router.get('/', getIntegratedRows);
router.post('/update', updateIntegratedRow);

export default router; 