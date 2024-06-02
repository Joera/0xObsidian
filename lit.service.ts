import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { LitNetwork } from "@lit-protocol/constants";
import { IMainController } from "main.ctrlr";
import { Notice } from "obsidian";
import * as po from './hardhat/artifacts/contracts/Pod.sol/Pod.json';

export interface ILitService {
    litNodeClient: any;
    connect: () => void;
    createAccessFile: (name: string, pod_addr: string) => void;
    readAccessFile: (name: string) => Promise<void>;
}

export class LitService implements ILitService {

    main: IMainController
    litNodeClient: any;

    constructor(main: IMainController) {
        this.main = main;
    }

    async connect() {
        this.litNodeClient = new LitJsSdk.LitNodeClient({
          litNetwork: LitNetwork.Cayenne,
        });
        await this.litNodeClient.connect();
    }

    async createAccessFile (name: string, pod_addr: string) {

        const filePath = name + '/' + '_access.md';
        const content = "";

        try {
            let file;
            const fileExists = await this.main.plugin.app.vault.adapter.exists(filePath);
            if (!fileExists) {
                file =  await this.main.plugin.app.vault.create(filePath, content);

                const abi = po.abi;
                const functionAbi  = abi.find((item) => item.name === "getReaders" && item.type === 'function');

                const returnValueTest = {
                    comparator: "contains",
                    value: "userAddress"
                }

                if (file != null) {
                    await this.main.plugin.app.fileManager.processFrontMatter( file, (frontmatter) => {
                        frontmatter["contract_address"] = pod_addr;
                        frontmatter["functionName"] = "getReaders";
                        frontmatter["functionParams"] = '[":userAddress"]';
                        frontmatter["functionAbi"] = JSON.stringify(functionAbi, null, 0);
                        frontmatter["chain"] = "arbitrum-sepolia"
                        frontmatter["returnValueTest"] = JSON.stringify(returnValueTest,null,0);
                    })
                }
                // new Notice(`${filePath} created successfully.`);
            } else {
                file = await this.main.plugin.app.vault.getFileByPath(filePath);
                // new Notice(`${filePath} already exists.`);
            }
        } catch (error) {
            console.error(`Error creating access file: ${error}`);
            new Notice(`Failed to create access file: ${error.message}`);
        }
    }

    async readAccessFile (name: string) {

        function parseJSONOrRetainString(str: string) {
            try {
              return JSON.parse(str);
            } catch (e) {
              return str;
            }
          }

        let filePath = name + '/' + '_access.md';

        const access_conditions: any = {}

        const file = this.main.plugin.app.vault.getFileByPath(filePath)
        if (file != null) {
            await this.main.plugin.app.fileManager.processFrontMatter( file, (frontmatter) => {
                
                Object.keys(frontmatter).forEach ((key: string) => {
                    access_conditions[key] = parseJSONOrRetainString(frontmatter[key])
                });
            });
        }

        console.log(access_conditions)
    }


}