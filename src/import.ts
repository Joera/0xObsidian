import { Tarball } from "@obsidize/tar-browserify";
import { IMainController } from "./main.ctrlr";
import { fetchDir } from "./ipfs/remotekubo.service";


export const importAndMerge = async (main: IMainController, cid: string, name: string) : Promise<boolean> => {

    const tarPath = main.basePath + '/' + 'tmp.tar';
    const path = name;

    const tarbytes = await fetchDir(cid);

    const entries = Tarball.extract(tarbytes);

    for (let entry of entries){
        if (entry.fileName.endsWith(".md")){
            await main.plugin.app.vault.create(entry.fileName, entry.getContentAsText());
        } else {
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