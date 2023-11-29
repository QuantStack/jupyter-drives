import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ITranslator } from '@jupyterlab/translation';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { DriveListModel, DriveListView } from './drivelistmanager';
import { DriveIcon } from './icons';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Drive } from './contents';
import { MultiDrivesFileBrowser } from './multidrivesbrowser';
import { BreadCrumbs, FilterFileBrowserModel } from '@jupyterlab/filebrowser';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  createToolbarFactory,
  IToolbarWidgetRegistry,
  setToolbar
} from '@jupyterlab/apputils';
import { DriveBrowser } from './drivebrowser';

const FILE_BROWSER_FACTORY = 'FileBrowser';
const FILE_BROWSER_PLUGIN_ID = '@jupyter/drives:widget';

namespace CommandIDs {
  export const openDrivesDialog = 'drives:open-drives-dialog';
  export const openPath = 'filebrowser:open-path';
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

    requestAPI<any>('get-example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jupyter_drives server extension appears to be missing.\n${reason}`
        );
      });
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
    ISettingRegistry
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
  settingRegistry: ISettingRegistry
) {
  console.log('AddDrives plugin is activated!');
  const { commands } = app;
  const cocoDrive = new Drive(app.docRegistry);
  cocoDrive.name = 'coconutDrive';
  cocoDrive.baseUrl = '/coconut/url';
  cocoDrive.region = '';
  cocoDrive.status = 'active';
  cocoDrive.provider = '';
  const peachDrive = new Drive(app.docRegistry);
  peachDrive.baseUrl = '/peach/url';
  peachDrive.name = 'peachDrive';
  const mangoDrive = new Drive(app.docRegistry);
  mangoDrive.baseUrl = '/mango/url';
  mangoDrive.name = 'mangoDrive';
  const kiwiDrive = new Drive(app.docRegistry);
  kiwiDrive.baseUrl = '/kiwi/url';
  kiwiDrive.name = 'kiwiDrive';
  const pearDrive = new Drive(app.docRegistry);
  pearDrive.baseUrl = '/pear/url';
  pearDrive.name = 'pearDrive';
  const customDrive = new Drive(app.docRegistry);
  customDrive.baseUrl = '/customDrive/url';
  const tomatoDrive = new Drive(app.docRegistry);
  tomatoDrive.baseUrl = '/tomato/url';
  tomatoDrive.name = 'tomatoDrive';
  const avocadoDrive = new Drive(app.docRegistry);
  avocadoDrive.baseUrl = '/avocado/url';
  avocadoDrive.name = 'avocadoDrive';

  const selectedList1: Drive[] = [];
  const availableList1: Drive[] = [
    avocadoDrive,
    cocoDrive,
    customDrive,
    kiwiDrive,
    mangoDrive,
    peachDrive,
    pearDrive,
    tomatoDrive
  ];

  function createFilterFileBrowserModel(
    manager: IDocumentManager,
    drive?: Drive
  ): FilterFileBrowserModel {
    const driveModel = new FilterFileBrowserModel({
      manager: manager,
      driveName: drive?.name
    });

    return driveModel;
  }
  function buildInitialBrowserModelList(selectedDrives: Drive[]) {
    const browserModelList: FilterFileBrowserModel[] = [];
    const localDriveModel = createFilterFileBrowserModel(manager);
    browserModelList.push(localDriveModel);
    return browserModelList;
  }
  const browserModelList = buildInitialBrowserModelList(selectedList1);
  const trans = translator.load('jupyter_drives');
  const panel = new MultiDrivesFileBrowser({
    modelList: browserModelList,
    id: '',
    manager
  });
  panel.title.icon = DriveIcon;
  panel.title.iconClass = 'jp-SideBar-tabIcon';
  panel.title.caption = 'Browse Drives';
  panel.id = 'panel-file-browser';
  if (restorer) {
    restorer.add(panel, 'drive-browser');
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
  function addToBrowserModelList(
    browserModelList: FilterFileBrowserModel[],
    addedDrive: Drive
  ) {
    const addedDriveModel = createFilterFileBrowserModel(manager, addedDrive);
    browserModelList.push(addedDriveModel);
    return browserModelList;
  }
  function addDriveContentsToPanel(
    browserModelList: FilterFileBrowserModel[],
    addedDrive: Drive,
    panel: MultiDrivesFileBrowser
  ) {
    const addedDriveModel = createFilterFileBrowserModel(manager, addedDrive);
    browserModelList = addToBrowserModelList(browserModelList, addedDrive);
    manager.services.contents.addDrive(addedDrive);
    const AddedDriveBrowser = new DriveBrowser({
      model: addedDriveModel,
      breadCrumbs: new BreadCrumbs({ model: addedDriveModel }),
      driveName: addedDrive.name
    });
    panel.addWidget(AddedDriveBrowser);
  }

  /* Dialog to select the drive */
  addJupyterLabThemeChangeListener();
  const selectedDrivesModelMap = new Map<Drive[], DriveListModel>();
  let selectedDrives: Drive[] = selectedList1;
  const availableDrives: Drive[] = availableList1;
  let driveListModel = selectedDrivesModelMap.get(selectedDrives);

  commands.addCommand(CommandIDs.openDrivesDialog, {
    execute: async args => {
      if (!driveListModel) {
        driveListModel = new DriveListModel(availableDrives, selectedDrives);
        selectedDrivesModelMap.set(selectedDrives, driveListModel);
      } else {
        selectedDrives = driveListModel.selectedDrives;
        selectedDrivesModelMap.set(selectedDrives, driveListModel);
      }
      async function onDriveAdded(selectedDrives: Drive[]) {
        if (driveListModel) {
          const response = driveListModel.sendConnectionRequest(selectedDrives);
          if ((await response) === true) {
            addDriveContentsToPanel(
              browserModelList,
              selectedDrives[selectedDrives.length - 1],
              panel
            );
          } else {
            console.warn('Connection with the drive was not possible');
          }
        }
      }

      if (driveListModel) {
        showDialog({
          body: new DriveListView(driveListModel, app.docRegistry),
          buttons: [Dialog.cancelButton()]
        });
      }

      driveListModel.stateChanged.connect(async () => {
        if (driveListModel) {
          onDriveAdded(driveListModel.selectedDrives);
        }
      });
    },

    icon: DriveIcon.bindprops({ stylesheet: 'menuItem' }),
    caption: trans.__('Add drives to filebrowser.'),
    label: trans.__('Add Drives To Filebrowser')
  });
}

const plugins: JupyterFrontEndPlugin<any>[] = [/*plugin,*/ AddDrivesPlugin];
export default plugins;
