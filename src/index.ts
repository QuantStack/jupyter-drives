import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
  //ILabShell,
  //IRouter
} from '@jupyterlab/application';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ITranslator } from '@jupyterlab/translation';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { DriveListModel, DriveListView, IDrive } from './drivelistmanager';
import { DriveIcon } from './icons';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Drive } from './contents';
import { DefaultAndDrivesFileBrowser } from './browser';

const PLUGIN_ID = '@jupyterlab/jupyter:drives';

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
  }
};

/**
 * The JupyterLab plugin for the Drives Filebrowser.
 */
const driveFileBrowserPlugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  requires: [IDocumentManager, IFileBrowserFactory, ISettingRegistry],
  optional: [ILayoutRestorer],
  activate: activateFileBrowser,
  autoStart: true
};

/**
 * Activate the file browser.
 */
function activateFileBrowser(
  app: JupyterFrontEnd,
  manager: IDocumentManager,
  factory: IFileBrowserFactory,
  restorer: ILayoutRestorer | null
): void {
  const panel = new DefaultAndDrivesFileBrowser();
  const addedDrive = new Drive(app.docRegistry);
  addedDrive.name = 'mydrive1';
  manager.services.contents.addDrive(addedDrive);

  const defaultBrowser = factory.createFileBrowser('default-browser', {
    refreshInterval: 300000
  });

  const driveBrowser = factory.createFileBrowser('drive-browser', {
    driveName: addedDrive.name,
    refreshInterval: 300000
  });
  panel.addWidget(defaultBrowser);
  panel.addWidget(driveBrowser);

  panel.title.icon = DriveIcon;
  panel.title.iconClass = 'jp-SideBar-tabIcon';
  panel.title.caption = 'Browse Drives';

  panel.id = 'drive-file-browser';

  // Add the file browser widget to the application restorer.
  if (restorer) {
    restorer.add(panel, 'drive-browser');
  }

  app.shell.add(panel, 'left', { rank: 102 });
}

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
  }
};
const plugins: JupyterFrontEndPlugin<any>[] = [
  plugin,
  openDriveDialogPlugin,
  //defaultFileBrowser
  driveFileBrowserPlugin
];
export default plugins;
