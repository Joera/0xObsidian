import { IEVMProvider, OrbisConnectResult, OrbisDB } from "@useorbis/db-sdk";
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import { ethers } from "ethers";
import { IMainController } from "src/main.ctrlr.js";

export interface IOrbisService {
    sdk: OrbisDB;
    initialize(privateKey: string): Promise<void>;
    insert(contentItem: any, model: string, context?: string): Promise<any>;
    update(contentItem: any, rowId: string): Promise<any>;
    createModel(modelDefinition: any): Promise<any>;
}

export class OrbisService implements IOrbisService {
    sdk!: OrbisDB;
    private main: IMainController;
    private isAuthenticated: boolean = false;

    constructor(main: IMainController) {
        this.main = main;
    }

    async initialize(privateKey: string) {
        try {
            this.sdk = new OrbisDB({
                ceramic: {
                    gateway: "https://ceramic.transport-union.dev"
                },
                nodes: [{
                    gateway: "https://orbis.transport-union.dev"
                }]
            });

            const provider = new ethers.Wallet(privateKey) as unknown as IEVMProvider;
            const auth = new OrbisEVMAuth(provider);

            const authResult: OrbisConnectResult = await this.sdk.connectUser({ auth });
            
            if (!authResult) {
                throw new Error('Failed to authenticate with Orbis');
            }

            this.isAuthenticated = true;
            console.log('Orbis authentication successful:', authResult);
        } catch (error) {
            console.error('Failed to initialize Orbis:', error);
            this.isAuthenticated = false;
            throw error;
        }
    }

    async insert(contentItem: any, model: string, context?: string) {

        // console.log("model: ", model);
        
        try {
            if (!this.sdk?.ceramic) {
                throw new Error('Orbis not properly initialized. Make sure to call initialize() first.');
            }

            if (!this.isAuthenticated) {
                throw new Error('Not authenticated with Orbis. Make sure to initialize() first.');
            }

            const insertStatement = this.sdk
                .insert(model)
                .value(contentItem);

            if (context) {
                insertStatement.context(context);
            }
        
            const validation = await insertStatement.validate();
            
            if (!validation.valid) {
                const errorInfo = {
                    field: 'root',
                    message: validation.error,
                    value: contentItem
                };
                throw new Error(`Validation failed: ${JSON.stringify(errorInfo)}`);
            }

            const result = await insertStatement.run();
            console.log('Insert successful:', result);
            return result;
        } catch (error) {
            console.error('Error during insert operation:', error);
            throw error;
        }
    }

    async update(contentItem: any, rowId: string) {
        const updateStatement = this.sdk
            .update(rowId)
            .replace(contentItem);

        try {
            const result = await updateStatement.run();
            console.log("orbis_update_result: ", result);
            return result;
        } catch (error) {
            console.error('Error during update operation:', error);
            throw error;
        }
    }


    async createModel(modelDefinition: any) {
        try {
            const model = await this.sdk.ceramic.createModel(modelDefinition);
            console.log(model);
            return model;
        } catch (error) {
            console.error("Error creating blockchain data model:", error);
            throw error;
        }
    }
}