"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const lighthouse_config_1 = require("../../../lighthouse.config");
exports.default = async (blob, apiKey, mimeType = '') => {
    try {
        const token = 'Bearer ' + apiKey;
        const endpoint = lighthouse_config_1.lighthouseConfig.lighthouseNode + '/api/v0/add';
        // Upload file
        const formData = new form_data_1.default();
        formData.append('file', blob);
        const boundary = Symbol();
        const response = await axios_1.default.post(endpoint, formData, {
            withCredentials: false,
            maxContentLength: Infinity, //this is needed to prevent axios from erroring out with large directories
            maxBodyLength: Infinity,
            headers: {
                'Content-type': `multipart/form-data; boundary= ${boundary.toString()}`,
                Encryption: 'false',
                'Mime-Type': mimeType,
                Authorization: token,
            },
        });
        return { data: response.data };
    }
    catch (error) {
        throw new Error(error?.message);
    }
};