import { Tarball } from "@obsidize/tar-browserify";
import { IMainController } from "./main.ctrlr";
import { dagGet, getRecursive } from "./ipfs/remotekubo.service";
import { IpldNote, IpldPod } from "./types/ipld";


export const importAndMergeWithTar = async (main: IMainController, cid: string, name: string) : Promise<boolean> => {

    const tarPath = main.basePath + '/' + 'tmp.tar';
    const path = name;

    const tarbytes = await getRecursive(cid);

    const entries = Tarball.extract(tarbytes);

    console.log('entries: ' + entries.length)

    for (let entry of entries){
        if (entry.fileName.endsWith(".md")){
            console.log('.md ' + entry.fileName);
            await main.plugin.app.vault.create(entry.fileName, entry.getContentAsText());
        } else {
            console.log('folder? ' + entry.fileName);
            await main.plugin.app.vault.createFolder(entry.fileName);
        }
    }

    const oldFolder = main.plugin.app.vault.getAbstractFileByPath(path);
    if (oldFolder != null) {
        await main.plugin.app.vault.trash(oldFolder, true);
    }
   
    const tempFolder = main.plugin.app.vault.getAbstractFileByPath(cid);
    if (tempFolder != null) {
        await main.plugin.app.vault.rename(
            tempFolder,
            path
        );
    }

    return true;
}

export const importAndMerge = async (main: IMainController, cid: string, name: string) : Promise<boolean> => {

    const ipldPod : IpldPod = JSON.parse(await dagGet(cid));

    if(main.plugin.app.vault.getFolderByPath(name) == null) {
        const folder = await main.plugin.app.vault.createFolder(name);
    }

    console.log(ipldPod);
        
    for (let link of ipldPod.Links) {

        let ipldNote = JSON.parse(await dagGet(Object.values(link.Hash)[0]));

        console.log(ipldNote.Data["/"].bytes);  

        let file = main.plugin.app.vault.getFileByPath(ipldNote.path);
        
        if (file == null) {

            file = await main.plugin.app.vault.create(ipldNote.path, ipldNote.body);
        
        } else {

            await main.plugin.app.vault.modify(file, ipldNote.body);
        }
        
        await main.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
            for ( let [key, value] of Object.entries(ipldNote)) {
                if(["body","slug","title","path"].indexOf(key) < 0) {
                    frontmatter[key] = value;
                }   
            }
        });
    }       

    return true;
}