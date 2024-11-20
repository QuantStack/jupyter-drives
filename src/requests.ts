import { ReadonlyJSONObject } from '@lumino/coreutils';
import { Contents } from '@jupyterlab/services';
import { PathExt } from '@jupyterlab/coreutils';

import { requestAPI } from './handler';
import { getFileType, IRegisteredFileTypes, IContentsList } from './token';

/**
 * The data contents model.
 */
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

/**
 * Fetch the list of available drives.
 * @returns The list of available drives.
 */
export async function getDrivesList() {
  return await requestAPI<any>('drives', 'GET');
}

/**
 * Mount a drive by establishing a connection with it.
 * @param driveName
 * @param options.provider The provider of the drive to be mounted.
 * @param options.region The region of the drive to be mounted.
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

/**
 * Get contents of a directory or retrieve contents of a specific file.
 *
 * @param driveName
 * @param options.path The path of object to be retrived
 * @param options.path The list containing all registered file types.
 *
 * @returns A promise which resolves with the contents model.
 */
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
