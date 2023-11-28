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
import { MultiDrivesFileBrowser } from './browser';
import { FilterFileBrowserModel } from '@jupyterlab/filebrowser';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  createToolbarFactory,
  IToolbarWidgetRegistry,
  setToolbar
} from '@jupyterlab/apputils';

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

  const selectedList1: Drive[] = [cocoDrive];
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
  function buildInitialBrowserModelList() {
    const modelList: FilterFileBrowserModel[] = [];
    const drive1 = new Drive(app.docRegistry);
    drive1.name = 'Drive1';
    manager.services.contents.addDrive(drive1);
    const drive1Model = new FilterFileBrowserModel({
      manager: manager,
      driveName: drive1.name
    });

    const drive2 = new Drive(app.docRegistry);
    drive2.name = 'SuperCoolDrive2';
    manager.services.contents.addDrive(drive2);
    const drive2Model = new FilterFileBrowserModel({
      manager: manager,
      driveName: drive2.name
    });

    const localDriveModel = new FilterFileBrowserModel({ manager: manager });
    modelList.push(localDriveModel);
    modelList.push(drive1Model);
    modelList.push(drive2Model);

    return modelList;
  }
  const browserModelList = buildInitialBrowserModelList();
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

  function addDriveContentsToPanel(addedDrive: Drive) {
    manager.services.contents.addDrive(addedDrive);
  }

  /* Dialog to select the drive */
  addJupyterLabThemeChangeListener();
  const selectedDrivesModelMap = new Map<Drive[], DriveListModel>();
  let selectedDrives: Drive[] = selectedList1;
  const availableDrives: Drive[] = availableList1;
  let model = selectedDrivesModelMap.get(selectedDrives);

  commands.addCommand(CommandIDs.openDrivesDialog, {
    execute: async args => {
      if (!model) {
        model = new DriveListModel(availableDrives, selectedDrives);
        selectedDrivesModelMap.set(selectedDrives, model);
      } else {
        selectedDrives = model.selectedDrives;
        selectedDrivesModelMap.set(selectedDrives, model);
      }
      async function onDriveAdded(selectedDrives: Drive[]) {
        if (model) {
          const response = model.sendConnectionRequest(selectedDrives);
          if ((await response) === true) {
            addDriveContentsToPanel(selectedDrives[selectedDrives.length - 1]);
          } else {
            console.warn('Connection with the drive was not possible');
          }
        }
      }

      if (model) {
        showDialog({
          body: new DriveListView(model, app.docRegistry),
          buttons: [Dialog.cancelButton()]
        });
      }

      model.stateChanged.connect(async () => {
        if (model) {
          onDriveAdded(model.selectedDrives);
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
