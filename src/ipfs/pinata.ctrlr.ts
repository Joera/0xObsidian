import { MainController } from "src/main.ctrlr.js";
import { calculateIPFSHash, calculateIPFSHashFromContent, upload } from "./pinata.factory.js";
import * as fs from 'fs';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
import {PinataSDK } from "pinata-web3";
import { CID } from 'multiformats/cid';
import { Readable } from 'stream';

export class PinataService  {

    main: MainController;
    pinata: PinataSDK;

    constructor(main: MainController) {
        this.main = main;
        // console.log("jwt",this.main.plugin.settings.pinata_jwt);
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
            const hash = await calculateIPFSHash(filePath);
                const v0 = CID.parse(hash);
                return v0.toV1().toString();
        }

        const fileName = path.basename(filePath);
        const fileExt = path.extname(filePath).toLowerCase();

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
            const protocol = url.startsWith('https:') ? https : http;
            
            // For GitHub CSS files, we need to set proper headers
            const options: any = {};
            if (url.includes('raw.githubusercontent.com') && url.endsWith('.css')) {
                options.headers = {
                    'Accept': 'text/css,*/*;q=0.1',  // Prefer CSS content type
                    'User-Agent': 'Mozilla/5.0'  // GitHub requires a user agent
                };
            }
            
            const request = protocol.get(url, options, (response: any) => {
                const contentType = response.headers['content-type'];
                const chunks: Buffer[] = [];

                response.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                response.on('end', () => {
                    const data = Buffer.concat(chunks);
                    
                    // For GitHub raw content, if it's a CSS file but served as text/plain,
                    // override the content type
                    let finalContentType = contentType;
                    if (url.includes('raw.githubusercontent.com') && 
                        url.endsWith('.css') && 
                        contentType?.includes('text/plain')) {
                        finalContentType = 'text/css';
                    }
                    
                    resolve({ data, contentType: finalContentType });
                });

                response.on('error', (error: any) => {
                    reject(error);
                });
            });

            request.on('error', (error: any) => {
                reject(error);
            });

            // Add timeout to prevent hanging
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Request timed out after 30 seconds'));
            });
        });
    }

    getContentType(fileExt: string, mimeType?: string): string {
        // Get content type based on file extension
        const getExtensionType = (ext: string): string => {
            switch (ext.toLowerCase()) {
                case '.css':
                    return 'text/css';
                case '.jpg':
                case '.jpeg':
                    return 'image/jpeg';
                case '.png':
                    return 'image/png';
                case '.gif':
                    return 'image/gif';
                case '.svg':
                    return 'image/svg+xml';
                case '.webp':
                    return 'image/webp';
                case '.html':
                    return 'text/html';
                case '.js':
                    return 'application/javascript';
                case '.json':
                    return 'application/json';
                case '.txt':
                    return 'text/plain';
                default:
                    return 'application/octet-stream';
            }
        };

        const extensionType = getExtensionType(fileExt);
        
        // If we have a file extension type, use that instead of mimeType
        if (extensionType !== 'application/octet-stream') {
            return extensionType;
        }

        // If no specific extension type, fallback to mimeType or default
        return mimeType || 'application/octet-stream';
    }

    async uploadFileFromUrl(url: string, onlyHash: boolean = false, cid_version: number = 0): Promise<string> {
        try {
            const { data, contentType: responseMimeType } = await this.fetchUrl(url);
            const fileName = path.basename(url);
            const fileExt = path.extname(url).toLowerCase();
            const contentType = this.getContentType(fileExt, responseMimeType);
            
            if (onlyHash) {
                const hash = await calculateIPFSHashFromContent(data, fileName, contentType);
                const cid = CID.parse(hash);
                return cid_version === 0 ? hash : cid.toV1().toString();
            }

            // Create a temporary file and ensure data is a Buffer
            const tmpFile = path.join(os.tmpdir(), fileName);
            const buffer = Buffer.from(data);
            await fs.promises.writeFile(tmpFile, buffer);

            try {
                // Use the raw upload function that we know works
                const formData = new FormData();
                formData.append('file', new Blob([buffer], { type: contentType }), fileName);

                // Make direct request to Pinata API
                const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.main.plugin.settings.pinata_jwt}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Pinata upload failed: ${response.statusText}`);
                }

                const result = await response.json();
                console.log("hash", result.IpfsHash);

                // The hash should already be in CIDv0 format (Qm...)
                if (cid_version === 0) {
                    return result.IpfsHash;
                } else {
                    // Convert to v1 if requested
                    const cid = CID.parse(result.IpfsHash);
                    return cid.toV1().toString();
                }
            } finally {
                // Clean up the temporary file
                try {
                    await fs.promises.unlink(tmpFile);
                } catch (cleanupError) {
                    console.error('Error cleaning up temp file:', cleanupError);
                }
            }
          
        } catch (error) {
            console.error('Error uploading file from URL:', error);
            throw error; // Better to throw than return a hardcoded CID
        }
    }

    async uploadFileFromContent(filePath: string, data: string, onlyHash: boolean = false): Promise<string> {
        try {
            if (onlyHash) {
                console.log("onlyHash data length:", data.length);
                const hash = await calculateIPFSHashFromContent(data);
                const v0 = CID.parse(hash);
                return v0.toV1().toString();
            }

            console.log("upload data length:", data.length);
            const fileName = path.basename(filePath);
            const fileExt = path.extname(fileName).toLowerCase();
            const contentType = this.getContentType(fileExt);
            console.log("contentType before upload:", contentType);
            const file = new File([data], fileName, { type: contentType });
            console.log("upload file size:", file.size);
            const upload = await this.pinata.upload.file(file);
            return upload.IpfsHash;

        } catch (error) {
            console.error('Error uploading file from content:', error);
            throw error; // Better to throw than return a hardcoded CID
        }
    }

    
}