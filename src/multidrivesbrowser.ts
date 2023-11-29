// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import { Contents } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { SidePanel } from '@jupyterlab/ui-components';
import {
  BreadCrumbs,
  FilterFileBrowserModel,
  DirListing
} from '@jupyterlab/filebrowser';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { AccordionPanel } from '@lumino/widgets';
import { BreadCrumbsLayout } from './crumbslayout';
import { DriveBrowser } from './drivebrowser';

/*
 * The class name added to file browsers.
 */
const FILE_BROWSER_CLASS = 'jp-FileBrowser';

/**
 * The class name added to file browser panel (gather filter, breadcrumbs and listing).
 */
const FILE_BROWSER_PANEL_CLASS = 'jp-MultiDrivesFileBrowser-Panel';

/**
 * The class name added to the filebrowser toolbar node.
 */
const TOOLBAR_CLASS = 'jp-FileBrowser-toolbar';

/**
 * The class name added to the filebrowser listing node.
 */
const LISTING_CLASS = 'jp-FileBrowser-listing';

export class MultiDrivesFileBrowser extends SidePanel {
  /**
   * Construct a new file browser with multiple drivelistings.
   *
   * @param options - The file browser options.
   */
  constructor(options: MultiDrivesFileBrowser.IOptions) {
    super({
      content: new AccordionPanel({
        layout: new BreadCrumbsLayout({
          renderer: BreadCrumbsLayout.defaultRenderer
        })
      })
    });

    this.addClass(FILE_BROWSER_CLASS);

    this.toolbar.addClass(TOOLBAR_CLASS);
    this.id = options.id;

    const translator = (this.translator = options.translator ?? nullTranslator);
    const modelList = (this.modelList = options.modelList);
    this.manager = options.manager;

    this.addClass(FILE_BROWSER_PANEL_CLASS);
    this.title.label = this._trans.__('');

    this.toolbar.node.setAttribute('role', 'navigation');
    this.toolbar.node.setAttribute(
      'aria-label',
      this._trans.__('file browser')
    );

    const renderer = options.renderer;

    modelList.forEach(model => {
      let driveName = model.driveName;
      if (model.driveName === '') {
        driveName = 'Local Drive';
      }
      console.log('driveName:', driveName);
      const listing = new DriveBrowser({
        model: model,
        translator: translator,
        renderer: renderer,
        breadCrumbs: new BreadCrumbs({
          model: model,
          translator: translator
        }),
        driveName: driveName
      });

      listing.addClass(LISTING_CLASS);
      this.addWidget(listing);

      if (options.restore !== false) {
        void model.restore(this.id);
      }
    });
  }

  /**
   * Create the underlying DirListing instance.
   *
   * @param options - The DirListing constructor options.
   *
   * @returns The created DirListing instance.
   */
  protected createDriveBrowser(options: DriveBrowser.IOptions): DriveBrowser {
    return new DriveBrowser(options);
  }

  /**
   * Rename the first currently selected item.
   *
   * @returns A promise that resolves with the new name of the item.
   */
  rename(listing: DriveBrowser): Promise<string> {
    return listing.rename();
  }

  private async _createNew(
    options: Contents.ICreateOptions,
    listing: DriveBrowser
  ): Promise<Contents.IModel> {
    try {
      const model = await this.manager.newUntitled(options);

      await listing.selectItemByName(model.name, true);
      await listing.rename();
      return model;
    } catch (error: any) {
      void showErrorMessage(this._trans.__('Error'), error);
      throw error;
    }
  }

  /**
   * Create a new directory
   */
  async createNewDirectory(
    model: FilterFileBrowserModel,
    listing: DriveBrowser
  ): Promise<Contents.IModel> {
    if (this._directoryPending) {
      return this._directoryPending;
    }
    this._directoryPending = this._createNew(
      {
        path: model.path,
        type: 'directory'
      },
      listing
    );
    try {
      return await this._directoryPending;
    } finally {
      this._directoryPending = null;
    }
  }

  /**
   * Create a new file
   */
  async createNewFile(
    options: MultiDrivesFileBrowser.IFileOptions,
    model: FilterFileBrowserModel,
    listing: DriveBrowser
  ): Promise<Contents.IModel> {
    if (this._filePending) {
      return this._filePending;
    }
    this._filePending = this._createNew(
      {
        path: model.path,
        type: 'file',
        ext: options.ext
      },
      listing
    );
    try {
      return await this._filePending;
    } finally {
      this._filePending = null;
    }
  }

  protected translator: ITranslator;
  private manager: IDocumentManager;
  private _directoryPending: Promise<Contents.IModel> | null = null;
  private _filePending: Promise<Contents.IModel> | null = null;
  readonly modelList: FilterFileBrowserModel[];
}

export namespace MultiDrivesFileBrowser {
  /**
   * An options object for initializing a file browser widget.
   */
  export interface IOptions {
    /**
     * The widget/DOM id of the file browser.
     */
    id: string;

    /**
     * A file browser model instance.
     */
    modelList: FilterFileBrowserModel[];

    /**
     * A file browser document document manager
     */
    manager: IDocumentManager;

    /**
     * An optional renderer for the directory listing area.
     *
     * The default is a shared instance of `DirListing.Renderer`.
     */
    renderer?: DirListing.IRenderer;

    /**
     * Whether a file browser automatically restores state when instantiated.
     * The default is `true`.
     *
     * #### Notes
     * The file browser model will need to be restored manually for the file
     * browser to be able to save its state.
     */
    restore?: boolean;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * An options object for creating a file.
   */
  export interface IFileOptions {
    /**
     * The file extension.
     */
    ext: string;
  }
}
