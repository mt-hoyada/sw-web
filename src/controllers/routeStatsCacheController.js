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
exports.buildRouteStatsCache = buildRouteStatsCache;
exports.getRouteStatsFromCache = getRouteStatsFromCache;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const db = firebase_admin_1.default.firestore();
function safeFirestoreId(str) {
    return (str || '').replace(/[\/.#$\[\]]/g, '_');
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
// 1. 통계 집계 및 저장 (관리자/배치용)
function buildRouteStatsCache(req, res, next) {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            // 1년치 날짜 리스트 생성
            const today = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(today.getFullYear() - 1);
            const dateList = [];
            let cur = new Date(oneYearAgo);
            while (cur <= today) {
                dateList.push(cur.toISOString().slice(0, 10));
                cur.setDate(cur.getDate() + 1);
            }
            // rows 모으기
            let rows = [];
            for (const date of dateList) {
                const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
                const snap = yield rowsCol.get();
                snap.forEach(docu => {
                    const data = docu.data();
                    // route, cargo 둘 다 없으면 건너뜀
                    if (!data.route && !data.cargo)
                        return;
                    rows.push(data);
                });
            }
            // route+cargo별 그룹핑
            const grouped = {};
            for (const row of rows) {
                const route = row.route || '';
                const cargo = row.cargo || '';
                if (!route && !cargo)
                    continue; // 둘 다 빈값이면 건너뜀
                const key = safeFirestoreId(`${route}|${cargo}`);
                if (!grouped[key])
                    grouped[key] = [];
                grouped[key].push(row);
            }
            // 각 그룹별 통계 계산 및 저장
            for (const [key, arr] of Object.entries(grouped)) {
                const [route, cargo] = key.split('|');
                const billingArr = arr.map(r => {
                    const v = Number(r.billingAmount);
                    return isNaN(v) ? 0 : v;
                });
                const paymentArr = arr.map(r => {
                    const v = Number(r.paymentAmount);
                    return isNaN(v) ? 0 : v;
                });
                const doc = {
                    route,
                    cargo,
                    billingMode: calcMode(billingArr),
                    paymentMode: calcMode(paymentArr),
                    billingMax: billingArr.length ? Math.max(...billingArr) : null,
                    paymentMax: paymentArr.length ? Math.max(...paymentArr) : null,
                    billingMin: billingArr.length ? Math.min(...billingArr) : null,
                    paymentMin: paymentArr.length ? Math.min(...paymentArr) : null,
                    count: arr.length,
                    updatedAt: new Date().toISOString(),
                };
                yield db.collection('routeStatsCache').doc(key).set(doc, { merge: true });
            }
            res.json({ ok: true, count: Object.keys(grouped).length });
        }
        catch (err) {
            console.error('[routeStatsCacheController] 통계 캐시 생성 실패:', err);
            res.status(500).json({ error: '통계 캐시 생성 실패' });
        }
    }))().catch(next);
}
// 2. route별 통계 조회 API
function getRouteStatsFromCache(req, res, next) {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const { route } = req.params;
            if (!route)
                return res.status(400).json({ error: 'route 필요' });
            const snap = yield db.collection('routeStatsCache').where('route', '==', route).get();
            if (snap.empty)
                return res.json({ route, stats: {} });
            const stats = {};
            snap.forEach(doc => {
                const data = doc.data();
                stats[data.cargo || '기타'] = {
                    billingMode: data.billingMode,
                    paymentMode: data.paymentMode,
                    billingMax: data.billingMax,
                    paymentMax: data.paymentMax,
                    billingMin: data.billingMin,
                    paymentMin: data.paymentMin,
                    count: data.count
                };
            });
            res.json({ route, stats });
        }
        catch (err) {
            res.status(500).json({ error: '서버 에러' });
        }
    }))().catch(next);
}
