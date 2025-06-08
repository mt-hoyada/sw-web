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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDispatchRow = exports.getVehicles = exports.updateSummary = exports.getSummary = exports.getCompanies = exports.deleteDispatchRow = exports.addDispatchRow = exports.getDispatchRows = exports.getDispatchReports = void 0;
const firebase_1 = require("../firebase");
const uuid_1 = require("uuid");
// 배차 리포트 목록 조회
const getDispatchReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start, end } = req.query;
        const snapshot = yield firebase_1.db.collection('dispatchReports').get();
        let reports = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // yyyy-MM-dd 형식만 허용
        const isValidDateId = (id) => /^\d{4}-\d{2}-\d{2}$/.test(id);
        if (start && end) {
            reports = reports
                .filter(r => isValidDateId(r.id))
                .filter(r => r.id >= start && r.id <= end);
        }
        else {
            reports = reports.filter(r => isValidDateId(r.id));
        }
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.getDispatchReports = getDispatchReports;
// 특정 날짜의 행 목록 조회 (order 기준 정렬)
const getDispatchRows = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.params;
        const rowsCol = firebase_1.db.collection('dispatchReports').doc(date).collection('rows');
        const snapshot = yield rowsCol.orderBy('order').get();
        const rows = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.getDispatchRows = getDispatchRows;
// 행 추가 (order/rowId 자동 관리)
const addDispatchRow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.params;
        const rowData = req.body;
        const userId = rowData.userId;
        const rowsCol = firebase_1.db.collection('dispatchReports').doc(date).collection('rows');
        // order가 없으면 가장 큰 order+1000 자동 부여
        let order = rowData.order;
        if (order === undefined || order === null || order === 0) {
            const snap = yield rowsCol.orderBy('order', 'desc').limit(1).get();
            if (!snap.empty) {
                order = (snap.docs[0].data().order || 0) + 1000;
            }
            else {
                order = 1000;
            }
        }
        // rowId/id 중복 없이 부여
        const now = Date.now();
        const rowId = rowData.id || rowData.rowId || `${date}_${now}_${Math.floor(Math.random() * 10000)}`;
        const newRow = Object.assign(Object.assign({}, rowData), { id: rowId, rowId: rowId, order, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        yield rowsCol.doc(rowId).set(newRow);
        // 실시간 동기화 신호 emit
        const io = req.app.locals.io;
        if (io)
            io.emit('rowsUpdated', { date, eventId: (0, uuid_1.v4)(), userId });
        res.json({ success: true, id: rowId });
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.addDispatchRow = addDispatchRow;
// 행 삭제 (삭제 후 order 재정렬)
const deleteDispatchRow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { date, rowId } = req.params;
        const userId = (_a = req.body) === null || _a === void 0 ? void 0 : _a.userId;
        const rowsCol = firebase_1.db.collection('dispatchReports').doc(date).collection('rows');
        // 1. 해당 행 삭제
        yield rowsCol.doc(rowId).delete();
        // 2. 남은 행들 order 기준 정렬 후 1000, 2000, 3000...으로 재정렬
        const snap = yield rowsCol.orderBy('order').get();
        let batch = firebase_1.db.batch();
        let order = 1000;
        snap.forEach(docu => {
            batch.update(rowsCol.doc(docu.id), { order });
            order += 1000;
        });
        yield batch.commit();
        // 실시간 동기화 신호 emit
        const io = req.app.locals.io;
        if (io)
            io.emit('rowsUpdated', { date, eventId: (0, uuid_1.v4)(), userId });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.deleteDispatchRow = deleteDispatchRow;
// 거래처 목록 조회
const getCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docRef = firebase_1.db.collection('dispatch_company').doc('dis_company');
        const docSnap = yield docRef.get();
        if (!docSnap.exists) {
            res.json({ company: [] });
            return;
        }
        res.json(docSnap.data());
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.getCompanies = getCompanies;
// summary 조회
const getSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.params;
        const docRef = firebase_1.db.collection('dispatchReports').doc(date);
        const docSnap = yield docRef.get();
        if (!docSnap.exists) {
            res.json({});
            return;
        }
        res.json(docSnap.data());
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.getSummary = getSummary;
// summary 수정
const updateSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.params;
        const updateData = req.body;
        const docRef = firebase_1.db.collection('dispatchReports').doc(date);
        yield docRef.set(Object.assign(Object.assign({}, updateData), { updatedAt: new Date().toISOString() }), { merge: true });
        // 실시간 동기화 신호 emit
        const io = req.app.locals.io;
        if (io)
            io.emit('summaryUpdated', { date, eventId: (0, uuid_1.v4)() });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.updateSummary = updateSummary;
// 차량정보 목록 조회
const getVehicles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docRef = firebase_1.db.collection('dispatch_vehicleNumber').doc('dispatch_vehicle');
        const docSnap = yield docRef.get();
        if (!docSnap.exists) {
            res.json([]);
            return;
        }
        const data = docSnap.data();
        if (data && Array.isArray(data.vehicleList)) {
            res.json(data.vehicleList);
        }
        else {
            res.json([]);
        }
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.getVehicles = getVehicles;
// 행 수정(업데이트)
const updateDispatchRow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, rowId } = req.params;
        const updateData = req.body;
        const userId = updateData.userId;
        console.log('[백엔드] 저장 요청', { date, rowId, updateData });
        const rowsCol = firebase_1.db.collection('dispatchReports').doc(date).collection('rows');
        const rowRef = rowsCol.doc(rowId);
        yield firebase_1.db.runTransaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
            const docSnap = yield transaction.get(rowRef);
            if (!docSnap.exists)
                throw new Error('ROW_NOT_FOUND');
            transaction.update(rowRef, Object.assign(Object.assign({}, updateData), { updatedAt: new Date().toISOString() }));
        }));
        const io = req.app.locals.io;
        if (io)
            io.emit('rowsUpdated', { date, eventId: (0, uuid_1.v4)(), userId });
        res.json({ success: true });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'ROW_NOT_FOUND') {
            res.status(404).json({ error: '해당 행이 존재하지 않습니다.' });
        }
        else {
            res.status(500).json({ error: '서버 오류' });
        }
    }
});
exports.updateDispatchRow = updateDispatchRow;
