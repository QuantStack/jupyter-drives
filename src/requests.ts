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
            path: options.path
              ? PathExt.join(driveName, options.path, fileName)
              : PathExt.join(driveName, fileName),
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
        name: options.path ? PathExt.basename(options.path) : driveName,
        path: PathExt.join(driveName, options.path ? options.path + '/' : ''),
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
        path: PathExt.join(driveName, response.data.path),
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

/**
 * Create a new object.
 *
 * @param driveName
 * @param options.path The path of new object.
 * @param options.registeredFileTypes The list containing all registered file types.
 *
 * @returns A promise which resolves with the contents model.
 */
export async function createObject(
  driveName: string,
  options: {
    name: string;
    path: string;
    registeredFileTypes: IRegisteredFileTypes;
  }
) {
  const path = options.path
    ? PathExt.join(options.path, options.name)
    : options.name;
  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + path,
    'POST'
  );

  const [fileType, fileMimeType, fileFormat] = getFileType(
    PathExt.extname(options.name),
    options.registeredFileTypes
  );

  data = {
    name: options.name,
    path: PathExt.join(driveName, path),
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

/**
 * Delete an object.
 *
 * @param driveName
 * @param options.path The path of object.
 *
 * @returns A promise which resolves with the contents model.
 */
export async function deleteObjects(
  driveName: string,
  options: {
    path: string;
  }
) {
  // get list of contents with given prefix (path)
  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + options.path,
    'GET'
  );

  // deleting contents of a directory
  if (response.data.length !== undefined && response.data.length !== 0) {
    await Promise.all(
      response.data.map(async (c: any) => {
        return Private.deleteSingleObject(driveName, c.path);
      })
    );
  }
  // always deleting the object (file or main directory)
  return Private.deleteSingleObject(driveName, options.path);
}

namespace Private {
  /**
   * Helping function for deleting files inside
   * a directory, in the case of deleting the directory.
   *
   * @param driveName
   * @param objectPath complete path of object to delete
   */
  export async function deleteSingleObject(
    driveName: string,
    objectPath: string
  ) {
    await requestAPI<any>('drives/' + driveName + '/' + objectPath, 'DELETE');
  }
}
