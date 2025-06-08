import express from 'express';
import cors from 'cors';
import http from 'http';
import { initSocket } from './socket';
import dispatchReportRouter from './routes/dispatchReport';
import integratedReportRouter from './routes/integratedReportRoutes';
import vehicleRouter from './routes/vehicleRoutes';
import settlementReportRoutes from './routes/settlementReportRoutes';
import settlementTemplateRoutes from './routes/settlementTemplateRoutes';
import routeHistoryCacheRoutes from './routes/routeHistoryCacheRoutes';
import routeStatsCacheRoutes from './routes/routeStatsCacheRoutes';
import dotenv from 'dotenv';
import { admin } from './firebase';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const server = http.createServer(app);
const io = initSocket(server);

// CORS 환경변수 적용
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// io 인스턴스를 req.app.locals로 전달
app.use((req, res, next) => {
  req.app.locals.io = io;
  next();
});

// 라우터 등록
app.use('/api/dispatch-reports', dispatchReportRouter);
app.use('/api/integrated-reports', integratedReportRouter);
app.use('/api/dispatch-reports', vehicleRouter);
app.use('/api/settlement-reports', settlementReportRoutes);
app.use('/api/settlement-template', settlementTemplateRoutes);
app.use('/api', routeHistoryCacheRoutes);
app.use('/api', routeStatsCacheRoutes);

app.get('/', (req, res) => {
  res.send('백엔드 서버가 정상적으로 동작 중입니다!');
});

server.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});