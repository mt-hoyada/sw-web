import { Router } from 'express';
import { getIntegratedRows } from '../controllers/integratedReportController';

const router = Router();

router.get('/', getIntegratedRows);

export default router; 