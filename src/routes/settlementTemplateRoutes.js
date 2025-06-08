"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settlementTemplateController_1 = require("../controllers/settlementTemplateController");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = express_1.default.Router();
router.get('/:id', (0, asyncHandler_1.asyncHandler)(settlementTemplateController_1.getTemplate));
router.post('/update', (0, asyncHandler_1.asyncHandler)(settlementTemplateController_1.updateTemplate));
exports.default = router;
