import { MainController } from "src/main.ctrlr.js";
import { calculateIPFSHash, calculateIPFSHashFromContent, upload } from "./pinata.factory.js";
import * as fs from 'fs';
//@ts-ignore
import electron from 'electron';
const net = electron.remote.net;
import * as path from 'path';
import {PinataSDK } from "pinata-web3";



export class PinataService  {

    main: MainController;
    pinata: PinataSDK;

    constructor(main: MainController) {
        this.main = main;
        this.pinata = new PinataSDK({
            pinataJwt: this.main.plugin.settings.pinata_jwt,
            pinataGateway: "neutralpress.mypinata.cloud"
        });
    }
    // using internal net.request and formdata 
    // couldnt get contentype txt/css to work 
    async upload(filePath: string, onlyHash: boolean = false): Promise<string> {
        return await upload(this.main, filePath, onlyHash);
    }

    uploadFileFromPath = async (filePath: string, onlyHash: boolean = false) => {

        if (onlyHash) {
            return await calculateIPFSHash(filePath);
        }

        const fileName = path.basename(filePath);
        const fileExt = path.extname(filePath).toLowerCase();

        console.log("fileName", fileName);

        let contentType = 'text/plain';
        switch (fileExt) {
            case '.css':
                contentType = 'text/css';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
        }

        console.log("contentType", contentType);

        try {

          const blob = new Blob([fs.readFileSync(filePath)]);
          const file = new File([blob], fileName, { type: contentType });
          const upload = await this.pinata.upload.file(file);
          return upload.IpfsHash;
      
        } catch (error) {
          console.log(error);
          return "QmUrU11u74YrLbj9d1Z9JvPPZ2nXmgMVTgh2ZvjrTUc4ZQ";
        }
    }

    async fetchUrl(url: string): Promise<{ data: Buffer; contentType?: string }> {
        return new Promise((resolve, reject) => {
            
            const request = net.request(url);
            
            request.on('response', (response: any) => {
            
                const contentType = response.headers['content-type'];

                response.on('data', (chunk: Buffer) => {
        
                    const data = chunk;
                    resolve({ data, contentType });
                });
            });

            request.on('error', (error: any) => {
                reject(error);
            });

            request.end();
        });
    }

    getContentType(fileExt: string, mimeType?: string): string {
        // If we have a mime type from response headers, use that
        if (mimeType) return mimeType;

        // Fallback to extension-based detection
        switch (fileExt) {
            case '.css':
                return 'text/css';
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.gif':
                return 'image/gif';
            default:
                return 'application/octet-stream'; // safer default for unknown types
        }
    }

    async uploadFileFromUrl(url: string, onlyHash: boolean = false): Promise<string> {
        try {
            const { data, contentType: responseMimeType } = await this.fetchUrl(url);

            if (onlyHash) {
                return await calculateIPFSHashFromContent(data.toString('hex'));
            }

            const fileName = path.basename(url);
            const fileExt = path.extname(url).toLowerCase();
            const contentType = this.getContentType(fileExt, responseMimeType);
            console.log("contentType:", contentType);

            const file = new File([data], fileName, { type: contentType });
            const upload = await this.pinata.upload.file(file);
            console.log("upload:", upload);
            return upload.IpfsHash;
          
        } catch (error) {
            console.error('Error uploading file from URL:', error);
            throw error; // Better to throw than return a hardcoded CID
        }
    }

    async uploadFileFromContent(filePath: string, data: string, onlyHash: boolean = false): Promise<string> {
        try {
            if (onlyHash) {
                return await calculateIPFSHashFromContent(data);
            }

            const fileName = path.basename(filePath);
            const fileExt = path.extname(fileName).toLowerCase();
            const contentType = this.getContentType(fileExt);
            const file = new File([data], fileName, { type: contentType });
            const upload = await this.pinata.upload.file(file);
            return upload.IpfsHash;

        } catch (error) {
            console.error('Error uploading file from content:', error);
            throw error; // Better to throw than return a hardcoded CID
        }
    }

    
}