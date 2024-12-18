import { ReadonlyJSONObject } from '@lumino/coreutils';
import { Contents } from '@jupyterlab/services';
import { PathExt } from '@jupyterlab/coreutils';

import { requestAPI } from './handler';
import {
  getFileType,
  IRegisteredFileTypes,
  IContentsList,
  IDriveInfo
} from './token';

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
 * Set new limit for number of objects to be listed inside the DriveBrowser, given any path.
 *
 * @returns
 */
export async function setListingLimit(newLimit: number) {
  await requestAPI<any>('drives/config', 'POST', {
    new_limit: newLimit
  });
}

/**
 * Fetch the list of available drives.
 * @returns The list of available drives.
 */
export async function getDrivesList() {
  return await requestAPI<IDriveInfo[]>('drives', 'GET');
}

/**
 * Mount a drive by establishing a connection with it.
 *
 * @param driveName
 * @param options.provider The provider of the drive to be mounted.
 */
export async function mountDrive(
  driveName: string,
  options: { provider: string }
) {
  const body: ReadonlyJSONObject = {
    drive_name: driveName,
    provider: options.provider
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
export async function saveObject(
  driveName: string,
  options: {
    path: string;
    param: Partial<Contents.IModel>;
    registeredFileTypes: IRegisteredFileTypes;
  }
) {
  const [fileType, fileMimeType, fileFormat] = getFileType(
    PathExt.extname(PathExt.basename(options.path)),
    options.registeredFileTypes
  );

  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + options.path,
    'PUT',
    {
      content: options.param.content,
      options_format: options.param.format,
      content_format: fileFormat,
      content_type: fileType
    }
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
    type: string;
    registeredFileTypes: IRegisteredFileTypes;
  }
) {
  const path = options.path
    ? PathExt.join(options.path, options.name)
    : options.name;
  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + path,
    'POST',
    {
      type: options.type
    }
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
  await requestAPI<any>('drives/' + driveName + '/' + options.path, 'DELETE');
}

/**
 * Rename an object.
 *
 * @param driveName
 * @param options.path The original path of object.
 * @param options.newPath The new path of object.
 * @param options.newFileName The name of the item to be renamed.
 * @param options.registeredFileTypes The list containing all registered file types.
 *
 * @returns A promise which resolves with the contents model.
 */
export async function renameObjects(
  driveName: string,
  options: {
    path: string;
    newPath: string;
    newFileName: string;
    registeredFileTypes: IRegisteredFileTypes;
  }
) {
  const formattedNewPath =
    options.newPath.substring(0, options.newPath.lastIndexOf('/') + 1) +
    options.newFileName;

  const [fileType, fileMimeType, fileFormat] = getFileType(
    PathExt.extname(PathExt.basename(options.newFileName)),
    options.registeredFileTypes
  );

  // get list of contents with given prefix (path)
  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + options.path,
    'GET'
  );

  // renaming contents of a directory
  if (response.data.length !== undefined && response.data.length !== 0) {
    await Promise.all(
      response.data.map(async (c: any) => {
        const remainingFilePath = c.path.substring(options.path.length);
        Private.renameSingleObject(
          driveName,
          PathExt.join(options.path, remainingFilePath),
          PathExt.join(formattedNewPath, remainingFilePath)
        );
      })
    );
  }
  // always rename the object (file or main directory)
  try {
    const renamedObject = await Private.renameSingleObject(
      driveName,
      options.path,
      formattedNewPath
    );
    data = {
      name: options.newFileName,
      path: PathExt.join(driveName, formattedNewPath),
      last_modified: renamedObject.data.last_modified,
      created: '',
      content: PathExt.extname(options.newFileName) !== '' ? null : [], // TODO: add dir check
      format: fileFormat as Contents.FileFormat,
      mimetype: fileMimeType,
      size: renamedObject.data.size,
      writable: true,
      type: fileType
    };
  } catch (error) {
    // renaming failed if directory didn't exist and was only part of a path
  }

  return data;
}

/**
 * Copy an object.
 *
 * @param driveName
 * @param options.path The path of object.
 * @param options.toPath The path where object should be copied.
 * @param options.newFileName The name of the item to be copied.
 * @param options.registeredFileTypes The list containing all registered file types.
 *
 * @returns A promise which resolves with the contents model.
 */
export async function copyObjects(
  driveName: string,
  options: {
    path: string;
    toPath: string;
    newFileName: string;
    toDrive: string;
    registeredFileTypes: IRegisteredFileTypes;
  }
) {
  const formattedNewPath = PathExt.join(options.toPath, options.newFileName);

  const [fileType, fileMimeType, fileFormat] = getFileType(
    PathExt.extname(PathExt.basename(options.newFileName)),
    options.registeredFileTypes
  );

  // get list of contents with given prefix (path)
  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + options.path,
    'GET'
  );

  // copying contents of a directory
  if (response.data.length !== undefined && response.data.length !== 0) {
    await Promise.all(
      response.data.map(async (c: any) => {
        const remainingFilePath = c.path.substring(options.path.length);
        Private.copySingleObject(
          driveName,
          options.toDrive,
          PathExt.join(options.path, remainingFilePath),
          PathExt.join(formattedNewPath, remainingFilePath)
        );
      })
    );
  }
  // always copy the main object (file or directory)
  try {
    const copiedObject = await Private.copySingleObject(
      driveName,
      options.toDrive,
      options.path,
      formattedNewPath
    );
    data = {
      name: options.newFileName,
      path: PathExt.join(options.toDrive, formattedNewPath),
      last_modified: copiedObject.data.last_modified,
      created: '',
      content: PathExt.extname(options.newFileName) !== '' ? null : [], // TODO: add dir check
      format: fileFormat as Contents.FileFormat,
      mimetype: fileMimeType,
      size: copiedObject.data.size,
      writable: true,
      type: fileType
    };
  } catch (error) {
    // copied failed if directory didn't exist and was only part of a path
  }

  return data;
}

/**
 * Get presigned link of object.
 *
 * @param driveName:
 * @param optinons. path: The path to the object.
 *
 * @returns A promise which resolves with link.
 */
export const presignedLink = async (
  driveName: string,
  options: {
    path: string;
  }
): Promise<string> => {
  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + options.path,
    'PUT',
    {
      presigned_link: true
    }
  );

  return response.data.link;
};

/**
 * Check existance of an object.
 *
 * @param driveName
 * @param options.path The path to the object.
 *
 * @returns A promise which resolves or rejects depending on the object existing.
 */
export async function checkObject(
  driveName: string,
  options: {
    path: string;
  }
) {
  await requestAPI<any>('drives/' + driveName + '/' + options.path, 'HEAD');
}

/**
 * Count number of appeareances of object name.
 *
 * @param driveName:
 * @param path: The path to the object.
 * @param originalName: The original name of the object (before it was incremented).
 *
 * @returns A promise which resolves with the number of appeareances of object.
 */
export const countObjectNameAppearances = async (
  driveName: string,
  path: string,
  originalName: string
): Promise<number> => {
  let dirCount: { [fileName: string]: number } = {};
  path = path.substring(0, path.lastIndexOf('/'));

  const response = await requestAPI<any>(
    'drives/' + driveName + '/' + path,
    'GET'
  );

  if (response.data && response.data.length !== 0) {
    response.data.forEach((c: any) => {
      const fileName = c.path.replace(path ? path + '/' : '', '').split('/')[0];
      if (
        fileName.substring(0, originalName.length + 1).includes(originalName)
      ) {
        dirCount[fileName] = 1;
      }
    });
  }
  const counter = Object.values(dirCount).reduce(
    (sum, count) => sum + count,
    0
  );
  return counter;
};

namespace Private {
  /**
   * Helping function for renaming files inside
   * a directory, in the case of deleting the directory.
   *
   * @param driveName
   * @param objectPath complete path of object to rename
   */
  export async function renameSingleObject(
    driveName: string,
    objectPath: string,
    newObjectPath: string
  ) {
    return await requestAPI<any>(
      'drives/' + driveName + '/' + objectPath,
      'PATCH',
      {
        new_path: newObjectPath
      }
    );
  }

  /**
   * Helping function for copying files inside
   * a directory, in the case of deleting the directory.
   *
   * @param driveName
   * @param objectPath complete path of object to copy
   */
  export async function copySingleObject(
    driveName: string,
    toDrive: string,
    objectPath: string,
    newObjectPath: string
  ) {
    return await requestAPI<any>(
      'drives/' + driveName + '/' + objectPath,
      'PUT',
      {
        to_path: newObjectPath,
        to_drive: toDrive
      }
    );
  }
}
