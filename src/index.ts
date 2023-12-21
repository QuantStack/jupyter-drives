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
  /*FileBrowser,*/
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

import { IBucket } from './s3requests';

/**
 * The class name added to the filebrowser filterbox node.
 */
//const FILTERBOX_CLASS = 'jp-FileBrowser-filterBox';

const FILE_BROWSER_FACTORY = 'FileBrowser';
const FILE_BROWSER_PLUGIN_ID = '@jupyter/drives:widget';

namespace CommandIDs {
  export const addDriveBrowser = 'drives:add-drive-browser';
  export const removeDriveBrowser = 'drives:remove-drive-browser';
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

async function createDrivesList(manager: IDocumentManager) {
  /*const s3BucketsList: IBucket[] = await getDrivesList();*/
  const s3BucketsList: IBucket[] = [
    {
      creation_date: '2023-12-15T13:27:57.000Z',
      name: 'jupyter-drive-bucket1',
      provider: 'S3',
      region: 'us-east-1',
      status: 'active'
    },
    {
      creation_date: '2023-12-19T08:57:29.000Z',
      name: 'jupyter-drive-bucket2',
      provider: 'S3',
      region: 'us-east-1',
      status: 'inactive'
    },
    {
      creation_date: '2023-12-19T09:07:29.000Z',
      name: 'jupyter-drive-bucket3',
      provider: 'S3',
      region: 'us-east-1',
      status: 'active'
    }
  ];

  const availableS3Buckets: Drive[] = [];
  s3BucketsList.forEach(item => {
    const drive = new Drive();
    drive.name = item.name;
    drive.baseUrl = '';
    drive.region = item.region;
    drive.status = item.status;
    drive.provider = item.provider;
    manager.services.contents.addDrive(drive);
    availableS3Buckets.push(drive);
  });
  return availableS3Buckets;
}
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
  const driveList: Drive[] = await createDrivesList(manager);

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

  app.commands.addCommand(CommandIDs.addDriveBrowser, {
    execute: async args => {
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
      function addDriveToPanel(
        drive: Drive,
        factory: IFileBrowserFactory
      ): void {
        const driveBrowser = factory.createFileBrowser('drive-browser', {
          driveName: drive.name
        });
        const panel = createSidePanel(drive.name);
        drive.disposed.connect(() => {
          panel.dispose();
        });
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
      }

      /*driveList.forEach(drive => {
        addDriveToPanel(drive, factory);
      });*/
    },
    caption: trans.__('Add drive filebrowser.'),
    label: trans.__('Add Drive Filebrowser')
  });

  app.commands.execute('drives:add-drive-browser');

  function test(node: HTMLElement): boolean {
    return node.title === 'Browse Drives';
  }
  app.commands.addCommand(CommandIDs.removeDriveBrowser, {
    execute: args => {
      if (test !== undefined) {
        const node = app.contextMenuHitTest(test);
        if (node?.dataset.id) {
          const driveName = restoreDriveName(node?.dataset.id);
          const drive = driveList.find(drive => drive.name === driveName);
          drive?.dispose();
        }
      }
    },
    caption: trans.__('Remove drive filebrowser.'),
    label: trans.__('Remove Drive Filebrowser')
  });
}

const plugins: JupyterFrontEndPlugin<any>[] = [/*plugin,*/ AddDrivesPlugin];
export default plugins;
