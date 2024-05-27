"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* istanbul ignore file */
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const lighthouse_config_1 = require("../../../lighthouse.config");
const util_1 = require("../../utils/util");
// eslint-disable-next-line @typescript-eslint/no-empty-function
exports.default = async (formData, boundary, accessToken, multi, dealParameters, uploadProgressCallback) => {
    try {
        
        const endpoint = lighthouse_config_1.lighthouseConfig.lighthouseNode +
            `/api/v0/add?wrap-with-directory=${multi}`;

        // console.log(files);

        // (0, util_1.checkDuplicateFileNames)(files);
        // const formData = new form_data_1.default();
        // const boundary = Symbol();
        // for (let i = 0; i < files.length; i++) {
        //     formData.append('file', files[i]);
        // }
        const token = 'Bearer ' + accessToken;

        console.log(token);

        const response = await axios_1.default.post(endpoint, formData, {
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: {
                'Content-type': `multipart/form-data; boundary= ${boundary.toString()}`,
                Encryption: `${false}`,
                Authorization: token,
                'X-Deal-Parameter': dealParameters ? JSON.stringify(dealParameters) : 'null'
            },
            // onUploadProgress: function (progressEvent) {
            //     if (progressEvent.total) {
            //         const _progress = Math.round(progressEvent.loaded / progressEvent.total);
            //         uploadProgressCallback({
            //             progress: _progress,
            //             total: progressEvent.total,
            //             uploaded: progressEvent.loaded,
            //         });
            //     }
            // },
        });
        console.log(response);
        if (typeof response.data === 'string') {
            if (multi) {
                response.data = JSON.parse(`[${response.data.slice(0, -1)}]`.split('\n').join(','));
            }
            else {
                const temp = response.data.split('\n');
                response.data = JSON.parse(temp[temp.length - 2]);
            }
        }
        return { data: response.data };
    }
    catch (error) {
        console.log(error);
        throw new Error(error?.message);
    }
};