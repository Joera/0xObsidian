import { IMainController } from "src/main.ctrlr";
import { Author } from "./author";

export const loadAuthors = async (main: IMainController) => {

    for (let author of main.plugin.settings.authors) {

        main.author = new Author(
            author.name,
            author.active = true,
            author.private_key,
            author.eoa,
            author.msca
        )
    }
}

// export const saveAuthors = async (main: IMainController) => {

//     main.plugin.settings.authors = Object.values(main.authors);
//     main.plugin.saveSettings;

// }