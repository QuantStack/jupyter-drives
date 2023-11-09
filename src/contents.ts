// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Signal, ISignal } from '@lumino/signaling';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents, ServerConnection } from '@jupyterlab/services';

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
    }
  ],
  format: 'json',
  mimetype: '',
  size: undefined,
  writable: true,
  type: 'directory'
};

/**
 * A Contents.IDrive implementation that serves as a read-only
 * view onto the drive repositories.
 */

export class Drive implements Contents.IDrive {
  /**
   * Construct a new drive object.
   *
   * @param options - The options used to initialize the object.
   */
  constructor(registry: DocumentRegistry) {
    this._serverSettings = ServerConnection.makeSettings();
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
   * The Drive is Active getter
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * The Drive isActive provider setter */
  set isActive(isActive: boolean) {
    this._isActive = isActive;
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
    console.log('Path is:', path);
    return Promise.reject('Empty getDownloadUrl method');
  }

  async get(
    path: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    return drive1Contents;
  }

  /**
   * Create a new untitled file or directory in the specified directory path.
   *
   * @param options: The options used to create the file.
   *
   * @returns A promise which resolves with the created file content when the
   *    file is created.
   */
  newUntitled(options: Contents.ICreateOptions = {}): Promise<Contents.IModel> {
    return Promise.reject('Repository is read only');
  }

  /**
   * Delete a file.
   *
   * @param path - The path to the file.
   *
   * @returns A promise which resolves when the file is deleted.
   */
  delete(path: string): Promise<void> {
    return Promise.reject('Repository is read only');
  }

  /**
   * Rename a file or directory.
   *
   * @param path - The original file path.
   *
   * @param newPath - The new file path.
   *
   * @returns A promise which resolves with the new file contents model when
   *   the file is renamed.
   */
  rename(path: string, newPath: string): Promise<Contents.IModel> {
    return Promise.reject('Repository is read only');
  }

  /**
   * Save a file.
   *
   * @param path - The desired file path.
   *
   * @param options - Optional overrides to the model.
   *
   * @returns A promise which resolves with the file content model when the
   *   file is saved.
   */
  save(
    path: string,
    options: Partial<Contents.IModel>
  ): Promise<Contents.IModel> {
    return Promise.reject('Repository is read only');
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
  copy(fromFile: string, toDir: string): Promise<Contents.IModel> {
    return Promise.reject('Repository is read only');
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

  private _serverSettings: ServerConnection.ISettings;
  private _name: string = '';
  private _provider: string = '';
  private _baseUrl: string = '';
  private _isActive: boolean = false;
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
  private _isDisposed: boolean = false;
}
