import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ITranslator } from '@jupyterlab/translation';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { DriveListModel, DriveListView } from './drivelistmanager';
import { DriveIcon } from './icons';
import { IBucket /*, getDrivesList */ } from './s3requests';
import { Drive } from './contents';
import { IDocumentManager } from '@jupyterlab/docmanager';

namespace CommandIDs {
  export const openDrivesDialog = 'drives:open-drives-dialog';
}

async function createDrives(manager: IDocumentManager) {
  /*const s3BucketsList: IBucket[] = await getDrivesList();*/
  const s3BucketsList: IBucket[] = [
    {
      creation_date: '2023-12-15T13:27:57.000Z',
      name: 'jupyter-drive-bucket1',
      provider: 'S3',
      region: 'us-east-1',
      status: 'inactive'
    },
    {
      creation_date: '2023-12-19T08:57:29.000Z',
      name: 'jupyter-drive-bucket2',
      provider: 'S3',
      region: 'us-east-1',
      status: 'inactive'
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

/**
 * Initialization data for the @jupyter/drives extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/drives:plugin',
  description: 'A Jupyter extension to support drives in the backend.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension @jupyter/drives is activated!');
  }
};

const openDriveDialogPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/drives:widget',
  description: 'Open a dialog to select drives to be added in the filebrowser.',
  requires: [IFileBrowserFactory, ITranslator, IDocumentManager],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    translator: ITranslator,
    manager: IDocumentManager
  ): void => {
    addJupyterLabThemeChangeListener();
    const { commands } = app;
    const trans = translator.load('jupyter_drives');
    const availableDrives = createDrives(manager);
    console.log('availableDrives:', availableDrives);
    let selectedDrives: Drive[] = [];
    const selectedDrivesModelMap = new Map<Drive[], DriveListModel>();
    let driveListModel = selectedDrivesModelMap.get(selectedDrives);

    commands.addCommand(CommandIDs.openDrivesDialog, {
      execute: async () => {
        if (!driveListModel) {
          driveListModel = new DriveListModel(
            await availableDrives,
            selectedDrives
          );
          selectedDrivesModelMap.set(selectedDrives, driveListModel);
        } else {
          selectedDrives = driveListModel.selectedDrives;
          selectedDrivesModelMap.set(selectedDrives, driveListModel);
        }
        if (driveListModel) {
          showDialog({
            body: new DriveListView(driveListModel, app.docRegistry),
            buttons: [Dialog.cancelButton()]
          });
        }
      },

      icon: DriveIcon.bindprops({ stylesheet: 'menuItem' }),
      caption: trans.__('Add drives to filebrowser.'),
      label: trans.__('Add Drives To Filebrowser')
    });
  }
};
const plugins: JupyterFrontEndPlugin<any>[] = [plugin, openDriveDialogPlugin];
export default plugins;
