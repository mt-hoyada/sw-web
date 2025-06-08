import { Request, Response } from 'express';
import { db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

// 배차 리포트 목록 조회
export const getDispatchReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, end } = req.query;
    const snapshot = await db.collection('dispatchReports').get();
    let reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // yyyy-MM-dd 형식만 허용
    const isValidDateId = (id: string) => /^\d{4}-\d{2}-\d{2}$/.test(id);

    if (start && end) {
      reports = reports
        .filter(r => isValidDateId(r.id))
        .filter(r => r.id >= start && r.id <= end);
    } else {
      reports = reports.filter(r => isValidDateId(r.id));
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// 특정 날짜의 행 목록 조회 (order 기준 정렬)
export const getDispatchRows = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
    const snapshot = await rowsCol.orderBy('order').get();
    const rows = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// 행 추가 (order/rowId 자동 관리)
export const addDispatchRow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    const rowData = req.body;
    const userId = rowData.userId;
    const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
    // order가 없으면 가장 큰 order+1000 자동 부여
    let order = rowData.order;
    if (order === undefined || order === null || order === 0) {
      const snap = await rowsCol.orderBy('order', 'desc').limit(1).get();
      if (!snap.empty) {
        order = (snap.docs[0].data().order || 0) + 1000;
      } else {
        order = 1000;
      }
    }
    // rowId/id 중복 없이 부여
    const now = Date.now();
    const rowId = rowData.id || rowData.rowId || `${date}_${now}_${Math.floor(Math.random()*10000)}`;
    const newRow = {
      ...rowData,
      id: rowId,
      rowId: rowId,
      order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await rowsCol.doc(rowId).set(newRow);
    // 실시간 동기화 신호 emit
    const io = req.app.locals.io;
    if (io) io.emit('rowsUpdated', { date, eventId: uuidv4(), userId });
    res.json({ success: true, id: rowId });
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// 행 삭제 (삭제 후 order 재정렬)
export const deleteDispatchRow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, rowId } = req.params;
    const userId = req.body?.userId;
    const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
    // 1. 해당 행 삭제
    await rowsCol.doc(rowId).delete();
    // 2. 남은 행들 order 기준 정렬 후 1000, 2000, 3000...으로 재정렬
    const snap = await rowsCol.orderBy('order').get();
    let batch = db.batch();
    let order = 1000;
    snap.forEach(docu => {
      batch.update(rowsCol.doc(docu.id), { order });
      order += 1000;
    });
    await batch.commit();
    // 실시간 동기화 신호 emit
    const io = req.app.locals.io;
    if (io) io.emit('rowsUpdated', { date, eventId: uuidv4(), userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// 거래처 목록 조회
export const getCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const docRef = db.collection('dispatch_company').doc('dis_company');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      res.json({ company: [] });
      return;
    }
    res.json(docSnap.data());
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// summary 조회
export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    const docRef = db.collection('dispatchReports').doc(date);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      res.json({});
      return;
    }
    res.json(docSnap.data());
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// summary 수정
export const updateSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    const updateData = req.body;
    const docRef = db.collection('dispatchReports').doc(date);
    await docRef.set({ ...updateData, updatedAt: new Date().toISOString() }, { merge: true });
    // 실시간 동기화 신호 emit
    const io = req.app.locals.io;
    if (io) io.emit('summaryUpdated', { date, eventId: uuidv4() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// 차량정보 목록 조회
export const getVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const docRef = db.collection('dispatch_vehicleNumber').doc('dispatch_vehicle');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      res.json([]);
      return;
    }
    const data = docSnap.data();
    if (data && Array.isArray(data.vehicleList)) {
      res.json(data.vehicleList);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// 행 수정(업데이트)
export const updateDispatchRow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, rowId } = req.params;
    const updateData = req.body;
    const userId = updateData.userId;
    console.log('[백엔드] 저장 요청', { date, rowId, updateData });
    const rowsCol = db.collection('dispatchReports').doc(date).collection('rows');
    const rowRef = rowsCol.doc(rowId);
    await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(rowRef);
      if (!docSnap.exists) throw new Error('ROW_NOT_FOUND');
      transaction.update(rowRef, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    });
    const io = req.app.locals.io;
    if (io) io.emit('rowsUpdated', { date, eventId: uuidv4(), userId });
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'ROW_NOT_FOUND') {
      res.status(404).json({ error: '해당 행이 존재하지 않습니다.' });
    } else {
      res.status(500).json({ error: '서버 오류' });
    }
  }
}; 