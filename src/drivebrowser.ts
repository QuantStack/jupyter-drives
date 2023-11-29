// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  BreadCrumbs,
  FilterFileBrowserModel,
  DirListing
} from '@jupyterlab/filebrowser';
import { ITranslator } from '@jupyterlab/translation';
/**
 * The class name added to the filebrowser crumbs node.
 */
const CRUMBS_CLASS = 'jp-FileBrowser-crumbs';

export class DriveBrowser extends DirListing {
  constructor(options: DriveBrowser.IOptions) {
    super({
      model: options.model,
      translator: options.translator,
      renderer: options.renderer
    });

    this.title.label = options.driveName;
    this._breadcrumbs = new BreadCrumbs({
      model: options.model,
      translator: options.translator
    });
    this._breadcrumbs.addClass(CRUMBS_CLASS);
  }

  get breadcrumbs(): BreadCrumbs {
    return this._breadcrumbs;
  }

  private _breadcrumbs: BreadCrumbs;
}

export namespace DriveBrowser {
  /**
   * An options object for initializing DrivesListing widget.
   */
  export interface IOptions {
    /**
     * A file browser model instance.
     */
    model: FilterFileBrowserModel;

    /**
     * A renderer for file items.
     *
     * The default is a shared `Renderer` instance.
     */
    renderer?: DirListing.IRenderer;

    /**
     * A language translator.
     */
    translator?: ITranslator;

    /**
     *Breadcrumbs for the drive .
     */

    breadCrumbs: BreadCrumbs;

    /**
     *Name of the drive .
     */

    driveName: string;
  }
}
