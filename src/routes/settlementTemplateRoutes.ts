import express from 'express';
import { getTemplate, updateTemplate } from '../controllers/settlementTemplateController';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.get('/:id', asyncHandler(getTemplate));
router.post('/update', asyncHandler(updateTemplate));

export default router; 