import lighthouse from './lighthouse-web3-sdk-adopted'
import createFormData from './formdata';
import * as dotenv from 'dotenv';

dotenv.config();


export const upload = async (path: string) => {

    const token = process.env.LIGHTHOUSE_TOKEN || "x";
    const { formData, boundary } = await createFormData(path);

    const dealParam_default = {
        deal_duration: -1,
        num_copies: 1,
        repair_threshold: 28800,
        renew_threshold: 240,
        miner: [],
        network: 'calibration',
        add_mock_data: 0,
    }

    const response = await lighthouse.upload(formData, boundary, token, false, dealParam_default)

  //  const response = await lighthouse.uploadText(text, apiKey, name, dealParam_default)

    console.log(response);
}

export const info = async (cid: string) => {

    const fileInfo = await lighthouse.getFileInfo(cid);

    const status = await lighthouse.dealStatus(cid)

    console.log(fileInfo);
    console.log(status);
}