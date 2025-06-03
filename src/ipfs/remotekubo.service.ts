import { directoryFormData, singleFileFormData, singleFileFormDataFromPath, directoryFormDataStream, assembleFormData } from "./formdata.js";
//@ts-ignore
import electron from 'electron';
const net = electron.remote.net;
import * as https from 'https';
import Multipart from './multi-part-lite-adopted/main.js';
import fs from 'fs';
import path from "path";



const fixEndpoint = (endpoint: string) => {
    return endpoint
        .replace(/^(https?:\/\/)/, '')  // Remove protocol if present
        .replace(/\/+$/, '');           // Remove trailing slashes
}


export const addRecursive = async (sourcePath: string, ipfs_endpoint: string, onlyHash: boolean = false): Promise<string> => {

        return new Promise( async (resolve,reject) => {

            // console.log("addRecursive: " + ipfs_endpoint);

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

export const getJsonLike = async (cid: string, ipfs_endpoint: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let resolved = false;

    const headers = {
      // No need for JSON content type; IPFS get returns raw data
    };

    const request = https.request({
      method: 'POST',
      protocol: 'https:',
      hostname: fixEndpoint(ipfs_endpoint),
      path: `/api/v0/cat?arg=${cid}`,
      headers,
    });

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      response.on('end', () => {
        if (!resolved) {
          resolved = true;
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString('utf-8'); // Convert buffer to string
          resolve(JSON.parse(text));  
        }
      });

      response.on('aborted', () => {
        console.log("aborted");
        if (!resolved) {
          resolved = true;
          reject(new Error('Response aborted'));
        }
      });

      response.on('error', (err) => {
        console.log("error");
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });
    });

    request.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        reject(error);
      }
    });

    request.end();
  });
};


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

export const add = async (note: any, ipfs_endpoint: string, onlyHash?: boolean): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const noteBuffer = Buffer.from(JSON.stringify(note));
        const { formData, boundary } = await singleFileFormData(note.slug || note.name || note.path ||"nft", noteBuffer);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }

        const apiPath = onlyHash ? 'api/v0/add?onlyHash=true' : 'api/v0/add';

        // console.log(`https://${fixEndpoint(ipfs_endpoint)}/${apiPath}`);

        try {
            const request = net.request({
                method: 'POST',
                protocol: 'https:',
                hostname: fixEndpoint(ipfs_endpoint),
                port: 443,
                path: apiPath,
                headers
            });

            request.on('response', (response: any) => {

                response.on('data', (chunk: any) => {
                    const a = chunk.toString().split('\n');
                    // console.log(a);
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
                // console.log(a);
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
        request.write(await formData.buffer());
        request.end();
    });
};

export const addFileFromUrl = async (url: any, ipfs_endpoint: string, onlyHash?: boolean): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const arrayBuffer = await fetch(url).then(r => r.arrayBuffer());
        const content = Buffer.from(arrayBuffer);

        const filename = path.basename(url);

        const { formData, boundary } = await singleFileFormData(filename, content);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }

        const apiPath = onlyHash ? 'api/v0/add?onlyHash=true' : 'api/v0/add';



        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: fixEndpoint(ipfs_endpoint),
            path: apiPath,
            headers
        });

      //  formData.pipe(request);

        request.on('response', (response: any) => {

            response.on('data', (chunk: any) => {
                const a = chunk.toString().split('\n');
                // console.log(a);
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
                // console.log(parsnip)
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

        const noteBuffer = Buffer.from(JSON.stringify(note));
        const { formData, boundary } = await singleFileFormData(note.slug || note.name || note.path ||"nft", noteBuffer);

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
                // console.log(a)
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
