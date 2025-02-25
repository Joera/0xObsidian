// import { IMainController } from "../main.ctrlr";
// import { Notice } from "obsidian";
// import { importAndMerge } from "src/import";
// import { podToDag } from "src/ipfs/ipld.factory";
// import { addRecursive } from "src/ipfs/remotekubo.service";
// import { Pod } from "./pod";
// import { DotSpinner } from "src/ui/spinner.service";


// export interface IPodCtrlr {

//     newPod: (path: string) => void;
//     updatePod: (path: string) => void;
// }
 

// export class PodController implements IPodCtrlr {

//     pods: any = {};

//     constructor(public main: IMainController) {

//         this.main = main;
//     }

//     async newPod(path: string) {

//         function generateRandomString(length: number ) {
//             return [...Array(length)].map(() => Math.random().toString(36)[2]).join('');
//         }

//         let pod = this.pods[path] = new Pod(this, path);
//         if (await pod.exists()) return;
//         await pod.initFile();
//         pod.displayFile()
//         const spinner = new DotSpinner(this.main.plugin.app, path);

//         const pod_addr = await pod.deploy(generateRandomString(32), path);
//         spinner.stop();
//         this.main.pod.loadPod(pod_addr);
//         await pod.updateFrontMatter("contract", pod_addr);
//         await this.main.lit.createAccessFile(path, pod_addr);
//         const cid = await addRecursive(this.main.basePath + '/' + path);
//         await pod.update(this.main.msca, pod_addr, cid);
//         await pod.updateFrontMatter("cid", cid);
//         console.log(`new pod for folder ${path} created at: ${pod_addr}`);
//         const { readers, authors } = await pod.permissions(this.main.msca, pod_addr);
//         await pod.updateFrontMatter("readers", readers);
//         await pod.updateFrontMatter("authors", authors);

    
//     }

//     async updatePod(path: string) {

//         let pod;
//         if (this.pods[path] == undefined) {
//             pod = this.pods[path] = new Pod(this, path);
//             await pod.initFile();
//         } else {
//             pod = this.pods[path]
//         }

//         let pod_addr = await pod.readFrontMatter("contract")
//         if(pod_addr == "") {
//             new Notice("no contract address specified in your pod config file");
//             return;
//         }
//         this.main.pod.loadPod(pod_addr);
//         const { readers, authors } = await pod.permissions(this.main.msca, pod_addr);
//         await pod.updateFrontMatter("readers", readers);
//         await pod.updateFrontMatter("authors", authors);

//         //const newCid = await uploadDir(this.basePath + '/' + path);
//         const newCid = await podToDag(this.main.plugin.app, path)
//         console.log(newCid);
//         if (newCid != await pod.readFrontMatter("cid")) {
//             await pod.update(this.main.msca,pod_addr, newCid);
//             await pod.updateFrontMatter("cid", newCid);
//         } else {
//             new Notice("there are no changes to update");
//         }
//     }

//     async inviteToPod(path: string, invitee: string, read: boolean, write: boolean) {

//         let pod;
//         if (this.pods[path] == undefined) {
//             pod = this.pods[path] = new Pod(this, path);
//             await pod.initFile();
//         } else {
//             pod = this.pods[path]
//         }

//         let pod_addr = await pod.readFrontMatter("contract")
//         if(pod_addr == "") {
//             new Notice("no contract address specified in your pod config file");
//             return;
//         }

//         this.main.pod.loadPod(pod_addr);
//         await pod.invite(pod_addr, invitee, read, write, this.main.plugin.settings.alchemy_key || "x");
//         const { readers, authors } = await pod.permissions(this.main.msca, pod_addr);
//         await pod.updateFrontMatter("readers", readers);
//         await pod.updateFrontMatter("authors", authors);
//     }

//     async import(pod_addr: string, name: string) {

//         this.main.pod.loadPod(pod_addr);
//         const cid = await this.main.pod.podContract.cid();
//         const reader_0 = await this.main.pod.podContract.readers(0);

//         await this.main.lit.readAccessFile(name);

//         let success = await importAndMerge(this.main, cid, name);

//         if (success) {
//             let pod = this.pods[name] = new Pod(this, name);
//             if (await pod.exists()) return;
//             await pod.initFile();
//             await pod.updateFrontMatter("cid", cid);
//             await pod.updateFrontMatter("contract", pod_addr);
//             const { readers, authors } = await pod.permissions(this.main.msca, pod_addr);
//             await pod.updateFrontMatter("readers", readers);
//             await pod.updateFrontMatter("authors", authors);
//         }

//     }

//     async upload(sourcePath: string) {

//         return await addRecursive(sourcePath);
//     }
// }