import { JupyterFrontEnd } from '@jupyterlab/application';
import { Signal, ISignal } from '@lumino/signaling';
import { Contents, ServerConnection } from '@jupyterlab/services';
import { PathExt } from '@jupyterlab/coreutils';
import { Notification } from '@jupyterlab/apputils';

import {
  extractCurrentDrive,
  formatPath,
  IDriveInfo,
  IRegisteredFileTypes
} from './token';
import {
  addPublicDrive,
  saveObject,
  getContents,
  mountDrive,
  createObject,
  checkObject,
  deleteObjects,
  countObjectNameAppearances,
  renameObjects,
  copyObjects,
  presignedLink,
  createDrive,
  getDrivesList,
  excludeDrive,
  includeDrive,
  addExternalDrive
} from './requests';
import { DrivesResponseError } from './handler';

export class Drive implements Contents.IDrive {
  /**
   * Construct a new drive object.
   *
   * @param options - The options used to initialize the object.
   */
  constructor(options: Drive.IOptions = {}) {
    this._serverSettings = ServerConnection.makeSettings();
    this._name = options.name ?? '';
    this._drivesList = options.drivesList ?? [];
  }

  /**
   * The drives list getter.
   */
  get drivesList(): IDriveInfo[] {
    return this._drivesList;
  }

  /**
   * The drives list setter.
   * */
  set drivesList(list: IDriveInfo[]) {
    this._drivesList = list;
  }

  /**
   * The Drive base URL
   */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /**
   * The Drive base URL is set by the settingsRegistry change hook
   */
  set baseUrl(url: string) {
    this._baseUrl = url;
  }

  /**
   * The Drive name getter
   */
  get name(): string {
    return this._name;
  }

  /**
   * The Drive name setter */
  set name(name: string) {
    this._name = name;
  }

  /**
   * The Drive provider getter
   */
  get provider(): string {
    return this._provider;
  }

  /**
   * The Drive provider setter */
  set provider(name: string) {
    this._provider = name;
  }

  /**
   * The Drive region getter
   */
  get region(): string {
    return this._region;
  }

  /**
   * The Drive region setter */
  set region(region: string) {
    this._region = region;
  }

  /**
   * The Drive creationDate getter
   */
  get creationDate(): string {
    return this._creationDate;
  }

  /**
   * The Drive region setter */
  set creationDate(date: string) {
    this._creationDate = date;
  }

  /**
   * Settings for the notebook server.
   */
  get serverSettings(): ServerConnection.ISettings {
    return this._serverSettings;
  }

  /**
   * The registered file types
   */
  get registeredFileTypes(): IRegisteredFileTypes {
    return this._registeredFileTypes;
  }

  /**
   * The registered file types
   */
  set registeredFileTypes(fileTypes: IRegisteredFileTypes) {
    this._registeredFileTypes = fileTypes;
  }

  /**
   * A signal emitted when a file operation takes place.
   */
  get fileChanged(): ISignal<this, Contents.IChangedArgs> {
    return this._fileChanged;
  }

  /**
   * Test whether the manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A signal emitted when the drive is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Dispose of the resources held by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit();
    Signal.clearData(this);
  }

  /**
   * Get an encoded download url given a file path.
   *
   * @param path - An absolute POSIX file path on the server.
   *
   * #### Notes
   * It is expected that the path contains no relative paths,
   * use [[ContentsManager.getAbsolutePath]] to get an absolute
   * path if necessary.
   */
  async getDownloadUrl(path: string): Promise<string> {
    let link = '';
    let warning = '';
    let error = '';
    try {
      if (path !== '') {
        const currentDrive = extractCurrentDrive(path, this._drivesList);
        link = await presignedLink(currentDrive.name, {
          path: formatPath(path)
        });
      } else {
        // download URL for drive not supported
        warning = 'Operation not supported.';
      }
    } catch (err) {
      error = (err as DrivesResponseError).message;
    }

    if (error || warning) {
      Notification.emit(warning ?? error, warning ? 'warning' : 'error', {
        autoClose: 5000
      });
    }

    return link;
  }

  /**
   * Get a file or directory.
   *
   * @param localPath: The path to the file.
   *
   * @param options: The options used to fetch the file.
   *
   * @returns A promise which resolves with the file content.
   *
   * Uses the [Jupyter Notebook API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    let error: string = '';
    let data: Contents.IModel;

    if (localPath !== '') {
      const currentDrive = extractCurrentDrive(localPath, this._drivesList);
      // when accessed the first time, mount drive
      if (currentDrive.mounted === false) {
        try {
          const driveName = currentDrive.name;
          const mounting = await mountDrive(driveName, {
            provider: currentDrive.provider
          });
          if (mounting && mounting.error) {
            error = mounting.error.message;
          } else {
            this._drivesList.filter(x => x.name === driveName)[0].mounted =
              true;
          }
        } catch (e) {
          // it will give an error if drive is already mounted.
        }
      }

      try {
        const currentPath = formatPath(localPath);
        const result = await getContents(currentDrive.name, {
          path: currentPath,
          registeredFileTypes: this._registeredFileTypes
        });

        data = {
          name: result.isDir
            ? currentPath
              ? PathExt.basename(currentPath)
              : currentDrive.name
            : PathExt.basename(currentPath),
          path: PathExt.join(
            currentDrive.name,
            result.isDir
              ? currentPath
                ? currentPath + '/'
                : ''
              : result.response.data.path
          ),
          last_modified: result.isDir ? '' : result.response.data.last_modified,
          created: '',
          content: result.isDir ? result.files : result.response.data.content,
          format: result.isDir ? 'json' : result.format!,
          mimetype: result.isDir ? '' : result.mimetype!,
          size: result.isDir ? undefined : result.response.data.size,
          writable: true,
          type: result.isDir ? 'directory' : result.type!
        };
      } catch (err) {
        error = (err as DrivesResponseError).message;
      }
    } else {
      // retriving list of contents from root
      // in our case: list available drives
      const drivesListInfo: Contents.IModel[] = [];
      // fetch list of available drives
      try {
        this._drivesList = await getDrivesList();
        for (const drive of this._drivesList) {
          drivesListInfo.push({
            name: drive.name,
            path: drive.name,
            last_modified: '',
            created: drive.creationDate,
            content: [],
            format: 'json',
            mimetype: '',
            size: undefined,
            writable: true,
            type: 'directory'
          });
        }
      } catch (err) {
        error = (err as DrivesResponseError).message;
      }

      data = {
        name: this._name,
        path: this._name,
        last_modified: '',
        created: '',
        content: drivesListInfo,
        format: 'json',
        mimetype: '',
        size: undefined,
        writable: true,
        type: 'directory'
      };
    }

    if (error) {
      Notification.emit(error, 'error', {
        autoClose: 5000
      });
    }

    Contents.validateContentsModel(data!);
    return data!;
  }

  /**
   * Create a new untitled file or directory in the specified directory path.
   *
   * @param options: The options used to create the file.
   *
   * @returns A promise which resolves with the created file content when the
   *    file is created.
   */
  async newUntitled(
    options: Contents.ICreateOptions = {}
  ): Promise<Contents.IModel> {
    let data: Contents.IModel = {
      name: '',
      path: '',
      last_modified: '',
      created: '',
      content: [],
      format: null,
      mimetype: '',
      size: 0,
      writable: true,
      type: ''
    };
    const path = options.path ?? '';
    let error = '';
    let warning = '';

    if (path !== '') {
      try {
        const currentDrive = extractCurrentDrive(path, this._drivesList);

        // eliminate drive name from path
        const relativePath =
          path.indexOf('/') !== -1 ? path.substring(path.indexOf('/') + 1) : '';

        // get current list of contents of drive
        const result = await getContents(currentDrive.name, {
          path: relativePath,
          registeredFileTypes: this._registeredFileTypes
        });

        const old_data: Contents.IModel = {
          name: relativePath
            ? PathExt.basename(relativePath)
            : currentDrive.name,
          path: PathExt.join(
            currentDrive.name,
            relativePath ? relativePath + '/' : ''
          ),
          last_modified: '',
          created: '',
          content: result.files,
          format: 'json'!,
          mimetype: '',
          size: undefined,
          writable: true,
          type: 'directory'
        };

        if (options.type !== undefined) {
          // get incremented untitled name
          const name = this.incrementUntitledName(old_data, options);
          const currentPath = relativePath
            ? PathExt.join(relativePath, name)
            : name;

          const result = await createObject(currentDrive.name, {
            name: name,
            path: currentPath,
            type: options.type,
            registeredFileTypes: this._registeredFileTypes
          });

          data = {
            name: name,
            path: PathExt.join(currentDrive.name, currentPath),
            last_modified: result.response.data.last_modified,
            created: result.response.data.last_modified,
            content: result.response.data.content,
            format: result.format,
            mimetype: result.mimetype,
            size: result.response.data.size,
            writable: true,
            type: result.type
          };
        } else {
          warning = 'Type of new element is undefined';
        }
      } catch (err) {
        error = (err as DrivesResponseError).message;
      }
    } else {
      // create new element at root would mean creating a new drive
      warning = 'Operation not supported.';
    }

    if (error || warning) {
      Notification.emit(warning ?? error, warning ? 'warning' : 'error', {
        autoClose: 5000
      });
    }

    Contents.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: data
    });

    return data;
  }

  incrementUntitledName(
    contents: Contents.IModel,
    options: Contents.ICreateOptions
  ): string {
    const content: Array<Contents.IModel> = contents.content;
    let name: string = '';
    let countText = 0;
    let countDir = 0;
    let countNotebook = 0;
    if (options.type === 'notebook') {
      options.ext = 'ipynb';
    }

    content.forEach(item => {
      if (options.ext !== undefined) {
        if (item.name.includes('untitled') && item.name.includes('.txt')) {
          countText = countText + 1;
        } else if (
          item.name.includes('Untitled') &&
          item.name.includes('.ipynb')
        ) {
          countNotebook = countNotebook + 1;
        }
      } else if (item.name.includes('Untitled Folder')) {
        countDir = countDir + 1;
      }
    });

    if (options.ext === 'txt') {
      if (countText === 0) {
        name = 'untitled' + '.' + options.ext;
      } else {
        name = 'untitled' + countText + '.' + options.ext;
      }
    }
    if (options.ext === 'ipynb') {
      if (countNotebook === 0) {
        name = 'Untitled' + '.' + options.ext;
      } else {
        name = 'Untitled' + countNotebook + '.' + options.ext;
      }
    } else if (options.type === 'directory') {
      if (countDir === 0) {
        name = 'Untitled Folder';
      } else {
        name = 'Untitled Folder ' + countDir;
      }
    }
    return name;
  }

  /**
   * Delete a file.
   *
   * @param path - The path to the file.
   *
   * @returns A promise which resolves when the file is deleted.
   */
  async delete(localPath: string): Promise<void> {
    const currentDrive = extractCurrentDrive(localPath, this._drivesList);

    try {
      await deleteObjects(currentDrive.name, {
        path: formatPath(localPath)
      });
    } catch (err) {
      Notification.emit((err as DrivesResponseError).message, 'error', {
        autoClose: 5000
      });
    }

    this._fileChanged.emit({
      type: 'delete',
      oldValue: { path: localPath },
      newValue: null
    });
  }

  /**
   * Rename a file or directory.
   *
   * @param oldLocalPath - The original file path.
   *
   * @param newLocalPath - The new file path.
   *
   * @returns A promise which resolves with the new file contents model when
   *   the file is renamed.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async rename(
    oldLocalPath: string,
    newLocalPath: string,
    options: Contents.ICreateOptions = {}
  ): Promise<Contents.IModel> {
    let error = '';
    let warning = '';
    let data: Contents.IModel = {
      name: '',
      path: '',
      last_modified: '',
      created: '',
      content: [],
      format: null,
      mimetype: '',
      size: 0,
      writable: true,
      type: ''
    };
    if (oldLocalPath !== '') {
      try {
        const currentDrive = extractCurrentDrive(
          oldLocalPath,
          this._drivesList
        );

        // eliminate drive name from path
        const relativePath = formatPath(oldLocalPath);
        const newRelativePath = formatPath(newLocalPath);

        // extract new file name
        let newFileName = PathExt.basename(newRelativePath);

        try {
          // check if object with chosen name already exists
          await checkObject(currentDrive.name, {
            path: newRelativePath
          });
          newFileName = await this.incrementName(
            newRelativePath,
            currentDrive.name
          );
        } catch (error) {
          // HEAD request failed for this file name, continue, as name doesn't already exist.
        } finally {
          const result = await renameObjects(currentDrive.name, {
            path: relativePath,
            newPath: newRelativePath,
            newFileName: newFileName,
            registeredFileTypes: this._registeredFileTypes
          });

          data = {
            name: newFileName,
            path: PathExt.join(currentDrive.name, result.formattedNewPath!),
            last_modified:
              result.response.length > 0
                ? result.response.data.last_modified
                : '',
            created: '',
            content: PathExt.extname(newFileName) !== '' ? null : [], // TODO: add dir check
            format: result.format!,
            mimetype: result.mimetype!,
            size:
              result.response.length > 0
                ? result.response.data.size
                : undefined,
            writable: true,
            type: result.type!
          };
        }
      } catch (err) {
        error = (err as DrivesResponseError).message;
      }
    } else {
      // create new element at root would mean modifying a drive
      warning = 'Operation not supported.';
    }

    if (error || warning) {
      Notification.emit(warning ?? error, warning ? 'warning' : 'error', {
        autoClose: 5000
      });
    }

    Contents.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'rename',
      oldValue: { path: oldLocalPath },
      newValue: data
    });
    return data;
  }

  /**
   * Helping function to increment name of existing files or directorties.
   *
   * @param localPath - Path to file.
   *
   * @param driveName - The name of the drive where content is counted.

   */
  async incrementName(localPath: string, driveName: string) {
    let fileExtension: string = '';
    let originalName: string = '';

    // extract name from path
    originalName = PathExt.basename(localPath);
    // eliminate file extension
    fileExtension = PathExt.extname(originalName);
    originalName =
      fileExtension !== ''
        ? originalName.split('.')[originalName.split('.').length - 2]
        : originalName;

    const counter = await countObjectNameAppearances(
      driveName,
      localPath,
      originalName
    );
    let newName = counter ? originalName + counter : originalName;
    newName = fileExtension !== '' ? newName + fileExtension : newName;

    return newName;
  }

  /**
   * Save a file.
   *
   * @param localPath - The desired file path.
   *
   * @param options - Optional overrides to the model.
   *
   * @returns A promise which resolves with the file content model when the
   *   file is saved.
   *
   * #### Notes
   * Ensure that `model.content` is populated for the file.
   *
   * Uses the [Jupyter Notebook API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async save(
    localPath: string,
    options: Partial<Contents.IModel> = {}
  ): Promise<Contents.IModel> {
    let error = '';
    let warning = '';
    let data: Contents.IModel = {
      name: '',
      path: '',
      last_modified: '',
      created: '',
      content: [],
      format: null,
      mimetype: '',
      size: 0,
      writable: true,
      type: ''
    };
    if (localPath !== '') {
      try {
        const currentDrive = extractCurrentDrive(localPath, this._drivesList);
        const currentPath = formatPath(localPath);

        const result = await saveObject(currentDrive.name, {
          path: currentPath,
          param: options,
          registeredFileTypes: this._registeredFileTypes
        });

        data = {
          name: currentPath,
          path: PathExt.join(currentDrive.name, currentPath),
          last_modified: result.response.data.last_modified as string,
          created: result.response.data.last_modified as string,
          content: result.response.data.content,
          format: result.format,
          mimetype: result.mimetype,
          size: result.response.data.size,
          writable: true,
          type: result.type
        };
      } catch (err) {
        error = (err as DrivesResponseError).message;
      }
    } else {
      // create new element at root would mean modifying a drive
      warning = 'Operation not supported.';
    }

    if (error || warning) {
      Notification.emit(warning ?? error, warning ? 'warning' : 'error', {
        autoClose: 5000
      });
    }

    Contents.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'save',
      oldValue: null,
      newValue: data
    });
    return data;
  }

  /**
   * Helping function for copying an object.
   *
   * @param copiedItemPath - The original file path.
   *
   * @param toPath - The path where item will be copied.
   *
   * @param driveName - The name of the drive where content is moved.
   *
   * @returns A promise which resolves with the new name when the
   *  file is copied.
   */
  async incrementCopyName(
    copiedItemPath: string,
    toPath: string,
    driveName: string
  ) {
    // extracting original file name
    const originalFileName = PathExt.basename(copiedItemPath);

    // constructing new file name and path with -Copy string
    const newFileName =
      PathExt.extname(originalFileName) === ''
        ? originalFileName + '-Copy'
        : originalFileName.split('.')[0] +
          '-Copy.' +
          originalFileName.split('.')[1];

    const newFilePath = PathExt.join(toPath, newFileName);
    // copiedItemPath.substring(0, copiedItemPath.lastIndexOf('/') + 1) + newFileName;

    // getting incremented name of Copy in case of duplicates
    const incrementedName = await this.incrementName(newFilePath, driveName);

    return incrementedName;
  }

  /**
   * Copy a file into a given directory.
   *
   * @param path - The original file path.
   *
   * @param toDir - The destination directory path.
   *
   * @returns A promise which resolves with the new contents model when the
   *  file is copied.
   */
  async copy(
    path: string,
    toDir: string,
    options: Contents.ICreateOptions = {}
  ): Promise<Contents.IModel> {
    let warning = '';
    let error = '';
    let data: Contents.IModel = {
      name: '',
      path: '',
      last_modified: '',
      created: '',
      content: [],
      format: null,
      mimetype: '',
      size: 0,
      writable: true,
      type: ''
    };
    if (path !== '') {
      try {
        const currentDrive = extractCurrentDrive(path, this._drivesList);
        const toDrive = extractCurrentDrive(toDir, this._drivesList);

        // eliminate drive name from path
        const relativePath = formatPath(path);
        const toRelativePath = formatPath(toDir);

        // construct new file or directory name for the copy
        const newFileName = await this.incrementCopyName(
          relativePath,
          toRelativePath,
          toDrive.name
        );

        const result = await copyObjects(currentDrive.name, {
          path: relativePath,
          toPath: toRelativePath,
          newFileName: newFileName,
          toDrive: toDrive.name,
          registeredFileTypes: this._registeredFileTypes
        });

        data = {
          name: newFileName,
          path: PathExt.join(currentDrive.name, result.formattedNewPath!),
          last_modified: result.response!.data.last_modified,
          created: '',
          content: PathExt.extname(newFileName) !== '' ? null : [], // TODO: add dir check
          format: result.format! as Contents.FileFormat,
          mimetype: result.mimetype!,
          size: result.response!.data.size,
          writable: true,
          type: result.type!
        };
      } catch (err) {
        error = (err as DrivesResponseError).message;
      }
    } else {
      // create new element at root would mean modifying a drive
      warning = 'Operation not supported.';
    }

    if (error || warning) {
      Notification.emit(warning ?? error, warning ? 'warning' : 'error', {
        autoClose: 5000
      });
    }

    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: data
    });
    Contents.validateContentsModel(data);
    return data;
  }

  /**
   * Create a new drive.
   *
   * @param options: The options used to create the drive.
   *
   * @returns A promise which resolves with the contents model.
   */
  async newDrive(
    newDriveName: string,
    region: string
  ): Promise<Contents.IModel> {
    try {
      await createDrive(newDriveName, {
        location: region
      });
    } catch (err) {
      Notification.emit((err as DrivesResponseError).message, 'error', {
        autoClose: 5000
      });
    }

    const data: Contents.IModel = {
      name: newDriveName,
      path: newDriveName,
      last_modified: '',
      created: '',
      content: [],
      format: 'json',
      mimetype: '',
      size: 0,
      writable: true,
      type: 'directory'
    };

    Contents.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: data
    });
    return data;
  }

  /**
   * Add public drive.
   *
   * @param options: The options used to add the public drive.
   *
   * @returns A promise which resolves with the contents model.
   */
  async addPublicDrive(driveUrl: string): Promise<Contents.IModel> {
    try {
      await addPublicDrive(driveUrl);
    } catch (err) {
      Notification.emit((err as DrivesResponseError).message, 'error', {
        autoClose: 5000
      });
    }

    const data: Contents.IModel = {
      name: driveUrl,
      path: driveUrl,
      last_modified: '',
      created: '',
      content: [],
      format: 'json',
      mimetype: '',
      size: 0,
      writable: true,
      type: 'directory'
    };

    Contents.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: data
    });
    return data;
  }

  /**
   * Add external drive.
   *
   * @param options: The options used to add the external drive.
   *
   * @returns A promise which resolves with the contents model.
   */
  async addExternalDrive(
    driveUrl: string,
    location: string
  ): Promise<Contents.IModel> {
    try {
      await addExternalDrive(driveUrl, location);
    } catch (err) {
      Notification.emit((err as DrivesResponseError).message, 'error', {
        autoClose: 5000
      });
    }

    const data: Contents.IModel = {
      name: driveUrl,
      path: driveUrl,
      last_modified: '',
      created: '',
      content: [],
      format: 'json',
      mimetype: '',
      size: 0,
      writable: true,
      type: 'directory'
    };

    Contents.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: data
    });
    return data;
  }

  /**
   * Exclude drive from browser.
   *
   * @param driveName: The name of drive to exclude.
   *
   * @returns A promise which resolves with the contents model.
   */
  async excludeDrive(driveName: string): Promise<Contents.IModel> {
    try {
      await excludeDrive(driveName);
    } catch (err) {
      Notification.emit((err as DrivesResponseError).message, 'error', {
        autoClose: 5000
      });
    }

    const data: Contents.IModel = {
      name: driveName,
      path: driveName,
      last_modified: '',
      created: '',
      content: [],
      format: 'json',
      mimetype: '',
      size: 0,
      writable: true,
      type: 'directory'
    };

    Contents.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'delete',
      oldValue: data,
      newValue: null
    });
    return data;
  }

  /**
   * Include drive in browser listing.
   *
   * @param driveName: The name of drive to include.
   *
   * @returns A promise which resolves with the contents model.
   */
  async includeDrive(driveName: string): Promise<Contents.IModel> {
    try {
      await includeDrive(driveName);
    } catch (err) {
      Notification.emit((err as DrivesResponseError).message, 'error', {
        autoClose: 5000
      });
    }

    const data: Contents.IModel = {
      name: driveName,
      path: driveName,
      last_modified: '',
      created: '',
      content: [],
      format: 'json',
      mimetype: '',
      size: 0,
      writable: true,
      type: 'directory'
    };

    Contents.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: data
    });
    return data;
  }

  /**
   * Create a checkpoint for a file.
   *
   * @param path - The path of the file.
   *
   * @returns A promise which resolves with the new checkpoint model when the
   *   checkpoint is created.
   */
  createCheckpoint(path: string): Promise<Contents.ICheckpointModel> {
    const emptyCheckpoint: Contents.ICheckpointModel = {
      id: '',
      last_modified: ''
    };
    return Promise.resolve(emptyCheckpoint);
  }

  /**
   * List available checkpoints for a file.
   *
   * @param path - The path of the file.
   *
   * @returns A promise which resolves with a list of checkpoint models for
   *    the file.
   */
  listCheckpoints(path: string): Promise<Contents.ICheckpointModel[]> {
    return Promise.resolve([]);
  }

  /**
   * Restore a file to a known checkpoint state.
   *
   * @param path - The path of the file.
   *
   * @param checkpointID - The id of the checkpoint to restore.
   *
   * @returns A promise which resolves when the checkpoint is restored.
   */
  restoreCheckpoint(path: string, checkpointID: string): Promise<void> {
    return Promise.reject('Repository is read only');
  }

  /**
   * Delete a checkpoint for a file.
   *
   * @param path - The path of the file.
   *
   * @param checkpointID - The id of the checkpoint to delete.
   *
   * @returns A promise which resolves when the checkpoint is deleted.
   */
  deleteCheckpoint(path: string, checkpointID: string): Promise<void> {
    return Promise.reject('Read only');
  }

  /**
   * Get all registered file types and store them accordingly with their file
   * extension (e.g.: .txt, .pdf, .jpeg), file mimetype (e.g.: text/plain, application/pdf)
   * and file format (e.g.: base64, text).
   *
   * @param app
   */
  getRegisteredFileTypes(app: JupyterFrontEnd) {
    // get called when instating the toolbar
    const registeredFileTypes = app.docRegistry.fileTypes();

    for (const fileType of registeredFileTypes) {
      // check if we are dealing with a directory
      if (fileType.extensions.length === 0) {
        this._registeredFileTypes[''] = {
          fileType: 'directory',
          fileFormat: 'json',
          fileMimeTypes: ['text/directory']
        };
      }

      // store the mimetype and fileformat for each file extension
      fileType.extensions.forEach(extension => {
        if (!this._registeredFileTypes[extension]) {
          this._registeredFileTypes[extension] = {
            fileType: fileType.name,
            fileMimeTypes: [...fileType.mimeTypes],
            fileFormat: fileType.fileFormat ?? ''
          };
        }
      });
    }
  }

  private _drivesList: IDriveInfo[] = [];
  private _serverSettings: ServerConnection.ISettings;
  private _name: string = '';
  private _provider: string = '';
  private _baseUrl: string = '';
  private _region: string = '';
  private _creationDate: string = '';
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
  private _isDisposed: boolean = false;
  private _disposed = new Signal<this, void>(this);
  private _registeredFileTypes: IRegisteredFileTypes = {};
}

export namespace Drive {
  /**
   * The options used to initialize a `Drive`.
   */
  export interface IOptions {
    /**
     * List of available drives.
     */
    drivesList?: IDriveInfo[];

    /**
     * The name for the `Drive`, which is used in file
     * paths to disambiguate it from other drives.
     */
    name?: string;

    /**
     * The server settings for the server.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * A REST endpoint for drive requests.
     * If not given, defaults to the Jupyter
     * REST API given by [Jupyter Notebook API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents).
     */
    apiEndpoint?: string;
  }
}
