import { Request, Response } from 'express';
import admin from 'firebase-admin';
const db = admin.firestore();

function safeFirestoreId(str: string) {
  return (str || '').replace(/[\/\.#$\[\]]/g, '_');
}

function calcMode(arr: number[]) {
  if (arr.length === 0) return null;
  const freq: { [key: number]: number } = {};
  arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  let mode = arr[0], max = 0;
  for (const v of arr) {
    if (freq[v] > max) { mode = v; max = freq[v]; }
  }
  return mode;
}

// 1. 통계 집계 및 저장 (관리자/배치용)
export function buildRouteStatsCache(req: Request, res: Response, next: any) {
  (async () => {
    try {
      // 1년치 날짜 리스트 생성
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      const dateList: string[] = [];
      let cur = new Date(oneYearAgo);
      while (cur <= today) {
        dateList.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
      // rows 모으기
      let rows: any[] = [];
      for (const date of dateList) {
        const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
        const snap = await rowsCol.get();
        snap.forEach(docu => {
          const data = docu.data();
          if (!data.route && !data.cargo) return;
          rows.push(data);
        });
      }
      // route+cargo별 그룹핑
      const grouped: { [key: string]: any[] } = {};
      for (const row of rows) {
        const route = row.route || '';
        const cargo = row.cargo || '';
        if (!route && !cargo) continue;
        const key = safeFirestoreId(`${route}|${cargo}`);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      }
      // 각 그룹별 통계 계산 및 저장
      for (const [key, arr] of Object.entries(grouped)) {
        const [route, cargo] = key.split('|');
        const billingArr = arr
          .map(r => r.billingAmount)
          .filter(v => typeof v === 'number' && v > 0);
        const paymentArr = arr
          .map(r => r.paymentAmount)
          .filter(v => typeof v === 'number' && v > 0);
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
        await db.collection('routeStatsCache').doc(key).set(doc, { merge: true });
      }
      res.json({ ok: true, count: Object.keys(grouped).length });
    } catch (err) {
      res.status(500).json({ error: '통계 캐시 생성 실패' });
    }
  })().catch(next);
}

// 2. route별 통계 조회 API
export function getRouteStatsFromCache(req: Request, res: Response, next: any) {
  (async () => {
    try {
      const { route } = req.params;
      if (!route) {
        return res.status(400).json({ error: 'route 필요' });
      }
      const snap = await db.collection('routeStatsCache').where('route', '==', route).get();
      if (snap.empty) {
        return res.json({ route, stats: {} });
      }
      const stats: any = {};
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
    } catch (err) {
      res.status(500).json({ error: '서버 에러' });
    }
  })().catch(next);
} 