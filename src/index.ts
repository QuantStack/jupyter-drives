import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ITranslator } from '@jupyterlab/translation';
import { DriveIcon } from './icons';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Drive } from './contents';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  createToolbarFactory,
  IToolbarWidgetRegistry,
  setToolbar
} from '@jupyterlab/apputils';

import { SidePanel } from '@jupyterlab/ui-components';
import { IBucket } from './s3requests';
import { Dialog, ICommandPalette, showDialog } from '@jupyterlab/apputils';
import { DriveListModel, DriveListView } from './drivelistmanager';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import {
  getDriveContents,
  getDrivesList,
  postDriveMounted
} from './s3requests';

/**
 * The class name added to the filebrowser filterbox node.
 */
//const FILTERBOX_CLASS = 'jp-FileBrowser-filterBox';

const FILE_BROWSER_FACTORY = 'DrivePanel';
const FILE_BROWSER_PLUGIN_ID = '@jupyter/drives:widget';

function buildMountedDriveNameList(driveList: Drive[]): string[] {
  const driveNameList: string[] = [];
  driveList.forEach(drive => {
    driveNameList.push(drive.name);
  });
  return driveNameList;
}

const s3AvailableBuckets = await getDrivesList();
console.log('List of buckets is:', s3AvailableBuckets);
const driveName = 'jupyter-drive-bucket1';
const path = 'examples';
await postDriveMounted(driveName);
const driveContent = await getDriveContents(driveName, path);
console.log('driveContent:', driveContent);
/*const s3AvailableBuckets1: IBucket[] = [
  {
    creation_date: '2023-12-15T13:27:57.000Z',
    name: 'jupyterDriveBucket1',
    provider: 'S3',
    region: 'us-east-1',
    status: 'active'
  },
  {
    creation_date: '2023-12-19T08:57:29.000Z',
    name: 'jupyterDriveBucket2',
    provider: 'S3',
    region: 'us-east-1',
    status: 'inactive'
  },
  {
    creation_date: '2023-12-19T09:07:29.000Z',
    name: 'jupyterDriveBucket3',
    provider: 'S3',
    region: 'us-east-1',
    status: 'inactive'
  },
  {
    creation_date: '2023-12-19T09:07:29.000Z',
    name: 'jupyterDriveBucket4',
    provider: 'S3',
    region: 'us-east-1',
    status: 'active'
  },
  {
    creation_date: '2024-01-12T09:07:29.000Z',
    name: 'jupyterDriveBucket5',
    provider: 'S3',
    region: 'us-east-1',
    status: 'active'
  }
];*/

namespace CommandIDs {
  export const openDrivesDialog = 'drives:open-drives-dialog';
  export const removeDriveBrowser = 'drives:remove-drive-browser';
}

/*async*/ function createDrivesList(bucketList: IBucket[]) {
  const S3Drives: Drive[] = [];
  bucketList.forEach(item => {
    const drive = new Drive();
    drive.name = item.name;
    drive.baseUrl = '';
    drive.region = item.region;
    drive.status = item.status;
    drive.provider = item.provider;
    S3Drives.push(drive);
  });
  return S3Drives;
}

function camelCaseToDashedCase(name: string) {
  if (name !== name.toLowerCase()) {
    name = name.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  }
  return name;
}

function restoreDriveName(id: string) {
  const list1 = id.split('-file-');
  let driveName = list1[0];
  for (let i = 0; i < driveName.length; i++) {
    if (driveName[i] === '-') {
      const index = i;
      const char = driveName.charAt(index + 1).toUpperCase();
      driveName = driveName.replace(driveName.charAt(index + 1), char);
      driveName = driveName.replace(driveName.charAt(index), '');
    }
  }
  return driveName;
}

function createSidePanel(
  driveName: string,
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer
) {
  const panel = new SidePanel();
  panel.title.icon = DriveIcon;
  panel.title.iconClass = 'jp-SideBar-tabIcon';
  panel.title.caption = 'Browse Drives';
  panel.id = camelCaseToDashedCase(driveName) + '-file-browser';
  app.shell.add(panel, 'left', { rank: 102, type: 'DrivePanel' });
  if (restorer) {
    restorer.add(panel, driveName + '-browser');
  }
  return panel;
}

const AddDrivesPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/drives:add-drives',
  description: 'Open a dialog to select drives to be added in the filebrowser.',
  requires: [
    ICommandPalette,
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

export /*async */ function activateAddDrivesPlugin(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  manager: IDocumentManager,
  toolbarRegistry: IToolbarWidgetRegistry,
  translator: ITranslator,
  restorer: ILayoutRestorer,
  settingRegistry: ISettingRegistry,
  factory: IFileBrowserFactory
) {
  addJupyterLabThemeChangeListener();
  const selectedDrivesModelMap = new Map<Drive[], DriveListModel>();
  let selectedDrives: Drive[] = [];
  const availableDrives = createDrivesList(s3AvailableBuckets);
  let driveListModel = selectedDrivesModelMap.get(selectedDrives);
  const mountedDriveNameList: string[] =
    buildMountedDriveNameList(selectedDrives);
  console.log('AddDrives plugin is activated!');
  const trans = translator.load('jupyter-drives');

  function createDriveFileBrowser(drive: Drive) {
    manager.services.contents.addDrive(drive);
    const driveBrowser = factory.createFileBrowser('drive-browser', {
      driveName: drive.name
    });

    const panel = createSidePanel(drive.name, app, restorer);
    app.contextMenu.addItem({
      command: CommandIDs.removeDriveBrowser,
      selector: `.jp-SideBar.lm-TabBar .lm-TabBar-tab[data-id=${panel.id}]`,
      rank: 0
    });
    drive?.disposed.connect(() => {
      panel.dispose();
    });

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
    panel.addWidget(driveBrowser);
  }

  app.commands.addCommand(CommandIDs.openDrivesDialog, {
    execute: /*async*/ () => {
      if (!driveListModel) {
        driveListModel = new DriveListModel(
          /*await*/ availableDrives,
          selectedDrives
        );
        selectedDrivesModelMap.set(selectedDrives, driveListModel);
      } else {
        selectedDrives = driveListModel.selectedDrives;
        selectedDrivesModelMap.set(selectedDrives, driveListModel);
      }

      function onDriveAdded(driveList: Drive[]) {
        const drive: Drive = driveList[driveList.length - 1];
        if (driveListModel) {
          if (!mountedDriveNameList.includes(drive.name)) {
            createDriveFileBrowser(drive);
            mountedDriveNameList.push(drive.name);
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
    caption: trans.__('Add a new drive filebrowser.'),
    label: trans.__('Add A New Drive Filebrowser')
  });
  const command = 'drives:open-drives-dialog';
  palette.addItem({ command, category: 'Drives' });

  function test(node: HTMLElement): boolean {
    return node.title === 'Browse Drives';
  }
  app.commands.addCommand(CommandIDs.removeDriveBrowser, {
    execute: args => {
      if (test !== undefined) {
        const node = app.contextMenuHitTest(test);
        if (node?.dataset.id) {
          const driveName = restoreDriveName(node?.dataset.id);
          if (driveListModel) {
            const drive = driveListModel.selectedDrives.find(
              drive => drive.name === driveName
            );
            if (drive) {
              const index = driveListModel.selectedDrives.indexOf(drive, 0);
              if (index > -1) {
                driveListModel.selectedDrives.splice(index, 1);
                console.warn(
                  `Drive ${drive.name} is being disposed as well as the respective ${node?.dataset.id} panel.`
                );
              }
            }
            drive?.dispose();
          }
        }
      }
    },
    caption: trans.__('Remove drive filebrowser.'),
    label: trans.__('Remove Drive Filebrowser')
  });
}

const plugins: JupyterFrontEndPlugin<any>[] = [plugin, AddDrivesPlugin];
export default plugins;
