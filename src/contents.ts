// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Signal, ISignal } from '@lumino/signaling';
import { Contents, ServerConnection } from '@jupyterlab/services';
//import { URLExt } from '@jupyterlab/coreutils';

/*
 * The url for the default drive service.
 */
//const SERVICE_DRIVE_URL = 'api/contents';

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

const drive1Contents: Contents.IModel = {
  name: 'Drive1',
  path: 'Drive1',
  last_modified: '2023-10-31T12:39:42.832781Z',
  created: '2023-10-31T12:39:42.832781Z',
  content: [
    {
      name: 'voila2.ipynb',
      path: 'Drive1/voila2.ipynb',
      last_modified: '2022-10-12T21:33:04.798185Z',
      created: '2022-11-09T12:37:21.020396Z',
      content: null,
      format: null,
      mimetype: null,
      size: 5377,
      writable: true,
      type: 'notebook'
    },
    {
      name: 'Untitled.ipynb',
      path: 'Drive1/Untitled.ipynb',
      last_modified: '2023-10-25T08:20:09.395167Z',
      created: '2023-10-25T08:20:09.395167Z',
      content: null,
      format: null,
      mimetype: null,
      size: 4772,
      writable: true,
      type: 'notebook'
    },
    {
      name: 'voila.ipynb',
      path: 'Drive1/voila.ipynb',
      last_modified: '2023-10-31T09:43:05.235448Z',
      created: '2023-10-31T09:43:05.235448Z',
      content: null,
      format: null,
      mimetype: null,
      size: 2627,
      writable: true,
      type: 'notebook'
    },
    {
      name: 'b.ipynb',
      path: 'Drive1/b.ipynb',
      last_modified: '2023-10-26T15:21:06.152419Z',
      created: '2023-10-26T15:21:06.152419Z',
      content: null,
      format: null,
      mimetype: null,
      size: 1198,
      writable: true,
      type: 'notebook'
    },
    {
      name: '_output',
      path: '_output',
      last_modified: '2023-10-31T12:39:41.222780Z',
      created: '2023-10-31T12:39:41.222780Z',
      content: null,
      format: null,
      mimetype: null,
      size: null,
      writable: true,
      type: 'directory'
    },
    {
      name: 'a.ipynb',
      path: 'Drive1/a.ipynb',
      last_modified: '2023-10-25T10:07:09.141206Z',
      created: '2023-10-25T10:07:09.141206Z',
      content: null,
      format: null,
      mimetype: null,
      size: 8014,
      writable: true,
      type: 'notebook'
    },
    {
      name: 'environment.yml',
      path: 'Drive1/environment.yml',
      last_modified: '2023-10-31T09:33:57.415583Z',
      created: '2023-10-31T09:33:57.415583Z',
      content: null,
      format: null,
      mimetype: null,
      size: 153,
      writable: true,
      type: 'file'
    },
    {
      name: 'untitled.txt',
      path: 'Drive1/untitled.txt',
      last_modified: '2023-10-25T08:20:09.395167Z',
      created: '2023-10-25T08:20:09.395167Z',
      content: null,
      format: null,
      mimetype: 'text/plain',
      size: 4772,
      writable: true,
      type: 'txt'
    },
    {
      name: 'untitled1.txt',
      path: 'Drive1/untitled1.txt',
      last_modified: '2023-10-25T08:20:09.395167Z',
      created: '2023-10-25T08:20:09.395167Z',
      content: null,
      format: null,
      mimetype: 'text/plain',
      size: 4772,
      writable: true,
      type: 'txt'
    },
    {
      name: 'Untitled Folder',
      path: 'Drive1/Untitled Folder',
      last_modified: '2023-10-25T08:20:09.395167Z',
      created: '2023-10-25T08:20:09.395167Z',
      content: [],
      format: null,
      mimetype: '',
      size: 0,
      writable: true,
      type: 'directory'
    }
  ],

  format: 'json',
  mimetype: '',
  size: undefined,
  writable: true,
  type: 'directory'
};

export class Drive implements Contents.IDrive {
  /**
   * Construct a new drive object.
   *
   * @param options - The options used to initialize the object.
   */
  constructor(options: Drive.IOptions = {}) {
    this._serverSettings = ServerConnection.makeSettings();
    //this._apiEndpoint = options.apiEndpoint ?? SERVICE_DRIVE_URL;
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
   * The Drive status getter (if it is active or not)
   */
  get status(): string {
    return this._status;
  }

  /**
   * The Drive status setter */
  set status(status: string) {
    this._status = status;
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
   * Dispose of the resources held by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
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
    path: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    /*
    let url = this._getUrl(localPath);
    if (options) {
      // The notebook type cannot take an format option.
      if (options.type === 'notebook') {
        delete options['format'];
      }
      const content = options.content ? '1' : '0';
      const params: PartialJSONObject = { ...options, content };
      url += URLExt.objectToQueryString(params);
    }

    const settings = this.serverSettings;
    const response = await ServerConnection.makeRequest(url, {}, settings);
    if (response.status !== 200) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();*/

    const data = drive1Contents;
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
    /*let body = '{}';
    if (options) {
      if (options.ext) {
        options.ext = Private.normalizeExtension(options.ext);
      }
      body = JSON.stringify(options);
    }

    const settings = this.serverSettings;
    const url = this._getUrl(options.path ?? '');
    const init = {
      method: 'POST',
      body
    };
    const response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 201) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();*/

    if (options.type !== undefined) {
      if (options.type !== 'directory') {
        const name = this.incrementUntitledName(drive1Contents, options);
        data = {
          name: name,
          path: options.path + '/' + name,
          last_modified: '2023-12-06T10:37:42.089566Z',
          created: '2023-12-06T10:37:42.089566Z',
          content: null,
          format: null,
          mimetype: '',
          size: 0,
          writable: true,
          type: options.type
        };
      } else {
        const name = this.incrementUntitledName(drive1Contents, options);
        data = {
          name: name,
          path: options.path + '/' + name,
          last_modified: '2023-12-06T10:37:42.089566Z',
          created: '2023-12-06T10:37:42.089566Z',
          content: [],
          format: 'json',
          mimetype: '',
          size: undefined,
          writable: true,
          type: options.type
        };
      }
    } else {
      console.warn('Type of new element is undefined');
    }

    drive1Contents.content.push(data);

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
    /*const url = this._getUrl(localPath);
    const settings = this.serverSettings;
    const init = { method: 'DELETE' };
    const response = await ServerConnection.makeRequest(url, init, settings);
    // TODO: update IPEP27 to specify errors more precisely, so
    // that error types can be detected here with certainty.
    if (response.status !== 204) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }*/

    const content: Array<Contents.IModel> = drive1Contents.content;

    content.forEach(item => {
      if (item.path === localPath) {
        const index = content.indexOf(item);
        if (index !== -1) {
          content.splice(index, 1);
        }
      }
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

    const content: Array<Contents.IModel> = drive1Contents.content;
    content.forEach(item => {
      if (item.name === oldLocalPath) {
        const index = content.indexOf(item);
        const oldData = content[index];
        const { ...newData } = oldData;
        newData.name = newLocalPath;
        newData.path = oldData.path.replace(oldData.name, newData.name);
        content.splice(index, 1);
        content.push(newData);
      }
    });
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
    /*const settings = this.serverSettings;
    const url = this._getUrl(localPath);
    const init = {
      method: 'PUT',
      body: JSON.stringify(options)
    };
    const response = await ServerConnection.makeRequest(url, init, settings);
    // will return 200 for an existing file and 201 for a new file
    if (response.status !== 200 && response.status !== 201) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();*/

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

    const content: Array<Contents.IModel> = drive1Contents.content;
    content.forEach(item => {
      if (item.path === fromFile) {
        const index = content.indexOf(item);
        const oldData = content[index];
        const { ...newData } = oldData;
        newData.name = this.incrementCopyName(drive1Contents, fromFile);
        newData.path = oldData.path.replace(oldData.name, newData.name);
        content.push(newData);
      }
    });

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
    return Promise.reject('Repository is read only');
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
   * Get a REST url for a file given a path.
   */
  /*private _getUrl(...args: string[]): string {
    const parts = args.map(path => URLExt.encodeParts(path));
    const baseUrl = this.serverSettings.baseUrl;
    return URLExt.join(baseUrl, this._apiEndpoint, ...parts);
  }*/

  // private _apiEndpoint: string;
  private _serverSettings: ServerConnection.ISettings;
  private _name: string = '';
  private _provider: string = '';
  private _baseUrl: string = '';
  private _status: string = 'active' || 'inactive';
  private _region: string = '';
  private _creationDate: string = '';
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
  private _isDisposed: boolean = false;
}

export namespace Drive {
  /**
   * The options used to initialize a `Drive`.
   */
  export interface IOptions {
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
