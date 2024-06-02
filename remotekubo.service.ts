import axios from "axios";
import createFormData from "formdata";
import fs from 'fs';
//@ts-ignore
import electron from 'electron';
const net = electron.remote.net;

export const uploadDir = async (sourcePath: string): Promise<string> => {


    return new Promise( async (resolve,reject) => {

        const { formData, boundary } = await createFormData(sourcePath);

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
            // console.log(`STATUS: ${response.statusCode}`);
            // console.log(`HEADERS: ${JSON.stringify(response.headers)}`);

            response.on('data', (chunk: any) => {
                const a = chunk.toString().split('\n');
                let root = a[a.length -2];
                // console.log(root);
                let parsip = JSON.parse(root);
                resolve(parsip["Hash"]);
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

export const fetchDir = async (cid: string) : Promise<Buffer> => {

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