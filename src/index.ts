import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ITranslator } from '@jupyterlab/translation';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { DriveListModel, DriveListView, IDrive } from './drivelistmanager';
import { DriveIcon } from './icons';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Drive } from './contents';
import { DefaultAndDrivesFileBrowser } from './browser';

const selectedList1 = [
  {
    name: 'CoconutDrive',
    url: '/coconut/url'
  }
];

const availableList1 = [
  {
    name: 'CoconutDrive',
    url: '/coconut/url'
  },
  {
    name: 'PeachDrive',
    url: '/peach/url'
  },
  {
    name: 'WaterMelonDrive',
    url: '/WaterMelonDrive/url'
  },
  {
    name: 'MangoDrive',
    url: '/mango/url'
  },
  {
    name: 'KiwiDrive',
    url: '/kiwi/url'
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

namespace CommandIDs {
  export const openDrivesDialog = 'drives:open-drives-dialog';
  export const openPath = 'filebrowser:open-path';
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
};

const AddDrivesPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/jupyter:drives',
  description: 'Open a dialog to select drives to be added in the filebrowser.',
  requires: [
    IFileBrowserFactory,
    IDocumentManager,
    ITranslator,
    ILayoutRestorer
  ],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    manager: IDocumentManager,
    translator: ITranslator,
    restorer: ILayoutRestorer | null
  ): void => {
    const { commands } = app;
    const { tracker } = factory;
    const trans = translator.load('jupyter_drives');

    /* Dialog to select the drive */
    addJupyterLabThemeChangeListener();
    const selectedDrivesModelMap = new Map<IDrive[], DriveListModel>();
    let selectedDrives: IDrive[] = selectedList1;
    const availableDrives: IDrive[] = availableList1;
    let model = selectedDrivesModelMap.get(selectedDrives);

    commands.addCommand(CommandIDs.openDrivesDialog, {
      execute: async args => {
        const widget = tracker.currentWidget;

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

    /* Add a left panel containing the default filebrowser and a dedicated browser for the selected drive*/
    const panel = new DefaultAndDrivesFileBrowser();
    const defaultBrowser = factory.createFileBrowser('default-browser', {
      refreshInterval: 300000
    });

    const addedDrive = new Drive(app.docRegistry);
    addedDrive.name = 'mydrive1';
    manager.services.contents.addDrive(addedDrive);
    const driveBrowser = factory.createFileBrowser('drive-browser', {
      driveName: addedDrive.name,
      refreshInterval: 300000
    });
    panel.addWidget(defaultBrowser);
    panel.addWidget(driveBrowser);

    panel.title.icon = DriveIcon;
    panel.title.iconClass = 'jp-SideBar-tabIcon';
    panel.title.caption = 'Browse Drives';
    panel.id = 'panel-file-browser';

    if (restorer) {
      restorer.add(panel, 'drive-browser');
    }

    app.shell.add(panel, 'left', { rank: 102 });
  }
};
const plugins: JupyterFrontEndPlugin<any>[] = [plugin, AddDrivesPlugin];
export default plugins;
