import { IUploadProgressCallback, UploadFileReturnType, DealParameters } from '../../../types';
declare const _default: <T extends boolean>(formData: any, boundary: string, accessToken: string, multi: boolean, dealParameters: DealParameters | undefined, uploadProgressCallback: (data: IUploadProgressCallback) => void) => Promise<{
    data: UploadFileReturnType<T>;
}>;
export default _default;
