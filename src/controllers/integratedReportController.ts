import { Request, Response } from 'express';
import { db } from '../firebase';
import { io } from '../socket';
import { v4 as uuidv4 } from 'uuid';
// 날짜 범위 내 모든 rows 통합 조회
export const getIntegratedRows = async (req: Request, res: Response): Promise<void> => {
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
    res.json(allRows);
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
};

// 통합일보 행 수정
export const updateIntegratedRow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, date, userId, ...updateData } = req.body;
    if (!id || !date) {
      res.status(400).json({ error: 'id, date 필요' });
      return;
    }

    const rowRef = db.collection('dispatchReports').doc(date).collection('rows').doc(id);
    await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(rowRef);
      if (!docSnap.exists) throw new Error('ROW_NOT_FOUND');
      transaction.update(rowRef, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    });

    const docSnap = await rowRef.get();
    if (docSnap.exists) {
      io.emit('integrated-row-updated', { id, date, ...docSnap.data(), eventId: uuidv4(), userId });
      io.emit('rowsUpdated', { date, eventId: uuidv4(), userId });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'ROW_NOT_FOUND') {
      res.status(404).json({ error: '해당 행이 존재하지 않습니다.' });
    } else {
      res.status(500).json({ error: '서버 오류' });
    }
  }
}; 