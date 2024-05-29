"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const lighthouse_config_1 = require("../../../../lighthouse.config");
const kavach_1 = require("@lighthouse-web3/kavach");
const encryptionNode_1 = require("../../encryptionNode");
const node_1 = require("../../../upload/files/node");
exports.default = async (sourcePath, apiKey, publicKey, auth_token) => {
    const FormData = eval('require')('form-data');
    const fs = eval('require')('fs-extra');
    const token = 'Bearer ' + apiKey;
    const endpoint = lighthouse_config_1.lighthouseConfig.lighthouseNode + '/api/v0/add?wrap-with-directory=false';
    const stats = fs.lstatSync(sourcePath);
    if (stats.isFile()) {
        try {
            // Upload file
            const formData = new FormData();
            const { masterKey: fileEncryptionKey, keyShards } = await (0, kavach_1.generate)();
            const fileData = fs.readFileSync(sourcePath);
            const encryptedData = await (0, encryptionNode_1.encryptFile)(fileData, fileEncryptionKey);
            formData.append('file', Buffer.from(encryptedData), sourcePath.replace(/^.*[\\/]/, ''));
            const response = await axios_1.default.post(endpoint, formData, {
                withCredentials: true,
                maxContentLength: Infinity, //this is needed to prevent axios from erroring out with large directories
                maxBodyLength: Infinity,
                headers: {
                    'Content-type': `multipart/form-data; boundary= ${formData.getBoundary()}`,
                    Encryption: 'true',
                    Authorization: token,
                },
            });
            const { error } = await (0, kavach_1.saveShards)(publicKey, response.data.Hash, auth_token, keyShards);
            if (error) {
                throw new Error('Error encrypting file');
            }
            return { data: [response.data] };
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    else {
        const files = await (0, node_1.walk)(sourcePath);
        const formData = new FormData();
        if (files.length > 1 && auth_token.startsWith("0x")) {
            throw new Error(JSON.stringify(`auth_token must be a JWT`));
        }
        let keyMap = {};
        await Promise.all(files.map(async (file) => {
            // const mimeType = mime.lookup(file)
            const { masterKey: fileEncryptionKey, keyShards } = await (0, kavach_1.generate)();
            const fileData = fs.readFileSync(file);
            const encryptedData = await (0, encryptionNode_1.encryptFile)(fileData, fileEncryptionKey);
            const filename = file.slice(sourcePath.length + 1).replaceAll('/', '-');
            await formData.append('file', Buffer.from(encryptedData), filename);
            keyMap = { ...keyMap, [filename]: keyShards };
            return [filename, keyShards];
        }));
        const token = 'Bearer ' + apiKey;
        const endpoint = lighthouse_config_1.lighthouseConfig.lighthouseNode + '/api/v0/add?wrap-with-directory=false';
        const response = await axios_1.default.post(endpoint, formData, {
            withCredentials: true,
            maxContentLength: Infinity, //this is needed to prevent axios from erroring out with large directories
            maxBodyLength: Infinity,
            headers: {
                'Content-type': `multipart/form-data; boundary= ${formData.getBoundary()}`,
                Encryption: 'true',
                Authorization: token,
            },
        });
        const jsondata = JSON.parse(`[${response.data.slice(0, -1)}]`.split('\n').join(','));
        const savedKey = await Promise.all(jsondata.map(async (data) => {
            return (0, kavach_1.saveShards)(publicKey, data.Hash, auth_token, keyMap[data.Name]);
        }));
        savedKey.forEach((_savedKey) => {
            if (!_savedKey.isSuccess) {
                throw new Error(JSON.stringify(_savedKey));
            }
        });
        return { data: jsondata };
    }
};