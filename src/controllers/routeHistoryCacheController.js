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
exports.buildRouteHistoryCache = buildRouteHistoryCache;
exports.getRouteHistoryCacheByKey = getRouteHistoryCacheByKey;
exports.getRouteHistoryRowsByKey = getRouteHistoryRowsByKey;
exports.searchRouteHistoryCache = searchRouteHistoryCache;
exports.getRouteStatsByRoute = getRouteStatsByRoute;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const db = firebase_admin_1.default.firestore();
function safeFirestoreId(str) {
    // Firestore 문서ID 금지문자: / . # $ [ ]
    return (str || '').replace(/[\/.#$\[\]]/g, '_');
}
function makeRouteKey(row) {
    const routeKey = `${row.company}|${row.route}|${row.cargo}`;
    return safeFirestoreId(routeKey);
}
function makeVehicleRouteKey(row) {
    return safeFirestoreId(`${row.vehicleNumber}|${row.company}|${row.route}|${row.cargo}`);
}
function calcMode(arr) {
    if (arr.length === 0)
        return null;
    const freq = {};
    arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    let mode = arr[0], max = 0;
    for (const v of arr) {
        if (freq[v] > max) {
            mode = v;
            max = freq[v];
        }
    }
    return mode;
}
function buildRouteHistoryCache(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            // 1. 1년치 rows 쿼리 (firebase-admin 방식)
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const rowsSnap = yield db.collectionGroup('rows').get();
            const rows = [];
            rowsSnap.forEach(doc => {
                const data = doc.data();
                if (data.date >= oneYearAgo.toISOString().slice(0, 10)) {
                    rows.push(data);
                }
            });
            // 2. routeKey별 group by (기존 + 차량별)
            const grouped = {};
            for (const row of rows) {
                // 기존 방식
                const key1 = makeRouteKey(row); // company|route|cargo
                if (!grouped[key1])
                    grouped[key1] = [];
                grouped[key1].push(row);
                // 차량별 방식
                if (row.vehicleNumber) {
                    const key2 = makeVehicleRouteKey(row); // vehicleNumber|company|route|cargo
                    if (!grouped[key2])
                        grouped[key2] = [];
                    grouped[key2].push(row);
                }
            }
            // 3. 각 그룹별 통계 계산 및 캐시DB 저장
            for (const [routeKey, arr] of Object.entries(grouped)) {
                // 최신순 정렬
                arr.sort((a, b) => b.date.localeCompare(a.date));
                // routeKey가 차량단가인지 확인 (4개 파트로 split)
                const isVehicleRoute = routeKey.split('|').length === 4;
                // 청구운송비 또는 지불운송비 배열 선택
                const amountArr = isVehicleRoute
                    ? arr.map(r => r.paymentAmount).filter(Boolean) // 차량단가: 지불운송비
                    : arr.map(r => r.billingAmount).filter(Boolean); // 운송구간: 청구운송비
                const cacheDoc = {
                    vehicleNumber: (_a = arr[0].vehicleNumber) !== null && _a !== void 0 ? _a : '',
                    company: arr[0].company,
                    route: arr[0].route,
                    cargo: arr[0].cargo,
                    itemName: arr[0].itemName,
                    recentHistory: arr.slice(0, 20).map(r => ({
                        date: r.date,
                        company: r.company,
                        route: r.route,
                        cargo: r.cargo,
                        vehicleNumber: r.vehicleNumber,
                        billingAmount: r.billingAmount,
                        paymentAmount: r.paymentAmount,
                        driverName: r.driverName,
                    })),
                    avg: amountArr.length ? Math.round(amountArr.reduce((a, b) => a + b, 0) / amountArr.length) : 0,
                    mode: calcMode(amountArr),
                    min: amountArr.length ? Math.min(...amountArr) : 0,
                    max: amountArr.length ? Math.max(...amountArr) : 0,
                    count: arr.length,
                    lastUsed: arr[0].date,
                    updatedAt: new Date().toISOString(),
                };
                // Firestore에 저장
                yield db.collection('routeHistoryCache').doc(routeKey).set(cacheDoc, { merge: true });
            }
            res.json({ ok: true, count: Object.keys(grouped).length });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: '캐시 생성 실패' });
        }
    });
}
// 단건 조회: /api/route-history-cache/:routeKey
function getRouteHistoryCacheByKey(req, res) {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const { routeKey } = req.params;
            if (!routeKey)
                return res.status(400).json({ error: 'routeKey가 필요합니다.' });
            const db = (0, firestore_1.getFirestore)();
            const docRef = db.collection('routeHistoryCache').doc(routeKey);
            const doc = yield docRef.get();
            if (!doc.exists) {
                return res.status(404).json({ error: '해당 운송구간 이력 캐시가 없습니다.' });
            }
            return res.json(doc.data());
        }
        catch (err) {
            console.error('[routeHistoryCache 단건조회] 에러:', err);
            return res.status(500).json({ error: '서버 에러' });
        }
    }))();
}
// 페이징: /api/route-history-rows/:routeKey?startAfter=날짜&limit=20
function getRouteHistoryRowsByKey(req, res) {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const { routeKey } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            const startAfter = req.query.startAfter;
            console.log('[API] routeKey:', routeKey, 'limit:', limit, 'startAfter:', startAfter);
            // routeKey 파싱
            const parts = routeKey.split('|');
            let query = db.collectionGroup('rows');
            if (parts.length === 4) {
                // 차량단가: vehicleNumber|company|route|cargo
                const [vehicleNumber, company, route, cargo] = parts;
                console.log('[API] 차량단가 쿼리:', { vehicleNumber, company, route, cargo });
                query = query
                    .where('vehicleNumber', '==', vehicleNumber)
                    .where('company', '==', company)
                    .where('route', '==', route)
                    .where('cargo', '==', cargo);
            }
            else if (parts.length === 3) {
                // 운송구간: company|route|cargo
                const [company, route, cargo] = parts;
                console.log('[API] 운송구간 쿼리:', { company, route, cargo });
                query = query
                    .where('company', '==', company)
                    .where('route', '==', route)
                    .where('cargo', '==', cargo);
            }
            else {
                return res.status(400).json({ error: 'routeKey 파싱 실패' });
            }
            // 항상 1년치 데이터 조회
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            console.log('[API] oneYearAgo:', oneYearAgo.toISOString().slice(0, 10));
            query = query
                .where('date', '>=', oneYearAgo.toISOString().slice(0, 10))
                .orderBy('date', 'desc')
                .orderBy('id', 'desc');
            if (startAfter) {
                const [startAfterDate, startAfterId] = startAfter.split('|');
                console.log('[API] startAfter split:', startAfterDate, startAfterId);
                query = query.startAfter(startAfterDate, startAfterId);
            }
            const rowsSnap = yield query.limit(limit).get();
            const rows = rowsSnap.docs.map(doc => doc.data());
            console.log('[API] 쿼리 결과 row 수:', rows.length, rows.map(r => ({ date: r.date, id: r.id })));
            res.json(rows);
        }
        catch (err) {
            console.error('[routeHistoryRows 페이징] 에러:', err);
            res.status(500).json({ error: '서버 에러' });
        }
    }))();
}
// 운송구간 부분 문자열로 검색: /api/route-history-cache/search?route=운송구간&offset=0&limit=20
function searchRouteHistoryCache(req, res, next) {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const { route, offset = 0, limit = 20 } = req.query;
            if (!route)
                return res.status(400).json({ error: 'route 필요' });
            const docs = yield db.collection('routeHistoryCache').listDocuments();
            const matched = [];
            for (const docRef of docs) {
                if (docRef.id.includes(String(route))) {
                    const doc = yield docRef.get();
                    if (doc.exists)
                        matched.push(Object.assign({ id: docRef.id }, doc.data()));
                }
            }
            // 최신순 정렬 (lastUsed 기준)
            matched.sort((a, b) => (b.lastUsed || '').localeCompare(a.lastUsed || ''));
            const paged = matched.slice(Number(offset), Number(offset) + Number(limit));
            res.json({ results: paged, total: matched.length });
        }
        catch (err) {
            res.status(500).json({ error: '서버 에러' });
        }
    }))().catch(next);
}
// 운송구간+차종별 통계 API: /api/route-history-cache/stats/:route
function getRouteStatsByRoute(req, res, next) {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const { route } = req.params;
            if (!route)
                return res.status(400).json({ error: 'route 필요' });
            const snap = yield db.collection('routeHistoryCache')
                .where('route', '==', route)
                .where('vehicleNumber', '==', '')
                .get();
            if (snap.empty)
                return res.json({ route, stats: {} });
            // 차종별 그룹핑
            const byCargo = {};
            snap.forEach(doc => {
                const data = doc.data();
                const cargo = data.cargo || '기타';
                if (!byCargo[cargo])
                    byCargo[cargo] = [];
                byCargo[cargo].push(data);
            });
            // 차종별 통계 집계
            const stats = {};
            for (const cargo of Object.keys(byCargo)) {
                const arr = byCargo[cargo];
                const billingArr = arr.map(r => {
                    const v = Number(r.billingAmount);
                    return isNaN(v) ? 0 : v;
                });
                const paymentArr = arr.map(r => {
                    const v = Number(r.paymentAmount);
                    return isNaN(v) ? 0 : v;
                });
                stats[cargo] = {
                    billingMode: calcMode(billingArr),
                    paymentMode: calcMode(paymentArr),
                    billingMax: billingArr.length ? Math.max(...billingArr) : null,
                    paymentMax: paymentArr.length ? Math.max(...paymentArr) : null,
                    billingMin: billingArr.length ? Math.min(...billingArr) : null,
                    paymentMin: paymentArr.length ? Math.min(...paymentArr) : null,
                    count: arr.length
                };
            }
            res.json({ route, stats });
        }
        catch (err) {
            res.status(500).json({ error: '서버 에러' });
        }
    }))().catch(next);
}
