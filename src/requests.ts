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
 *
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
 * @param options.path The path of object to be retrived.
 * @param options.registeredFileTypes The list containing all registered file types.
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
  // checking if we are dealing with a directory or a file
  const isDir: boolean = response.data.length !== undefined;

  if (response.data) {
    // listing the contents of a directory
    if (isDir) {
      const fileList: IContentsList = {};

      response.data.forEach((row: any) => {
        // check if we are dealing with files inside a subfolder
        if (row.path !== options.path && row.path !== options.path + '/') {
          // extract object name from path
          const fileName = row.path
            .replace(options.path ? options.path + '/' : '', '')
            .split('/')[0];

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
        }
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
    // getting the contents of a file
    else {
      const [fileType, fileMimeType, fileFormat] = getFileType(
        PathExt.extname(PathExt.basename(options.path)),
        options.registeredFileTypes
      );

      data = {
        name: PathExt.basename(options.path),
        path: driveName + '/' + response.data.path,
        last_modified: response.data.last_modified,
        created: '',
        content: response.data.content,
        format: fileFormat as Contents.FileFormat,
        mimetype: fileMimeType,
        size: response.data.size,
        writable: true,
        type: fileType
      };
    }
  }

  return data;
}

/**
 * Save an object.
 *
 * @param driveName
 * @param options.path The path of the object to be saved.
 * @param options.param The options sent when getting the request from the content manager.
 * @param options.registeredFileTypes The list containing all registered file types.
 *
 * @returns A promise which resolves with the contents model.
 */
export async function saveFile(
  driveName: string,
  options: {
    path: string;
    param: Partial<Contents.IModel>;
    registeredFileTypes: IRegisteredFileTypes;
  }
) {
  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + options.path,
    'PUT',
    {
      content: options.param.content
    }
  );

  const [fileType, fileMimeType, fileFormat] = getFileType(
    PathExt.extname(PathExt.basename(options.path)),
    options.registeredFileTypes
  );

  data = {
    name: PathExt.basename(options.path),
    path: PathExt.join(driveName, options.path),
    last_modified: response.data.last_modified,
    created: response.data.last_modified,
    content: response.data.content,
    format: fileFormat as Contents.FileFormat,
    mimetype: fileMimeType,
    size: response.data.size,
    writable: true,
    type: fileType
  };
  return data;
}
