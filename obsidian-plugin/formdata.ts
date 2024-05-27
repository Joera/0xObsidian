const fs = require('fs');
const recursive = require('recursive-fs');
import basePathConverter from 'base-path-converter';
import { createReadStream } from 'fs';
import Multipart from './multi-part-lite-adopted';

export default function createFormData(sourcePath: string) : Promise<any> {

    return new Promise( async (resolve, reject) => {
        
        fs.stat(sourcePath, (err, stats) => {
            if (err) {
                reject(err);
            }
            if (!stats.isFile()) {

                recursive.readdirr(sourcePath, async (err, dirs, files) => {
                    if (err) {
                        console.log("err" + err)
                        reject(new Error(err));
                    }

                    let data = new Multipart();

                    files.forEach(async (file) => {

                        console.log(file);

                      //  Blob is a browser-specific object used to represent raw data in the browser environment. Instead, fs.createReadStream() returns a ReadableStream object, which is a Node.js API for reading data from a stream source.
                        let fileStream = createReadStream(file, { encoding: 'utf-8'});

                        // console.log(basePathConverter(sourcePath, file))
                        //for each file stream, we need to include the correct relative file path
                        data.append('file', fileStream, {
                            'filename': basePathConverter(sourcePath, file)
                        });
                    });

                    resolve({
                        formData: (await data.buffer()).toString(),
                        boundary: data.getBoundary()
                    });

                });
            }
        });
    });
}