"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walk = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const basePathConvert_1 = __importDefault(require("../../utils/basePathConvert"));
const lighthouse_config_1 = require("../../../lighthouse.config");
async function walk(dir) {
    const { readdir, stat } = eval(`require`)('fs-extra');
    let results = [];
    const files = await readdir(dir);
    for (const file of files) {
        const filePath = `${dir}/${file}`;
        const _stat = await stat(filePath);
        if (_stat.isDirectory()) {
            results = results.concat(await walk(filePath));
        }
        else {
            results.push(filePath);
        }
    }
    return results;
}
exports.walk = walk;
exports.default = async (sourcePath, apiKey, multi, dealParameters) => {
    const { createReadStream, lstatSync } = eval(`require`)('fs-extra');
    const path = eval(`require`)('path');
    const token = 'Bearer ' + apiKey;
    const stats = lstatSync(sourcePath);
    try {
        const endpoint = lighthouse_config_1.lighthouseConfig.lighthouseNode +
            `/api/v0/add?wrap-with-directory=${multi}`;
        if (stats.isFile()) {
            //we need to create a single read stream instead of reading the directory recursively
            const data = new form_data_1.default();
            data.append('file', createReadStream(sourcePath));
            const response = await axios_1.default.post(endpoint, data, {
                withCredentials: true,
                maxContentLength: Infinity, //this is needed to prevent axios from erroring out with large directories
                maxBodyLength: Infinity,
                headers: {
                    'Content-type': `multipart/form-data; boundary= ${data.getBoundary()}`,
                    Encryption: 'false',
                    Authorization: token,
                    'X-Deal-Parameter': dealParameters ? JSON.stringify(dealParameters) : 'null'
                },
            });
            if (multi) {
                const temp = response.data.split('\n');
                response.data = JSON.parse(temp[temp.length - 2]);
            }
            return { data: response.data };
        }
        else {
            const files = await walk(sourcePath);
            const data = new form_data_1.default();
            files.forEach((file) => {
                //for each file stream, we need to include the correct relative file path
                data.append('file', createReadStream(file), multi
                    ? {
                        filename: path.basename(file),
                    }
                    : {
                        filepath: (0, basePathConvert_1.default)(sourcePath, file),
                    });
            });
            const response = await axios_1.default.post(endpoint, data, {
                withCredentials: true,
                maxContentLength: Infinity,
                maxBodyLength: Infinity, //this is needed to prevent axios from erroring out with large directories
                headers: {
                    'Content-type': `multipart/form-data; boundary= ${data.getBoundary()}`,
                    Encryption: 'false',
                    Authorization: token,
                    'X-Deal-Parameter': dealParameters ? JSON.stringify(dealParameters) : 'null'
                },
            });
            if (typeof response.data === 'string') {
                if (multi) {
                    response.data = JSON.parse(`[${response.data.slice(0, -1)}]`.split('\n').join(','));
                }
                else {
                    const temp = response.data.split('\n');
                    response.data = JSON.parse(temp[temp.length - 2]);
                }
            }
            /*
              {
                data: {
                  Name: 'flow1.png',
                  Hash: 'QmUHDKv3NNL1mrg4NTW4WwJqetzwZbGNitdjr2G6Z5Xe6s',
                  Size: '31735'
                }
              }
            */
            return { data: response.data };
        }
    }
    catch (error) {
        throw new Error(error.message);
    }
};