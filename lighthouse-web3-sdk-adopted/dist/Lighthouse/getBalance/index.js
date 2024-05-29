"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const lighthouse_config_1 = require("../../lighthouse.config");
exports.default = async (apiKey) => {
    try {
        // Get users data usage
        const userDataUsage = (await axios_1.default.get(lighthouse_config_1.lighthouseConfig.lighthouseAPI +
            `/api/user/user_data_usage`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        })).data;
        /*
          return:
            { data: { dataLimit: 1073741824, dataUsed: 1062512300 } }
        */
        return { data: userDataUsage };
    }
    catch (error) {
        throw new Error(error.message);
    }
};
