import { Request, Response } from 'express';
import { db } from '../firebase';
import { io } from '../socket';
import { v4 as uuidv4 } from 'uuid';
// 날짜 범위 내 모든 rows 통합 조회
export const getSettlementRows = async (req: Request, res: Response): Promise<void> => {
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
    const dateList: string[] = [];
    let cur = new Date(startDate);
    while (cur <= endDate) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    let allRows: any[] = [];
    for (const date of dateList) {
      const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
      const snap = await rowsCol.get();
      snap.forEach(docu => {
        allRows.push({ ...docu.data(), id: docu.id, date });
      });
    }
    // 빈행 필터링: date만 있고 vehicleNumber, route 모두 없는 행 제외
    allRows = allRows.filter(row => !(row.date && !row.vehicleNumber && !row.route));
    res.json(allRows);
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// 정산일보 행 수정
export const updateSettlementRow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, date, userId, ...updateData } = req.body;
    if (!id || !date) {
      res.status(400).json({ error: 'id, date 필요' });
      return;
    }

    const rowRef = db.collection('dispatchReports').doc(date).collection('rows').doc(id);
    await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(rowRef);
      if (!docSnap.exists) throw new Error('Row not found');
      transaction.update(rowRef, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    });

    // Firestore에서 row 전체를 다시 읽어서 emit
    const docSnap = await rowRef.get();
    if (docSnap.exists) {
      io.emit('settlement-row-updated', { id, date, ...docSnap.data(), eventId: uuidv4(), userId });
      io.emit('rowsUpdated', { date, eventId: uuidv4(), userId });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// 거래처 목록 추출 (기간 내 중복 없이)
export const getCompanyList = async (req: Request, res: Response) => {
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
    const dateList: string[] = [];
    let cur = new Date(startDate);
    while (cur <= endDate) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    let companySet = new Set<string>();
    for (const date of dateList) {
      const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
      const snap = await rowsCol.get();
      snap.forEach(docu => {
        const data = docu.data();
        if (hasItemName === 'true') {
          if (data.company && data.itemName) companySet.add(data.company);
        } else {
          if (data.company) companySet.add(data.company);
        }
      });
    }
    const companies = Array.from(companySet).sort();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: '거래처 목록 조회 실패' });
  }
};

// 거래처별 정산 데이터 조회 (기간 내)
export const getCompanySettlementRows = async (req: Request, res: Response) => {
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
    const dateList: string[] = [];
    let cur = new Date(startDate);
    while (cur <= endDate) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    let result: any[] = [];
    for (const date of dateList) {
      const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
      const snap = await rowsCol.get();
      snap.forEach(docu => {
        const data = docu.data();
        if (data.company === company) {
          result.push({ ...data, id: docu.id, date });
        }
      });
    }
    // 빈행 필터링: date만 있고 vehicleNumber, route 모두 없는 행 제외
    result = result.filter(row => !(row.date && !row.vehicleNumber && !row.route));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '정산 데이터 조회 실패' });
  }
};

export const getItemNames = async (req: Request, res: Response) => {
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
    const dateList: string[] = [];
    let cur = new Date(startDate);
    while (cur <= endDate) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    let itemNameSet = new Set<string>();
    for (const date of dateList) {
      const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
      const snap = await rowsCol.get();
      snap.forEach(docu => {
        const data = docu.data();
        if (data.company === company && data.itemName) {
          itemNameSet.add(data.itemName);
        }
      });
    }
    const itemNames = Array.from(itemNameSet).sort();
    res.json(itemNames);
  } catch (error) {
    res.status(500).json({ error: '품명 목록 조회 실패' });
  }
};

// 기사명세서용 데이터 조회
export const getDriverSettlementRows = async (req: Request, res: Response) => {
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
    const dateList: string[] = [];
    let cur = new Date(startDate);
    while (cur <= endDate) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    // 각 차량별로 데이터 조회
    const result: { [vehicle: string]: any[] } = {};
    for (const vehicle of vehicleList) {
      result[vehicle] = [];
      for (const date of dateList) {
        const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
        const snap = await rowsCol.where('vehicleNumber', '==', vehicle).get();
        snap.forEach(docu => {
          result[vehicle].push({ ...docu.data(), id: docu.id, date });
        });
      }
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '기사명세서 데이터 조회 실패' });
  }
}; 