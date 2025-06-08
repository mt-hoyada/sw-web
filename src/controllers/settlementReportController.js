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
exports.getDriverSettlementRows = exports.getItemNames = exports.getCompanySettlementRows = exports.getCompanyList = exports.updateSettlementRow = exports.getSettlementRows = void 0;
const firebase_1 = require("../firebase");
const socket_1 = require("../socket");
const uuid_1 = require("uuid");
// 날짜 범위 내 모든 rows 통합 조회
const getSettlementRows = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // 빈행 필터링: date만 있고 vehicleNumber, route 모두 없는 행 제외
        allRows = allRows.filter(row => !(row.date && !row.vehicleNumber && !row.route));
        res.json(allRows);
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.getSettlementRows = getSettlementRows;
// 정산일보 행 수정
const updateSettlementRow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
                throw new Error('Row not found');
            transaction.update(rowRef, Object.assign(Object.assign({}, updateData), { updatedAt: new Date().toISOString() }));
        }));
        // Firestore에서 row 전체를 다시 읽어서 emit
        const docSnap = yield rowRef.get();
        if (docSnap.exists) {
            socket_1.io.emit('settlement-row-updated', Object.assign(Object.assign({ id, date }, docSnap.data()), { eventId: (0, uuid_1.v4)(), userId }));
            socket_1.io.emit('rowsUpdated', { date, eventId: (0, uuid_1.v4)(), userId });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});
exports.updateSettlementRow = updateSettlementRow;
// 거래처 목록 추출 (기간 내 중복 없이)
const getCompanyList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start, end, hasItemName } = req.query;
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
        let companySet = new Set();
        for (const date of dateList) {
            const rowsCol = firebase_1.db.collection('dispatchReports').doc(date).collection('rows');
            const snap = yield rowsCol.get();
            snap.forEach(docu => {
                const data = docu.data();
                if (hasItemName === 'true') {
                    if (data.company && data.itemName)
                        companySet.add(data.company);
                }
                else {
                    if (data.company)
                        companySet.add(data.company);
                }
            });
        }
        const companies = Array.from(companySet).sort();
        res.json(companies);
    }
    catch (error) {
        res.status(500).json({ error: '거래처 목록 조회 실패' });
    }
});
exports.getCompanyList = getCompanyList;
// 거래처별 정산 데이터 조회 (기간 내)
const getCompanySettlementRows = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company } = req.params;
        const { start, end } = req.query;
        if (!company || !start || !end) {
            res.status(400).json({ error: 'company, start, end 필요' });
            return;
        }
        // 날짜 형식 체크
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
        let result = [];
        for (const date of dateList) {
            const rowsCol = firebase_1.db.collection('dispatchReports').doc(date).collection('rows');
            const snap = yield rowsCol.get();
            snap.forEach(docu => {
                const data = docu.data();
                if (data.company === company) {
                    result.push(Object.assign(Object.assign({}, data), { id: docu.id, date }));
                }
            });
        }
        // 빈행 필터링: date만 있고 vehicleNumber, route 모두 없는 행 제외
        result = result.filter(row => !(row.date && !row.vehicleNumber && !row.route));
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: '정산 데이터 조회 실패' });
    }
});
exports.getCompanySettlementRows = getCompanySettlementRows;
const getItemNames = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company, start, end } = req.query;
        if (!company || !start || !end) {
            res.status(400).json({ error: 'company, start, end 필요' });
            return;
        }
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
        let itemNameSet = new Set();
        for (const date of dateList) {
            const rowsCol = firebase_1.db.collection('dispatchReports').doc(date).collection('rows');
            const snap = yield rowsCol.get();
            snap.forEach(docu => {
                const data = docu.data();
                if (data.company === company && data.itemName) {
                    itemNameSet.add(data.itemName);
                }
            });
        }
        const itemNames = Array.from(itemNameSet).sort();
        res.json(itemNames);
    }
    catch (error) {
        res.status(500).json({ error: '품명 목록 조회 실패' });
    }
});
exports.getItemNames = getItemNames;
// 기사명세서용 데이터 조회
const getDriverSettlementRows = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start, end, vehicles } = req.query;
        if (!start || !end || !vehicles) {
            res.status(400).json({ error: 'start, end, vehicles 쿼리 필요' });
            return;
        }
        const vehicleList = String(vehicles).split(',').map(v => v.trim()).filter(Boolean);
        if (vehicleList.length === 0) {
            res.json([]);
            return;
        }
        // 날짜 리스트 생성
        const startDate = new Date(String(start));
        const endDate = new Date(String(end));
        const dateList = [];
        let cur = new Date(startDate);
        while (cur <= endDate) {
            dateList.push(cur.toISOString().slice(0, 10));
            cur.setDate(cur.getDate() + 1);
        }
        // 각 차량별로 데이터 조회
        const result = {};
        for (const vehicle of vehicleList) {
            result[vehicle] = [];
            for (const date of dateList) {
                const rowsCol = firebase_1.db.collection('dispatchReports').doc(date).collection('rows');
                const snap = yield rowsCol.where('vehicleNumber', '==', vehicle).get();
                snap.forEach(docu => {
                    result[vehicle].push(Object.assign(Object.assign({}, docu.data()), { id: docu.id, date }));
                });
            }
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: '기사명세서 데이터 조회 실패' });
    }
});
exports.getDriverSettlementRows = getDriverSettlementRows;
