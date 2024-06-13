const fs = require('fs');
const recursive = require('recursive-fs');

import { createReadStream } from 'fs';
import Multipart from './multi-part-lite-adopted';

// @ts-ignore 
import basePathConverter from 'base-path-converter';

import path from "path";

export default function createFormData(sourcePath: string) : Promise<any> {

    return new Promise( async (resolve, reject) => {

        
        fs.stat(sourcePath, async (err: any, stats:any) => {
            if (err) {
                reject(err);
            }
            if (!stats.isFile()) {

                recursive.readdirr(sourcePath, async (err: any, dirs: any, files: any) => {
                    if (err) {
                        console.log("err" + err)
                        reject(new Error(err));
                    }

                    let data = new Multipart();

                    files.forEach(async (file: any) => {
                        
                        if (path.basename(file) != "_pod.md") {
                            // Blob is a browser-specific object used to represent raw data in the browser environment. Instead, fs.createReadStream() returns a ReadableStream object, which is a Node.js API for reading data from a stream source.
                            let fileStream = createReadStream(file, { encoding: 'utf-8'});
                            //for each file stream, we need to include the correct relative file path
                            data.append('file', fileStream, {
                                'filename': basePathConverter(sourcePath, file)
                            });
                        }
                    });

                    resolve({

                        formData: (await data.buffer()).toString(),
                        boundary: data.getBoundary()
                    });
                });
            } 
            
            
            // else { // NOT TESTED

            //     await fs.readFile(sourcePath, async (err: any, content: any) => {
                    
            //         if (err) throw err;
            //         let fileStream = createReadStream(content, { encoding: 'utf-8'});
            //         data.append('file', fileStream);
            //     });

            //     resolve({

            //         formData: (await data.buffer()).toString(),
            //         boundary: data.getBoundary()
            //     });
            // }
        });
    });
}