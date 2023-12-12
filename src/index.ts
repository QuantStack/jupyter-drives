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
  /*FileBrowser,
  FilterFileBrowserModel,*/
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
  //const { commands } = app;
  //const trans = translator.load('jupyter-drives');
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

  const DriveList: Drive[] = [cocoDrive, bananaDrive];

  function addNewDriveToPanel(drive: Drive, factory: IFileBrowserFactory) {
    const panel = new SidePanel();
    //const drive = bananaDrive;
    /*const driveModel = new FilterFileBrowserModel({
    manager: manager,
    driveName: drive.name
  });

  const driveBrowser = new FileBrowser({
    id: drive.name + '-browser',
    model: driveModel
  });*/
    //console.log('factory', factory);

    const driveBrowser = factory.createFileBrowser('drive-browser', {
      driveName: drive.name
    });

    factory.tracker.add(driveBrowser);
    panel.addWidget(driveBrowser);
    panel.title.icon = DriveIcon;
    panel.title.iconClass = 'jp-SideBar-tabIcon';
    panel.title.caption = 'Browse Drives';

    panel.id = drive.name + '-file-browser';

    if (restorer) {
      restorer.add(panel, drive.name + '-browser');
    }
    app.shell.add(panel, 'left', { rank: 102 });

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
  }

  DriveList.forEach(drive => {
    console.log(drive.name);
    addNewDriveToPanel(bananaDrive, factory);
  });
}

const plugins: JupyterFrontEndPlugin<any>[] = [/*plugin,*/ AddDrivesPlugin];
export default plugins;
