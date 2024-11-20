import { ReadonlyJSONObject } from '@lumino/coreutils';
import { Contents } from '@jupyterlab/services';
import { PathExt } from '@jupyterlab/coreutils';

import { requestAPI } from './handler';
import { getFileType, IRegisteredFileTypes } from './token';

let data: Contents.IModel = {
  name: '',
  path: '',
  last_modified: '',
  created: '',
  content: null,
  format: null,
  mimetype: '',
  size: 0,
  writable: true,
  type: ''
};

interface IContentsList {
  [fileName: string]: Contents.IModel;
}

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

export async function getContents(
  driveName: string,
  options: { path: string; registeredFileTypes: IRegisteredFileTypes }
) {
  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + options.path,
    'GET'
  );

  if (response.data) {
    const fileList: IContentsList = {};

    response.data.forEach((row: any) => {
      const fileName = PathExt.basename(row.path);

      const [fileType, fileMimeType, fileFormat] = getFileType(
        PathExt.extname(PathExt.basename(fileName)),
        options.registeredFileTypes
      );

      fileList[fileName] = fileList[fileName] ?? {
        name: fileName,
        path: driveName + '/' + row.path,
        last_modified: row.last_modified,
        created: '',
        content: !fileName.split('.')[1] ? [] : null,
        format: fileFormat as Contents.FileFormat,
        mimetype: fileMimeType,
        size: row.size,
        writable: true,
        type: fileType
      };
    });

    data = {
      name: options.path ? PathExt.basename(options.path) : '',
      path: options.path ? options.path + '/' : '',
      last_modified: '',
      created: '',
      content: Object.values(fileList),
      format: 'json',
      mimetype: '',
      size: undefined,
      writable: true,
      type: 'directory'
    };
  }

  return data;
}
