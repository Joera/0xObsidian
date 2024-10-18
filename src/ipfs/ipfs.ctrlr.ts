import { dagGet, dagPut, add, addRecursive, getRecursive, addFilesInDir, addFile, pinFile } from './remotekubo.service'; 

export interface IpfsCtrlr {

    add: (note: string) => Promise<string>,
    addFile: (path: string) => Promise<string>,
    addFilesInDir: (files: string[]) => Promise<string>,
    addRecursive: (sourcePath: string) => Promise<string>,
    dagGet: (cid: string) => Promise<string>,
    dagPut: (note: string) => Promise<string>,
    getRecursive: (cid: string) => Promise<Buffer>
    pinFile: (cid: string) => Promise<string>
}

export const ipfsController: IpfsCtrlr = {

    add,
    addFile,
    addFilesInDir,
    addRecursive,
    dagGet,
    dagPut,
    getRecursive,
    pinFile

}

