import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import {
  createToolbarFactory,
  Dialog,
  IToolbarWidgetRegistry,
  setToolbar,
  showDialog
} from '@jupyterlab/apputils';
import { DriveListModel, DriveListView, IDrive } from './drivelistmanager';
import { DriveIcon } from './icons';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Drive } from './contents';
import { DefaultAndDrivesFileBrowser } from './browser';

const FILE_BROWSER_FACTORY = 'FileBrowser';
const FILE_BROWSER_PLUGIN_ID = '@jupyter/drives:browser';
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
  id: '@jupyter/drives:add-drives',
  description: 'Open a dialog to select drives to be added in the filebrowser.',
  requires: [
    ISettingRegistry,
    IFileBrowserFactory,
    IDocumentManager,
    IToolbarWidgetRegistry,
    ITranslator,
    ILayoutRestorer
  ],
  autoStart: true,
  activate: activateAddDrivesPlugin
};

export function activateAddDrivesPlugin(
  app: JupyterFrontEnd,
  settingRegistry: ISettingRegistry | null,
  factory: IFileBrowserFactory,
  manager: IDocumentManager,
  toolbarRegistry: IToolbarWidgetRegistry,
  translator: ITranslator,
  restorer: ILayoutRestorer | null
): void {
  console.log('AddDrives plugin is activated!');
  const { commands } = app;
  const { tracker } = factory;

  const trans = translator.load('jupyter_drives');
  /* Add a left panel containing the default filebrowser and a dedicated browser for the selected drive*/
  const panel = new DefaultAndDrivesFileBrowser();
  const defaultBrowser = factory.createFileBrowser('default-browser', {
    refreshInterval: 300000
  });
  console.log('tracker:', tracker);

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
  console.log('settingRegistry:', settingRegistry);
  if (settingRegistry) {
    setToolbar(
      driveBrowser,
      createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        FILE_BROWSER_FACTORY,
        FILE_BROWSER_PLUGIN_ID,
        translator
      )
    );
  }

  app.shell.add(panel, 'left', { rank: 102 });

  /* Dialog to select the drive */
  addJupyterLabThemeChangeListener();
  const selectedDrivesModelMap = new Map<IDrive[], DriveListModel>();
  console.log('selectedDrivesModelMap:', selectedDrivesModelMap);
  let selectedDrives: IDrive[] = selectedList1;
  const availableDrives: IDrive[] = availableList1;
  let model = selectedDrivesModelMap.get(selectedDrives);
  console.log('tracker.currentWidget:', tracker.currentWidget);

  commands.addCommand(CommandIDs.openDrivesDialog, {
    execute: async args => {
      if (!model) {
        model = new DriveListModel(availableDrives, selectedDrives);
        console.log('model:', model);

        selectedDrivesModelMap.set(selectedDrives, model);
      } else {
        selectedDrives = model.selectedDrives;
        selectedDrivesModelMap.set(selectedDrives, model);
        console.log('model:', model);
      }

      if (defaultBrowser) {
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
const plugins: JupyterFrontEndPlugin<any>[] = [plugin, AddDrivesPlugin];
export default plugins;
