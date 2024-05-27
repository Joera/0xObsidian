"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* istanbul ignore file */
const getBalance_1 = __importDefault(require("../getBalance"));
const node_1 = require("../upload/files/node");
// Function return cost and file metadata
const getCosting = async (path, apiKey) => {
    const fs = eval(`require`)('fs-extra');
    const mime = eval(`require`)('mime-types');
    // Get users data usage
    const user_data_usage = (await (0, getBalance_1.default)(apiKey)).data;
    if (fs.lstatSync(path).isDirectory()) {
        // Get metadata and cid for all files
        const sources = await (0, node_1.walk)(path);
        const metaData = [];
        let totalSize = 0;
        for (let i = 0; i < sources.length; i++) {
            const stats = fs.statSync(sources[i]);
            const mimeType = mime.lookup(sources[i]);
            const fileSizeInBytes = stats.size;
            const fileName = sources[i].split('/').pop();
            totalSize += fileSizeInBytes;
            metaData.push({
                fileSize: fileSizeInBytes,
                mimeType: mimeType,
                fileName: fileName,
            });
        }
        // Return data
        return {
            data: {
                metaData: metaData,
                dataLimit: user_data_usage.dataLimit,
                dataUsed: user_data_usage.dataUsed,
                totalSize: totalSize,
            },
        };
    }
    else {
        const stats = fs.statSync(path);
        const mimeType = mime.lookup(path);
        const fileSizeInBytes = stats.size;
        const fileName = path.split('/').pop();
        // return response data
        const metaData = [
            {
                fileSize: fileSizeInBytes,
                mimeType: mimeType,
                fileName: fileName,
            },
        ];
        return {
            data: {
                metaData: metaData,
                dataLimit: user_data_usage.dataLimit,
                dataUsed: user_data_usage.dataUsed,
                totalSize: fileSizeInBytes,
            },
        };
    }
};
exports.default = async (path, apiKey) => {
    try {
        return await getCosting(path, apiKey);
    }
    catch (error) {
        throw new Error(error.message);
    }
};