import { IUploadProgressCallback, IFileUploadedResponse, DealParameters } from '../../../types';
declare function uploadFiles(formData: string | any, boundary: string, apiKey: string, multi?: false, dealParameters?: DealParameters, uploadProgressCallback?: (data: IUploadProgressCallback) => void): Promise<{
    data: IFileUploadedResponse;
}>;
declare function uploadFiles(formData: string | any, boundary: string, apiKey: string, multi?: boolean, dealParameters?: DealParameters, uploadProgressCallback?: (data: IUploadProgressCallback) => void): Promise<{
    data: IFileUploadedResponse[];
}>;
export default uploadFiles;
