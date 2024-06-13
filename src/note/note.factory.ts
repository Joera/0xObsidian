import { App, FileManager, TFile, Vault } from "obsidian";

import { SGContentItem, SGTask } from "../types/sg";
import { v4 as uuidv4 } from 'uuid';
import slugify from "slugify";

export const parseNote = async (app: App, file: TFile): Promise<[SGContentItem, string]> => {

    const rawFile = await app.vault.read(file);

	let contentItem = await parseFrontmatter(file, app.fileManager);

	if (file.name != undefined) contentItem.title = file.name.replace(/\.[^/.]+$/, "");

	let [ content, title ] = extractTitle(rawFile);

	contentItem.content = content;

	if (title != undefined && title != "") contentItem.title = title;

	let publicationLink = contentItem.publication;
	
	contentItem.publication = await followLink("config", publicationLink, app);
	contentItem.author = await followLink("config", contentItem.author, app);

	const archive_cid = await followLink("archive", publicationLink, app);

	return [contentItem, archive_cid]

}

export const insertCid = async (file: TFile, contentItem: SGContentItem, archive_cid: string, content_cid: string, fileManager: FileManager) : Promise<[SGContentItem, string]> => {

	console.log("cid: " + content_cid);

	await fileManager.processFrontMatter( file, (frontmatter: any) => {
		frontmatter["cid"] = content_cid;
	})

	return [contentItem, archive_cid]
}

const extractTitle = (raw: string) : [string, string | undefined] => {

	let title: string = "";
	let content = raw.split("---")[2].trim();

	if (content.slice(0,2) == '# ') {

		const parts = content.split("\n");
		title = parts[0].replace("# ","").trim();
		parts.shift();
		content = parts.join("\n").trim() 
	}

	return [content, title]

}

const parseFrontmatter = async (file: TFile, fileManager: FileManager) : Promise<SGContentItem>=> {

	let contentItem: SGContentItem;
	let content: string;

	return new Promise ( async (resolve, reject) => {

		await fileManager.processFrontMatter(file, (frontmatter) => {

			if (frontmatter.sgId == undefined) {
				frontmatter.sgId = uuidv4().replace('-','');
			}

			// possibly check if content was modified ??? 
			const now = new Date().toJSON().split(".")[0];
			frontmatter.modified_date = now;
			if (frontmatter.creation_date == undefined) frontmatter.creation_date = now;


			contentItem = {
				
				author: frontmatter.author,
				publication: frontmatter.publication,
				sgId : frontmatter.sgId,
				post_type: frontmatter.post_type,
				args: frontmatter.args,
				tags: frontmatter.tags != undefined ? frontmatter.tags : [],
				categories: frontmatter.categories != undefined ? frontmatter.categories : [],
				parent: frontmatter.parent != undefined ? frontmatter.parent : '0',
				creation_date: frontmatter.creation_date,
				modified_date: frontmatter.modified_date,
				thumbnail: frontmatter.thumbnail,
				title: "",
				content: ""
			}

			resolve(contentItem);
		})

	})
	
}

export const followLink = async (key: string, linkText: string, app: App) : Promise<string> => {

	return new Promise ( async(resolve,reject) => {

		let files = app.vault.getMarkdownFiles();
		let file = files.find( (f) => f.basename == linkText.replace("[","").replace("[","").replace("]","").replace("]",""));

		if(file != undefined) {
			
			await app.fileManager.processFrontMatter(file, (frontmatter) => {
				resolve(frontmatter[key])
			})
			
		} else {
			
			throw Error(`link to ${key} not specified or found`)
		}

	});	 
	
}

export const saveRoot = async (cid: string , url: string, file: TFile, vault: Vault, fileManager: FileManager) : Promise<[string,string]> => {

	// if (publication === undefined) return;

	let publication = "";

	await fileManager.processFrontMatter(file, (frontmatter) => {
		publication = frontmatter["publication"].replace("[","").replace("[","").replace("]","").replace("]","");
	})

	// console.log(publication)

	let pubfile = vault.getMarkdownFiles().find( (f) => f.basename == publication);
	if(pubfile != undefined) {
		await fileManager.processFrontMatter(pubfile, (frontmatter) => {
			// do some check first -- QmYeo7FUc9B5GmJQaqUHnqyJpi6BmwxsfYyNYFJ8J9ndVY
		//	frontmatter["archive"] = cid;
		})
	} else {
		throw Error("failed to include archive in publication")
	}

	return [cid, url];
}

export const saveRootDirectly = async (cid: string , url: string, pubName: string, app: App) : Promise<[string,string]> => {


	const pubfile = app.vault.getFiles().find( f =>  f.basename == pubName + '.publication');

	if(pubfile != undefined) {
		await app.fileManager.processFrontMatter(pubfile, (frontmatter) => {
			frontmatter["archive"] = cid;
		})
	} else {
		throw Error("cfailed to include archive in publication")
	}

	return [cid, url];
}


export const includeUrl = async (url: string , file: TFile, vault: Vault, fileManager: FileManager) : Promise<string> => {

	await fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter["url"] = url;
	})

	return url;
}


export const createTask = async (file: TFile, contentITem: SGContentItem, archive_cid: string): Promise<[TFile, SGTask, string]> =>  {

	// do slug check on db! 


	const task  = {
			slug: slugify(contentITem.title),
			author: contentITem.author,
			payload: JSON.stringify(contentITem),
			post_type: contentITem.post_type,
			publication: contentITem.publication
		}


    return [file, task, archive_cid]
}
