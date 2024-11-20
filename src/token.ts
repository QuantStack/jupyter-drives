import { Token } from '@lumino/coreutils';
import { Contents } from '@jupyterlab/services';

/**
 * A token for the plugin that provides the list of drives.
 */
export const IDrivesList = new Token<IDriveInfo[]>(
  '@jupyter/drives:drives-list-provider'
);

/**
 * An interface that stores the drive information.
 */
export interface IDriveInfo {
  /**
   * Name of drive as stored on the provider account.
   */
  name: string;
  /**
   * Region of drive (e.g.: eu-north-1).
   */
  region: string;
  /**
   * Provider of drive (e.g.: s3, gcs).
   */
  provider: string;
  /**
   * Date drive was created.
   */
  creationDate: string;
  /**
   * Whether a content manager for the drive was already set up in the backend (true) or not (false).
   */
  mounted: boolean;
}

/**
 * An interface for storing the contents of a directory.
 */
export interface IContentsList {
  [fileName: string]: Contents.IModel;
}

/**
 * An interface that stores the registered file type, mimetype and format for each file extension.
 */
export interface IRegisteredFileTypes {
  [fileExtension: string]: {
    fileType: string;
    fileMimeTypes: string[];
    fileFormat: string;
  };
}

/**
 * Helping function to define file type, mimetype and format based on file extension.
 * @param extension file extension (e.g.: txt, ipynb, csv)
 * @returns
 */
export function getFileType(
  extension: string,
  registeredFileTypes: IRegisteredFileTypes
) {
  let fileType: string = 'text';
  let fileMimetype: string = 'text/plain';
  let fileFormat: string = 'text';

  if (registeredFileTypes[extension]) {
    fileType = registeredFileTypes[extension].fileType;
    fileMimetype = registeredFileTypes[extension].fileMimeTypes[0];
    fileFormat = registeredFileTypes[extension].fileFormat;
  }

  // the file format for notebooks appears as json, but should be text
  if (extension === '.ipynb') {
    fileFormat = 'text';
  }

  return [fileType, fileMimetype, fileFormat];
}
