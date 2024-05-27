import { App } from "obsidian";

export class DotSpinner  {

    app;
    file;
    periodic: any;

    constructor(app: App, path: string) {

        this.file = app.vault.getFileByPath(`${path}/pod.config.md`);
        this.app = app;
        this.start();
    }

    start() {

        let i = 1;

        this.periodic = setInterval ( async () => {
            if (this.file != null) {
                await this.app.fileManager.processFrontMatter( this.file, (frontmatter) => {

                    let v = '.';
                    for (let j = 0; j <= i; j++) {
                        v = v.concat('.')
                    }

                    frontmatter["contract"] = v;
                })
            }

            i++;

        }, 500)
    }

    stop() {

        clearInterval(this.periodic);
    }

}