import lighthouse from './lighthouse-web3-sdk-adopted'
import createFormData from './formdata';
import { IMainController } from 'main.ctrlr';
import fs from 'fs';
import axios from 'axios';


export const upload = async (sourcePath: string, token: string) : Promise<string> => {


    // const token = process.env.LIGHTHOUSE_TOKEN || "x";
    const { formData, boundary } = await createFormData(sourcePath);

    const dealParam_default = {
        deal_duration: -1,
        num_copies: 1,
        repair_threshold: 28800,
        renew_threshold: 240,
        miner: [],
        network: 'calibration',
        add_mock_data: 0,
    }

    // console.log(formData);

    const response = await lighthouse.upload(formData, boundary, token, false, dealParam_default)

    if(response.data) {
        return response.data["Hash"];
    } else {
        return "failed to upload content"
    }
}

export const info = async (cid: string) => {

    const fileInfo = await lighthouse.getFileInfo(cid);

    const status = await lighthouse.dealStatus(cid)

    console.log(fileInfo);
    console.log(status);
}

export const download = async (main: IMainController, name: string, cid:string) => {

    let path = main.basePath + '/' + name; 

    console.log(cid);

    const lighthouseDealDownloadEndpoint = 'https://gateway.lighthouse.storage/ipfs/';

    let response = await axios({
        method: 'GET',
        url: `${lighthouseDealDownloadEndpoint}${cid}`,
        responseType: 'stream',
    });

    try {
      const filePath = await _saveResponseToFile(response, path);
      console.log(`File saved at ${filePath}`);
      return filePath
  } catch (err) {
      console.error(`Error saving file: ${err}`);
  }
}
  
const _saveResponseToFile = (response: any, filePath: string) => {

      console.log(response.data);

      // const writer = fs.createWriteStream(filePath);
  
      // // Pipe the response data to the file
      // response.data.pipe(writer);
  
      // return new Promise((resolve, reject) => {
      //     writer.on('finish', () => resolve(filePath));
      //     writer.on('error', (err) => {
      //         console.error(err);
      //         reject(err);
      //     });
      // });
  }

    // fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`)
    // .then(response => {
    //   if (response.ok) {
        
    //     console.log(response);
    //     return response.arrayBuffer();

    //   }
    //   throw new Error('Network response was not ok.');
    // })
    // .then(buffer => {
     
    //   const nodeBuffer = Buffer.from(buffer);

    //   console.log(nodeBuffer);

    //   fs.writeFile(path, nodeBuffer, () => {
    //     console.log(`File saved to ${path}`);
    //   });
    // })
    // .catch(error => {
    //   console.error('Failed to save the file:', error);
