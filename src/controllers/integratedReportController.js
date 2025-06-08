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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIntegratedRow = exports.getIntegratedRows = void 0;
const firebase_1 = require("../firebase");
const socket_1 = require("../socket");
const uuid_1 = require("uuid");
// 날짜 범위 내 모든 rows 통합 조회
const getIntegratedRows = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            res.status(400).json({ error: 'start, end 쿼리 필요' });
            return;
        }
        // YYYY-MM-DD 형식 체크
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(String(start)) || !dateRegex.test(String(end))) {
            res.status(400).json({ error: '날짜 형식이 올바르지 않습니다.' });
            return;
        }
        const startDate = new Date(String(start));
        const endDate = new Date(String(end));
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
            res.json([]);
            return;
        }
        const dateList = [];
        let cur = new Date(startDate);
        while (cur <= endDate) {
            dateList.push(cur.toISOString().slice(0, 10));
            cur.setDate(cur.getDate() + 1);
        }
        let allRows = [];
        for (const date of dateList) {
            const rowsCol = firebase_1.db.collection('dispatchReports').doc(date).collection('rows');
            const snap = yield rowsCol.get();
            snap.forEach(docu => {
                allRows.push(Object.assign(Object.assign({}, docu.data()), { id: docu.id, date }));
            });
        }
        res.json(allRows);
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.getIntegratedRows = getIntegratedRows;
// 통합일보 행 수정
const updateIntegratedRow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { id, date, userId } = _a, updateData = __rest(_a, ["id", "date", "userId"]);
        if (!id || !date) {
            res.status(400).json({ error: 'id, date 필요' });
            return;
        }
        const rowRef = firebase_1.db.collection('dispatchReports').doc(date).collection('rows').doc(id);
        yield firebase_1.db.runTransaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
            const docSnap = yield transaction.get(rowRef);
            if (!docSnap.exists)
                throw new Error('ROW_NOT_FOUND');
            transaction.update(rowRef, Object.assign(Object.assign({}, updateData), { updatedAt: new Date().toISOString() }));
        }));
        const docSnap = yield rowRef.get();
        if (docSnap.exists) {
            socket_1.io.emit('integrated-row-updated', Object.assign(Object.assign({ id, date }, docSnap.data()), { eventId: (0, uuid_1.v4)(), userId }));
            socket_1.io.emit('rowsUpdated', { date, eventId: (0, uuid_1.v4)(), userId });
        }
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
exports.updateIntegratedRow = updateIntegratedRow;
