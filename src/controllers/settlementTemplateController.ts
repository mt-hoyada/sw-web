import { Request, Response } from 'express';
import { db } from '../firebase';

// 템플릿 1건 조회
export const getTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id 필요' });
  const docRef = db.collection('settlement_template').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) return res.status(404).json({ error: 'not found' });
  res.json({ id, ...snap.data() });
};

// 템플릿 저장/수정
export const updateTemplate = async (req: Request, res: Response) => {
  const { id, ...data } = req.body;
  if (!id) return res.status(400).json({ error: 'id 필요' });
  const docRef = db.collection('settlement_template').doc(id);
  await docRef.set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
  res.json({ success: true });
}; 