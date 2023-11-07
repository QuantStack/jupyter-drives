// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SidePanel } from '@jupyterlab/ui-components';

export class DefaultAndDrivesFileBrowser extends SidePanel {
  constructor() {
    super();
    this.addClass('jp-DefaultAndDriveBrowser');
  }
}
