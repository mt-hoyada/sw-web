import { Router } from 'express';
import {
  getDispatchReports,
  getDispatchRows,
  addDispatchRow,
  deleteDispatchRow,
  getCompanies,
  getSummary,
  updateSummary,
  getVehicles,
  updateDispatchRow
} from '../controllers/dispatchReportController';

const router = Router();

router.get('/', getDispatchReports);
router.get('/companies', getCompanies);
router.get('/vehicles', getVehicles);
router.get('/:date/summary', getSummary);
router.put('/:date/summary', updateSummary);
router.get('/:date/rows', getDispatchRows);
router.post('/:date/rows', addDispatchRow);
router.delete('/:date/rows/:rowId', deleteDispatchRow);
router.post('/:date/rows/:rowId', updateDispatchRow);

export default router; 