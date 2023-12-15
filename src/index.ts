import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ITranslator } from '@jupyterlab/translation';
import { DriveIcon } from './icons';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Drive } from './contents';
import {
  FileBrowser,
  /*FilterFileBrowserModel,*/
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  createToolbarFactory,
  IToolbarWidgetRegistry,
  setToolbar
} from '@jupyterlab/apputils';

import {
  /*FilenameSearcher, IScore, */ SidePanel
} from '@jupyterlab/ui-components';

/**
 * The class name added to the filebrowser filterbox node.
 */
//const FILTERBOX_CLASS = 'jp-FileBrowser-filterBox';

const FILE_BROWSER_FACTORY = 'FileBrowser';
const FILE_BROWSER_PLUGIN_ID = '@jupyter/drives:widget';

namespace CommandIDs {
  export const removeDriveBrowser = 'drives:remove-drive';
}

/**
 * Initialization data for the @jupyter/drives extension.
 */
/*const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/drives:plugin',
  description: 'A Jupyter extension to support drives in the backend.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension @jupyter/drives is activated!');
  }
};*/
const AddDrivesPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/drives:add-drives',
  description: 'Open a dialog to select drives to be added in the filebrowser.',
  requires: [
    IDocumentManager,
    IToolbarWidgetRegistry,
    ITranslator,
    ILayoutRestorer,
    ISettingRegistry,
    IFileBrowserFactory
  ],
  autoStart: true,
  activate: activateAddDrivesPlugin
};

export async function activateAddDrivesPlugin(
  app: JupyterFrontEnd,
  manager: IDocumentManager,
  toolbarRegistry: IToolbarWidgetRegistry,
  translator: ITranslator,
  restorer: ILayoutRestorer | null,
  settingRegistry: ISettingRegistry,
  factory: IFileBrowserFactory
) {
  console.log('AddDrives plugin is activated!');
  const trans = translator.load('jupyter-drives');
  const cocoDrive = new Drive();
  cocoDrive.name = 'coconutDrive';
  cocoDrive.baseUrl = '/coconut/url';
  cocoDrive.region = '';
  cocoDrive.status = 'active';
  cocoDrive.provider = '';
  manager.services.contents.addDrive(cocoDrive);
  const bananaDrive = new Drive();
  bananaDrive.name = 'bananaDrive';
  bananaDrive.baseUrl = '/banana/url';
  bananaDrive.region = '';
  bananaDrive.status = 'active';
  bananaDrive.provider = '';
  manager.services.contents.addDrive(bananaDrive);
  const driveList: Drive[] = [cocoDrive, bananaDrive];
  function camelCaseToDashedCase(name: string) {
    if (name !== name.toLowerCase()) {
      name = name.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
    }
    return name;
  }

  function createSidePanel(driveName: string) {
    const panel = new SidePanel();
    panel.title.icon = DriveIcon;
    panel.title.iconClass = 'jp-SideBar-tabIcon';
    panel.title.caption = 'Browse Drives';
    panel.id = camelCaseToDashedCase(driveName) + '-file-browser';
    app.shell.add(panel, 'left', { rank: 102 });
    if (restorer) {
      restorer.add(panel, driveName + '-browser');
    }
    app.contextMenu.addItem({
      command: CommandIDs.removeDriveBrowser,
      selector: `.jp-SideBar.lm-TabBar .lm-TabBar-tab[data-id=${panel.id}]`,
      rank: 0
    });

    return panel;
  }
  const PanelDriveBrowserMap = new Map<FileBrowser, SidePanel>();
  function addDriveToPanel(
    drive: Drive,
    factory: IFileBrowserFactory
  ): Map<FileBrowser, SidePanel> {
    const driveBrowser = factory.createFileBrowser('drive-browser', {
      driveName: drive.name
    });
    const panel = createSidePanel(drive.name);
    PanelDriveBrowserMap.set(driveBrowser, panel);
    panel.addWidget(driveBrowser);
    factory.tracker.add(driveBrowser);

    setToolbar(
      panel,
      createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        FILE_BROWSER_FACTORY,
        FILE_BROWSER_PLUGIN_ID,
        translator
      )
    );
    return PanelDriveBrowserMap;
  }

  driveList.forEach(drive => {
    addDriveToPanel(drive, factory);
  });

  function test(node: HTMLElement): boolean {
    return node.title === 'Browse Drives';
  }
  app.commands.addCommand(CommandIDs.removeDriveBrowser, {
    execute: args => {
      if (test !== undefined) {
        const node = app.contextMenuHitTest(test);
        const panelToDispose = Array.from(app.shell.widgets('left')).find(
          widget => widget.id === node?.dataset.id
        );
        panelToDispose?.dispose();
      }
    },
    caption: trans.__('Remove drive filebrowser.'),
    label: trans.__('Remove Drive Filebrowser')
  });
}

const plugins: JupyterFrontEndPlugin<any>[] = [/*plugin,*/ AddDrivesPlugin];
export default plugins;
