"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchVehicle = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
// 차량번호 자동완성 검색 컨트롤러 (부분일치 지원)
const searchVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string' || query.trim() === '') {
            res.json([]);
            return;
        }
        // 전체 차량 불러오기
        const snap = yield firebase_admin_1.default.firestore()
            .collection('dispatch_vehicleNumber')
            .get();
        // 포함 검색 (부분일치)
        const filtered = snap.docs
            .map(doc => doc.data())
            .filter((v) => v.vehicleNumber && v.vehicleNumber.includes(query));
        res.json(filtered);
    }
    catch (error) {
        console.error('차량번호 자동완성 검색 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.searchVehicle = searchVehicle;
