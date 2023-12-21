import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ITranslator } from '@jupyterlab/translation';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { DriveListModel, DriveListView, IDrive } from './drivelistmanager';
import { DriveIcon } from './icons';
//import { IDocumentManager } from '@jupyterlab/docmanager';
import { IBucket /*, getDrivesList */ } from './s3requests';
import { Drive } from './contents';

namespace CommandIDs {
  export const openDrivesDialog = 'drives:open-drives-dialog';
}

/*async */ function createDrives() {
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
    //manager.services.contents.addDrive(drive);
    availableS3Buckets.push(drive);
  });
  return availableS3Buckets;
}
const drivesList = createDrives();
console.log(drivesList);

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
  requires: [IFileBrowserFactory, ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    translator: ITranslator
  ): void => {
    addJupyterLabThemeChangeListener();
    const { commands } = app;
    const { tracker } = factory;
    const trans = translator.load('jupyter_drives');
    const selectedDrivesModelMap = new Map<IDrive[], DriveListModel>();

    let selectedDrives: IDrive[] = [
      {
        name: 'CoconutDrive',
        url: '/coconut/url'
      }
    ];

    const availableDrives: IDrive[] = [
      {
        name: 'CoconutDrive',
        url: '/coconut/url'
      },
      {
        name: 'PearDrive',
        url: '/pear/url'
      },
      {
        name: 'StrawberryDrive',
        url: '/strawberrydrive/url'
      },
      {
        name: 'BlueberryDrive',
        url: '/blueberrydrive/url'
      },
      {
        name: '',
        url: '/mydrive/url'
      },
      {
        name: 'RaspberryDrive',
        url: '/raspberrydrive/url'
      },

      {
        name: 'PineAppleDrive',
        url: ''
      },

      { name: 'PomeloDrive', url: '/https://pomelodrive/url' },
      {
        name: 'OrangeDrive',
        url: ''
      },
      {
        name: 'TomatoDrive',
        url: ''
      },
      {
        name: '',
        url: 'superDrive/url'
      },
      {
        name: 'AvocadoDrive',
        url: ''
      }
    ];
    let model = selectedDrivesModelMap.get(selectedDrives);

    commands.addCommand(CommandIDs.openDrivesDialog, {
      execute: async args => {
        const widget = tracker.currentWidget;
        //const listOfDrives = await createDrives(docmanager);
        //console.log('listOfDrives:', listOfDrives);
        if (!model) {
          model = new DriveListModel(availableDrives, selectedDrives);
          selectedDrivesModelMap.set(selectedDrives, model);
        } else {
          selectedDrives = model.selectedDrives;
          selectedDrivesModelMap.set(selectedDrives, model);
        }
        if (widget) {
          if (model) {
            showDialog({
              body: new DriveListView(model),
              buttons: [Dialog.cancelButton()]
            });
          }
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
