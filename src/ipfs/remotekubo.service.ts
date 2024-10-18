import { directoryFormData, singleFileFormData, singleFileFormDataFromPath } from "./formdata";
//@ts-ignore
import electron from 'electron';
const net = electron.remote.net;
import Multipart from './multi-part-lite-adopted';
import fs from 'fs';

export const addRecursive = async (sourcePath: string): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const { formData, boundary } = await directoryFormData(sourcePath);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'ipfs.autonomous-times.com',
            path: '/api/v0/add',
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
            reject();
        });
        request.write(formData);
        request.end();

    });

}   

export const getRecursive = async (cid: string) : Promise<Buffer> => {

    return new Promise( async (resolve,reject) => {

        const headers = {
            'Content-Type': `application/json`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'ipfs.autonomous-times.com',
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

export const add = async (note: any): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const { formData, boundary } = await singleFileFormData(note);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }

        // console.log(formData)

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'ipfs.autonomous-times.com',
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
        request.write(formData);
        request.end();
    });
};

export const addFile = async (path: any): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const formData = await singleFileFormDataFromPath(path);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'ipfs.autonomous-times.com',
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
        request.write(await formData.buffer());
        request.end();
    });
};

export const pinFile = async (path: any): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const formData = await singleFileFormDataFromPath(path);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'nft.autonomous-times.com/cluster',
            path: '/add',
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
        request.write(await formData.buffer());
        request.end();
    });
};

export const dagPut = async (note: any): Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const { formData, boundary } = await singleFileFormData(note);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }

        console.log(formData)

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'ipfs.autonomous-times.com',
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
        request.write(formData);
        request.end();
    });
};

export const dagGet = async (cid: string) : Promise<string> => {

    return new Promise( async (resolve,reject) => {

        const headers = {
            'Content-Type': `application/json`,
        }

        const request = net.request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'ipfs.autonomous-times.com',
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

export const addFilesInDir = async (files: string[]): Promise<string> => {

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
            hostname: 'ipfs.autonomous-times.com',
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
        request.write(formData);
        request.end();

       
    });
};