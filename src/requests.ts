import { ReadonlyJSONObject } from '@lumino/coreutils';
import { requestAPI } from './handler';
import { Contents } from '@jupyterlab/services';

/**
 * Fetch the list of available drives.
 * @returns list of drives
 */
export async function getDrivesList() {
  return await requestAPI<any>('drives', 'GET');
}

/**
 * Mount a drive by establishing a connection with it.
 * @param driveName
 */
export async function mountDrive(
  driveName: string,
  options: { provider: string; region: string }
) {
  const body: ReadonlyJSONObject = {
    drive_name: driveName,
    provider: options.provider,
    region: options.region
  };
  return await requestAPI<any>('drives', 'POST', body);
}

export async function saveFile(
  driveName: string,
  options: {
    path: string;
    param: Partial<Contents.IModel>;
  }
) {
  // const [fileType, fileMimeType, fileFormat] = getFileType(
  //   PathExt.extname(PathExt.basename(options.path)),
  //   options.registeredFileTypes
  // );

  // const formattedBody = Private.formatBody(options.param, fileFormat, fileType, fileMimeType);
  // const body: ReadonlyJSONObject = {
  //   content: formattedBody
  // };

  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + options.path,
    'PUT',
    {
      content: options.param.content
    }
  );
  console.log('response: ', response);
}
