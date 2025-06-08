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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTemplate = exports.getTemplate = void 0;
const firebase_1 = require("../firebase");
// 템플릿 1건 조회
const getTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ error: 'id 필요' });
    const docRef = firebase_1.db.collection('settlement_template').doc(id);
    const snap = yield docRef.get();
    if (!snap.exists)
        return res.status(404).json({ error: 'not found' });
    res.json(Object.assign({ id }, snap.data()));
});
exports.getTemplate = getTemplate;
// 템플릿 저장/수정
const updateTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _a = req.body, { id } = _a, data = __rest(_a, ["id"]);
    if (!id)
        return res.status(400).json({ error: 'id 필요' });
    const docRef = firebase_1.db.collection('settlement_template').doc(id);
    yield docRef.set(Object.assign(Object.assign({}, data), { updatedAt: new Date().toISOString() }), { merge: true });
    res.json({ success: true });
});
exports.updateTemplate = updateTemplate;
