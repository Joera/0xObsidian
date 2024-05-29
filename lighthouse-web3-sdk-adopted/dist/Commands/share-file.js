"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kleur_1 = require("kleur");
const ethers_1 = require("ethers");
const Lighthouse_1 = __importDefault(require("../Lighthouse"));
const readInput_1 = __importDefault(require("./utils/readInput"));
const getNetwork_1 = require("./utils/getNetwork");
const auth_1 = require("./utils/auth");
async function default_1(cid, address, _options) {
    if (!cid || !address) {
        console.log('\r\nlighthouse-web3 share-file <cid> <address>\r\n' +
            (0, kleur_1.green)('Description: ') +
            'Share access to other user\r\n');
    }
    else {
        try {
            if (!getNetwork_1.config.get('LIGHTHOUSE_GLOBAL_PUBLICKEY')) {
                throw new Error('Please import wallet first!');
            }
            // Get key
            const options = {
                prompt: 'Enter your password: ',
                silent: true,
                default: '',
            };
            const password = await (0, readInput_1.default)(options);
            const decryptedWallet = ethers_1.ethers.Wallet.fromEncryptedJsonSync(getNetwork_1.config.get('LIGHTHOUSE_GLOBAL_WALLET'), password?.trim());
            const signedMessage = await (0, auth_1.sign_auth_message)(decryptedWallet.privateKey);
            const shareResponse = await Lighthouse_1.default.shareFile(decryptedWallet.address, [address], cid, signedMessage);
            console.log((0, kleur_1.yellow)('sharedTo: ') +
                (0, kleur_1.white)(shareResponse.data.shareTo) +
                '\r\n' +
                (0, kleur_1.yellow)('cid: ') +
                (0, kleur_1.white)(shareResponse.data.cid));
        }
        catch (error) {
            console.log((0, kleur_1.red)(error.message));
            process.exit(0);
        }
    }
}
exports.default = default_1;