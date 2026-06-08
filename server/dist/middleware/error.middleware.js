"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFound = notFound;
const unlogging_error_1 = __importDefault(require("@/utils/unlogging-error"));
function errorHandler(err, _req, res, _next) {
    if (err instanceof unlogging_error_1.default) {
        res.status(400).json({ success: false, field: err.field, message: err.message });
        return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error." });
}
function notFound(_req, res) { res.status(404).json({ success: false, message: "Route not found." }); }
