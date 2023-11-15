import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

//import { requestAPI } from './handler';
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
import { DrivesFileBrowser } from './browser';

const FILE_BROWSER_FACTORY = 'FileBrowser';
const FILE_BROWSER_PLUGIN_ID = '@jupyter/drives:widget';
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
    url: '/watermelondrive/url'
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
    url: '/apple/url'
  },
  {
    name: 'RaspberryDrive',
    url: '/raspberrydrive/url'
  },

  {
    name: 'PineappleDrive',
    url: '/pineappledrive/url'
  },

  { name: 'PomeloDrive', url: '/https://pomelodrive/url' },
  {
    name: 'OrangeDrive',
    url: 'orangedrive/url'
  },
  {
    name: 'TomatoDrive',
    url: 'tomatodrive/url'
  },
  {
    name: '',
    url: 'plumedrive/url'
  },
  {
    name: 'AvocadoDrive',
    url: 'avocadodrive/url'
  }
];

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

export async function activateAddDrivesPlugin(
  app: JupyterFrontEnd,
  settingRegistry: ISettingRegistry | null,
  factory: IFileBrowserFactory,
  manager: IDocumentManager,
  toolbarRegistry: IToolbarWidgetRegistry,
  translator: ITranslator,
  restorer: ILayoutRestorer | null
): Promise<void> {
  console.log('AddDrives plugin is activated!');
  const { commands } = app;
  //const { tracker } = factory;

  const trans = translator.load('jupyter_drives');
  /* Add a left panel containing the default filebrowser and a dedicated browser for the selected drive*/
  const panel = new DrivesFileBrowser();
  const defaultBrowser = factory.createFileBrowser('default-browser', {
    refreshInterval: 300000
  });
  panel.addWidget(defaultBrowser);
  panel.title.icon = DriveIcon;
  panel.title.iconClass = 'jp-SideBar-tabIcon';
  panel.title.caption = 'Browse Drives';
  panel.id = 'panel-file-browser';
  if (settingRegistry) {
    setToolbar(
      defaultBrowser,
      createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        FILE_BROWSER_FACTORY,
        FILE_BROWSER_PLUGIN_ID,
        translator
      )
    );
  }

  if (restorer) {
    restorer.add(panel, 'drive-browser');
  }
  app.shell.add(panel, 'left', { rank: 102 });
  const drive1 = new Drive(app.docRegistry);
  drive1.name = 'mydrive1';

  function addDriveContentsToPanel(
    panel: DrivesFileBrowser,
    addedDrive: Drive
  ) {
    manager.services.contents.addDrive(addedDrive);
    const driveBrowser = factory.createFileBrowser('drive-browser', {
      driveName: addedDrive.name,
      refreshInterval: 300000
    });

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

    panel.addWidget(driveBrowser);
  }

  /* Dialog to select the drive */
  addJupyterLabThemeChangeListener();
  const selectedDrivesModelMap = new Map<IDrive[], DriveListModel>();
  let selectedDrives: IDrive[] = selectedList1;
  const availableDrives: IDrive[] = availableList1;
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
      async function onDriveAdded(selectedDrives: IDrive[]) {
        if (model) {
          const response = model.sendConnectionRequest(selectedDrives);
          if ((await response) === true) {
            console.log('response:', response);
            addDriveContentsToPanel(panel, drive1);
          } else {
            console.warn('Connection with the drive was not possible');
          }
        }
      }

      //if (defaultBrowser && tracker.currentWidget) {
      if (model) {
        showDialog({
          body: new DriveListView(model),
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
