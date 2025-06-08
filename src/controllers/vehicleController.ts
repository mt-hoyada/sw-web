import { Request, Response } from 'express';
import admin from 'firebase-admin';

// 차량번호 자동완성 검색 컨트롤러 (부분일치 지원)
export const searchVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.trim() === '') {
      res.json([]);
      return;
    }
    // 전체 차량 불러오기
    const snap = await admin.firestore()
      .collection('dispatch_vehicleNumber')
      .get();
    // 포함 검색 (부분일치)
    const filtered = snap.docs
      .map(doc => doc.data())
      .filter((v: any) =>
        v.vehicleNumber && v.vehicleNumber.includes(query)
      );
    res.json(filtered);
  } catch (error) {
    console.error('차량번호 자동완성 검색 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
}; 