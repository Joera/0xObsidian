"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const browser_1 = __importDefault(require("./browser"));
const node_1 = __importDefault(require("./node"));
exports.default = async (cid, fileEncryptionKey, mimeType = 'null') => {
    // Upload File to IPFS
    //@ts-ignore
    if (typeof window === "undefined") {
        return await (0, node_1.default)(cid, fileEncryptionKey);
    }
    else {
        return await (0, browser_1.default)(cid, fileEncryptionKey, mimeType);
    }
};