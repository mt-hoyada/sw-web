"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_1 = require("./socket");
const dispatchReport_1 = __importDefault(require("./routes/dispatchReport"));
const integratedReportRoutes_1 = __importDefault(require("./routes/integratedReportRoutes"));
const vehicleRoutes_1 = __importDefault(require("./routes/vehicleRoutes"));
const settlementReportRoutes_1 = __importDefault(require("./routes/settlementReportRoutes"));
const settlementTemplateRoutes_1 = __importDefault(require("./routes/settlementTemplateRoutes"));
const routeHistoryCacheRoutes_1 = __importDefault(require("./routes/routeHistoryCacheRoutes"));
const routeStatsCacheRoutes_1 = __importDefault(require("./routes/routeStatsCacheRoutes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
const server = http_1.default.createServer(app);
const io = (0, socket_1.initSocket)(server);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// io 인스턴스를 req.app.locals로 전달
app.use((req, res, next) => {
    req.app.locals.io = io;
    next();
});
// 라우터 등록
app.use('/api/dispatch-reports', dispatchReport_1.default);
app.use('/api/integrated-reports', integratedReportRoutes_1.default);
app.use('/api/dispatch-reports', vehicleRoutes_1.default);
app.use('/api/settlement-reports', settlementReportRoutes_1.default);
app.use('/api/settlement-template', settlementTemplateRoutes_1.default);
app.use('/api', routeHistoryCacheRoutes_1.default);
app.use('/api', routeStatsCacheRoutes_1.default);
app.get('/', (req, res) => {
    res.send('백엔드 서버가 정상적으로 동작 중입니다!');
});
server.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
