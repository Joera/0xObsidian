import { directoryFormData, singleFileFormData, singleFileFormDataFromPath, directoryFormDataStream, assembleFormData } from "./formdata.js";
//@ts-ignore
import electron from 'electron';
const net = electron.remote.net;
import Multipart from './multi-part-lite-adopted/main.js';
import fs from 'fs';


const fixEndpoint = (endpoint: string) => {
    return endpoint
        .replace(/^(https?:\/\/)/, '')  // Remove protocol if present
        .replace(/\/+$/, '');           // Remove trailing slashes
}


export const addRecursive = async (sourcePath: string, ipfs_endpoint: string, onlyHash: boolean = false): Promise<string> => {

        return new Promise( async (resolve,reject) => {

            console.log("addRecursive: " + ipfs_endpoint);

            const { formData, boundary } = await directoryFormData(sourcePath);

            const headers = {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            }

            const path = onlyHash ? 'api/v0/add?onlyHash=true' : 'api/v0/add'

            try {
                const request = net.request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: fixEndpoint(ipfs_endpoint),
                    port: 443,
                    path: path,
                    headers
                });

                request.on('response', (response: any) => {

                    response.on('data', (chunk: any) => {

                        const a = chunk.toString().split('\n');
                        let root = a[a.length -2];
                        let parsnip = JSON.parse(root);
                        resolve(parsnip["Hash"]);
                    });
                });
                request.on('error', (error: any) => {
                    console.log(`ERROR: ${JSON.stringify(error)}`)
                    resolve("");
                });
                // Write the binary buffer directly
                request.write(formData);
                request.end();

            } catch (error) {
                console.log(`ERROR: ${JSON.stringify(error)}`)
                resolve("");
            }

        });

    }   

export const addAsFolder = async (assets: any[], ipfs_endpoint: string, onlyHash: boolean = false): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        console.log("addRecursive: " + ipfs_endpoint);

        const { formData, boundary } = await assembleFormData(assets);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }

        const path = onlyHash ? 'api/v0/add?onlyHash=true' : 'api/v0/add'

        try {
            const request = net.request({
                method: 'POST',
                protocol: 'https:',
                hostname: fixEndpoint(ipfs_endpoint),
                port: 443,
                path: path,
                headers
            });

            request.on('response', (response: any) => {

                response.on('data', (chunk: any) => {

                    const a = chunk.toString().split('\n');
                    let root = a[a.length -2];
                    let parsnip = JSON.parse(root);
                    resolve(parsnip["Hash"]);
                });
            });
            request.on('error', (error: any) => {
                console.log(`ERROR: ${JSON.stringify(error)}`)
                resolve("");
            });
            // Write the binary buffer directly
            request.write(formData);
            request.end();

        } catch (error) {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            resolve("");
        }

    });

}   


export const get = async (cid: string, ipfs_endpoint: string) : Promise<Buffer> => {

    console.log("Getting " + cid);

        return new Promise( async (resolve,reject) => {
    
            const headers = {
                'Content-Type': `application/json`,
            }
    
            const request = net.request({
                method: 'POST',
                protocol: 'https:',
                hostname: fixEndpoint(ipfs_endpoint),
                path: `/api/v0/get?arg=${cid}`,
                headers
            });

            request.on('response', (response: any) => {
                response.on('data', (chunk: any) => {
                    const nodeBuffer = Buffer.from(chunk);
                    const configContent = nodeBuffer.toString();
                    const jsonStart = configContent.indexOf('{');
                    const jsonEnd = configContent.lastIndexOf('}') + 1;
                    if (jsonStart >= 0 && jsonEnd > jsonStart) {
                        const cleanConfigContent = configContent.slice(jsonStart, jsonEnd);
                        const parsedConfig = JSON.parse(cleanConfigContent);
                        resolve(parsedConfig);
                    } else {
                        reject();
                    } 
                });
            });

            request.on('error', (error: any) => {
                console.log(`ERROR: ${JSON.stringify(error)}`)
                reject();
            });
            request.end();
        });
    }

export const getRecursive = async (cid: string, ipfs_endpoint: string) : Promise<Buffer> => {

    return new Promise( async (resolve,reject) => {

        const headers = {
            'Content-Type': `application/json`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: fixEndpoint(ipfs_endpoint),
            path: `/api/v0/get?arg=${cid}&output=archive`,
            headers
        });
        request.on('response', (response: any) => {
        
            response.on('data', (chunk: any) => {
                const nodeBuffer = Buffer.from(chunk);
                resolve(nodeBuffer);
            });
        });
        request.on('error', (error: any) => {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            reject();
        });
        request.end();
    });
}

export const add = async (note: any, ipfs_endpoint: string): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const { formData, boundary } = await singleFileFormData(note);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }

        try {
            const request = net.request({
                method: 'POST',
                protocol: 'https:',
                hostname: fixEndpoint(ipfs_endpoint),
                port: 443,
                path: '/api/v0/add',
                headers
            });

            request.on('response', (response: any) => {

                response.on('data', (chunk: any) => {
                    const a = chunk.toString().split('\n');
                    let parsnip = JSON.parse(a[0]);
                    // console.log(parsnip)
                    resolve(parsnip["Hash"]);
                });
            });
            request.on('error', (error: any) => {
                console.log(`ERROR: ${JSON.stringify(error)}`)
                reject();
            });
            // Write the binary buffer directly
            request.write(formData);
            request.end();
        } catch (error) {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            reject();
        }
    });
};

export const addFile = async (path: any, ipfs_endpoint: string): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const formData = await singleFileFormDataFromPath(path);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: fixEndpoint(ipfs_endpoint),
            path: '/api/v0/add',
            headers
        });

      //  formData.pipe(request);

        request.on('response', (response: any) => {

            response.on('data', (chunk: any) => {
                const a = chunk.toString().split('\n');
                console.log(a);
                let parsnip = JSON.parse(a[0]);
                console.log(parsnip)
                resolve(parsnip["Hash"]);
            });
        });
        request.on('error', (error: any) => {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            reject();
        });
        // Write the binary buffer directly
        request.write(await formData.buffer());
        request.end();
    });
};

export const addFileFromUrl = async (url: any, ipfs_endpoint: string, onlyHash?: boolean): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const content = await fetch(url).then(r => r.arrayBuffer());

        console.log(content);

        const formData = await singleFileFormData(content);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        }

        const path = onlyHash ? 'api/v0/add?onlyHash=true' : 'api/v0/add'

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: fixEndpoint(ipfs_endpoint),
            path,
            headers
        });

      //  formData.pipe(request);

        request.on('response', (response: any) => {

            response.on('data', (chunk: any) => {
                const a = chunk.toString().split('\n');
                console.log(a);
                let parsnip = JSON.parse(a[0]);
                console.log(parsnip)
                resolve(parsnip["Hash"]);
            });
        });
        request.on('error', (error: any) => {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            reject();
        });
        // Write the binary buffer directly
        request.write(await formData.buffer());
        request.end();
    });
};

export const pinFile = async (path: any, ipfs_endpoint: string): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const formData = await singleFileFormDataFromPath(path);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: fixEndpoint(ipfs_endpoint) + '/cluster',
            path: '/api/v0/add',
            headers
        });

        request.on('response', (response: any) => {

            response.on('data', (chunk: any) => {
                const a = chunk.toString().split('\n');
                // console.log(a);
                let parsnip = JSON.parse(a[0]);
                console.log(parsnip)
                resolve(parsnip.cid);
            });
        });
        request.on('error', (error: any) => {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            reject();
        });
        // Write the binary buffer directly
        request.write(await formData.buffer());
        request.end();
    });
};

export const dagPut = async (note: any, ipfs_endpoint: string): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const { formData, boundary } = await singleFileFormData(note);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: fixEndpoint(ipfs_endpoint),
            path: '/api/v0/dag/put',
            headers
        });

        request.on('response', (response: any) => {
            response.on('data', (chunk: any) => {
                const a = chunk.toString().split('\n');
                let parsnip = JSON.parse(a[0]);
                resolve(parsnip["Cid"]["/"]);
            });
        });
        request.on('error', (error: any) => {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            reject();
        });
        // Write the binary buffer directly
        request.write(formData);
        request.end();
    });
};

export const dagGet = async (cid: string, ipfs_endpoint: string) : Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const headers = {
            'Content-Type': `application/json`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: fixEndpoint(ipfs_endpoint),
            path: `/api/v0/dag/get?arg=${cid}`,
            headers
        });
        request.on('response', (response: any) => {
        
            response.on('data', (chunk: any) => {
                const nodeBuffer = Buffer.from(chunk).toString();
                resolve(nodeBuffer);
            });
        });
        request.on('error', (error: any) => {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            reject();
        });
        request.end();
    });
}

export const addFilesInDir = async (files: string[], ipfs_endpoint: string): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        let form = new Multipart();

        for (let path of files) {
            const buffer = fs.createReadStream(path);
            form.append('file', buffer, {
                'filename': path.split('/').slice(-2).join('/')
            });
        }

        const formData = (await form.buffer());  
        const boundary =  form.getBoundary();

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: fixEndpoint(ipfs_endpoint),
            path: '/api/v0/add?recursive=true&wrap-with-directory=true',
            headers
        });
        request.on('response', (response: any) => {

            response.on('data', (chunk: any) => {
                const a = chunk.toString().split('\n').filter( (x: string) => x.length > 0 );
                console.log(a)
                let parsnip = JSON.parse(a[a.length - 1]);
               
                resolve(parsnip["Hash"]);
            });
        });
        request.on('error', (error: any) => {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            reject();
        });
        // Write the binary buffer directly
        request.write(formData);
        request.end();

       
    });
};
