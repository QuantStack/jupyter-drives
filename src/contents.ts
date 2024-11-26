import { JupyterFrontEnd } from '@jupyterlab/application';
import { Signal, ISignal } from '@lumino/signaling';
import { Contents, ServerConnection } from '@jupyterlab/services';

import { IDriveInfo, IRegisteredFileTypes } from './token';
import {
  saveFile,
  getContents,
  mountDrive,
  createObject,
  deleteObjects
} from './requests';

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
    //this._apiEndpoint = options.apiEndpoint ?? SERVICE_DRIVE_URL;
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
  getDownloadUrl(path: string): Promise<string> {
    // Parse the path into user/repo/path
    return Promise.reject('Empty getDownloadUrl method');
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
    let relativePath = '';
    if (localPath !== '') {
      // extract current drive name
      const currentDrive = this._drivesList.filter(
        x =>
          x.name ===
          (localPath.indexOf('/') !== -1
            ? localPath.substring(0, localPath.indexOf('/'))
            : localPath)
      )[0];

      // when accessed the first time, mount drive
      if (currentDrive.mounted === false) {
        try {
          await mountDrive(localPath, {
            provider: currentDrive.provider,
            region: currentDrive.region
          });
          this._drivesList.filter(x => x.name === localPath)[0].mounted = true;
        } catch (e) {
          console.log(e);
        }
      }

      // eliminate drive name from path
      relativePath =
        localPath.indexOf('/') !== -1
          ? localPath.substring(localPath.indexOf('/') + 1)
          : '';

      data = await getContents(currentDrive.name, {
        path: relativePath,
        registeredFileTypes: this._registeredFileTypes
      });
    } else {
      // retriving list of contents from root
      // in our case: list available drives
      const drivesList: Contents.IModel[] = [];
      for (const drive of this._drivesList) {
        drivesList.push({
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

      data = {
        name: this._name,
        path: this._name,
        last_modified: '',
        created: '',
        content: drivesList,
        format: 'json',
        mimetype: '',
        size: undefined,
        writable: true,
        type: 'directory'
      };
    }

    Contents.validateContentsModel(data);
    return data;
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
    const path = options.path ?? '';

    if (path !== '') {
      // extract current drive name
      const currentDrive = this._drivesList.filter(
        x =>
          x.name ===
          (path.indexOf('/') !== -1
            ? path.substring(0, path.indexOf('/'))
            : path)
      )[0];

      // eliminate drive name from path
      const relativePath =
        path.indexOf('/') !== -1 ? path.substring(path.indexOf('/') + 1) : '';

      // get current list of contents of drive
      const old_data = await getContents(currentDrive.name, {
        path: relativePath,
        registeredFileTypes: this._registeredFileTypes
      });

      if (options.type !== undefined) {
        // get incremented untitled name
        const name = this.incrementUntitledName(old_data, options);
        data = await createObject(currentDrive.name, {
          name: name,
          path: relativePath,
          registeredFileTypes: this._registeredFileTypes
        });
      } else {
        console.warn('Type of new element is undefined');
      }
    } else {
      // create new element at root would mean creating a new drive
      console.warn('Operation not supported.');
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
  /*delete(path: string): Promise<void> {
    return Promise.reject('Repository is read only');
  }*/

  async delete(localPath: string): Promise<void> {
    // extract current drive name
    const currentDrive = this._drivesList.filter(
      x =>
        x.name ===
        (localPath.indexOf('/') !== -1
          ? localPath.substring(0, localPath.indexOf('/'))
          : localPath)
    )[0];

    // eliminate drive name from path
    const relativePath =
      localPath.indexOf('/') !== -1
        ? localPath.substring(localPath.indexOf('/') + 1)
        : '';

    await deleteObjects(currentDrive.name, {
      path: relativePath
    });

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
    /*const settings = this.serverSettings;
    const url = this._getUrl(oldLocalPath);
    const init = {
      method: 'PATCH',
      body: JSON.stringify({ path: newLocalPath })
    };
    const response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 200) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();*/

    this._fileChanged.emit({
      type: 'rename',
      oldValue: { path: oldLocalPath },
      newValue: { path: newLocalPath }
    });
    Contents.validateContentsModel(data);
    return data;
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
    // extract current drive name
    const currentDrive = this._drivesList.filter(
      x =>
        x.name ===
        (localPath.indexOf('/') !== -1
          ? localPath.substring(0, localPath.indexOf('/'))
          : localPath)
    )[0];

    // eliminate drive name from path
    const relativePath =
      localPath.indexOf('/') !== -1
        ? localPath.substring(localPath.indexOf('/') + 1)
        : '';

    const data = await saveFile(currentDrive.name, {
      path: relativePath,
      param: options,
      registeredFileTypes: this._registeredFileTypes
    });

    Contents.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'save',
      oldValue: null,
      newValue: data
    });
    return data;
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

  incrementCopyName(contents: Contents.IModel, copiedItemPath: string): string {
    const content: Array<Contents.IModel> = contents.content;
    let name: string = '';
    let countText = 0;
    let countDir = 0;
    let countNotebook = 0;
    let ext = undefined;
    const list1 = copiedItemPath.split('/');
    const copiedItemName = list1[list1.length - 1];

    const list2 = copiedItemName.split('.');
    let rootName = list2[0];

    content.forEach(item => {
      if (item.name.includes(rootName) && item.name.includes('.txt')) {
        ext = '.txt';
        if (rootName.includes('-Copy')) {
          const list3 = rootName.split('-Copy');
          countText = parseInt(list3[1]) + 1;
          rootName = list3[0];
        } else {
          countText = countText + 1;
        }
      }
      if (item.name.includes(rootName) && item.name.includes('.ipynb')) {
        ext = '.ipynb';
        if (rootName.includes('-Copy')) {
          const list3 = rootName.split('-Copy');
          countNotebook = parseInt(list3[1]) + 1;
          rootName = list3[0];
        } else {
          countNotebook = countNotebook + 1;
        }
      } else if (item.name.includes(rootName)) {
        if (rootName.includes('-Copy')) {
          const list3 = rootName.split('-Copy');
          countDir = parseInt(list3[1]) + 1;
          rootName = list3[0];
        } else {
          countDir = countDir + 1;
        }
      }
    });

    if (ext === '.txt') {
      name = rootName + '-Copy' + countText + ext;
    }
    if (ext === 'ipynb') {
      name = rootName + '-Copy' + countText + ext;
    } else if (ext === undefined) {
      name = rootName + '-Copy' + countDir;
    }

    return name;
  }
  async copy(
    fromFile: string,
    toDir: string,
    options: Contents.ICreateOptions = {}
  ): Promise<Contents.IModel> {
    /*const settings = this.serverSettings;
    const url = this._getUrl(toDir);
    const init = {
      method: 'POST',
      body: JSON.stringify({ copy_from: fromFile })
    };
    const response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 201) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();*/

    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: data
    });
    Contents.validateContentsModel(data);
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

  /**
   * Get a REST url for a file given a path.
   */
  /*private _getUrl(...args: string[]): string {
    const parts = args.map(path => URLExt.encodeParts(path));
    const baseUrl = this.serverSettings.baseUrl;
    return URLExt.join(baseUrl, this._apiEndpoint, ...parts);
  }*/

  // private _apiEndpoint: string;
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

/*namespace Private {
  /**
   * Normalize a file extension to be of the type `'.foo'`.
   *
   * Adds a leading dot if not present and converts to lower case.
   */
/*export function normalizeExtension(extension: string): string {
    if (extension.length > 0 && extension.indexOf('.') !== 0) {
      extension = `.${extension}`;
    }
    return extension;
  }
}*/
