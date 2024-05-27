"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kleur_1 = require("kleur");
const fs_1 = __importDefault(require("fs"));
const ethers_1 = require("ethers");
const axios_1 = __importDefault(require("axios"));
const Lighthouse_1 = __importDefault(require("../Lighthouse"));
const readInput_1 = __importDefault(require("./utils/readInput"));
const lighthouse_config_1 = require("../lighthouse.config");
const getNetwork_1 = require("./utils/getNetwork");
const auth_1 = require("./utils/auth");
async function default_1(cid, dynamicData = {}) {
    try {
        if (!getNetwork_1.config.get('LIGHTHOUSE_GLOBAL_PUBLICKEY')) {
            throw new Error('Please import wallet first!');
        }
        // get file details
        const fileDetails = (await axios_1.default.get(lighthouse_config_1.lighthouseConfig.lighthouseAPI + '/api/lighthouse/file_info?cid=' + cid)).data;
        if (!fileDetails) {
            throw new Error('Unable to get CID details.');
        }
        // Get key
        const options = {
            prompt: 'Enter your password: ',
            silent: true,
            default: '',
        };
        const password = await (0, readInput_1.default)(options);
        const decryptedWallet = ethers_1.ethers.Wallet.fromEncryptedJsonSync(getNetwork_1.config.get('LIGHTHOUSE_GLOBAL_WALLET'), password.trim());
        const signedMessage = await (0, auth_1.sign_auth_message)(decryptedWallet.privateKey);
        const fileEncryptionKey = await Lighthouse_1.default.fetchEncryptionKey(cid, decryptedWallet.address, signedMessage, dynamicData);
        // Decrypt
        const decryptedFile = await Lighthouse_1.default.decryptFile(cid, fileEncryptionKey.data.key ? fileEncryptionKey.data.key : '');
        // save file
        fs_1.default.createWriteStream(fileDetails.fileName).write(Buffer.from(decryptedFile));
    }
    catch (error) {
        console.log((0, kleur_1.red)(error.message));
        process.exit(0);
    }
}
exports.default = default_1;