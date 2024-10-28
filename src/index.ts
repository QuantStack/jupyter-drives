import {
  ILabShell,
  ILayoutRestorer,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IFileBrowserFactory, FileBrowser } from '@jupyterlab/filebrowser';
import { ITranslator } from '@jupyterlab/translation';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';
import { Panel } from '@lumino/widgets';

import { DriveListModel, DriveListView, IDrive } from './drivelistmanager';
import { DriveIcon, driveBrowserIcon } from './icons';

/**
 * The command IDs used by the driveBrowser plugin.
 */
namespace CommandIDs {
  export const openDrivesDialog = 'drives:open-drives-dialog';
  export const openPath = 'drives:open-path';
  export const toggleBrowser = 'drives:toggle-main';
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

    //const model = new DriveListModel(availableDrives, selectedDrives);

    commands.addCommand(CommandIDs.openDrivesDialog, {
      execute: args => {
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

/**
 * The drive file browser factory provider.
 */
const driveFileBrowser: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/drives:drives-file-browser',
  description: 'The drive file browser factory provider.',
  autoStart: true,
  requires: [IFileBrowserFactory],
  optional: [
    IRouter,
    JupyterFrontEnd.ITreeResolver,
    ILabShell,
    ILayoutRestorer
  ],
  activate: async (
    app: JupyterFrontEnd,
    fileBrowserFactory: IFileBrowserFactory,
    router: IRouter | null,
    tree: JupyterFrontEnd.ITreeResolver | null,
    labShell: ILabShell | null,
    restorer: ILayoutRestorer | null
  ): Promise<void> => {
    const { commands } = app;

    // create S3 drive
    // const S3Drive = new Drive({
    //   name: auth.bucket,
    //   root: auth.root,
    //   config: auth.config
    // });

    // app.serviceManager.contents.addDrive(S3Drive);

    // Manually restore and load the drive file browser.
    const driveBrowser = fileBrowserFactory.createFileBrowser('drivebrowser', {
      auto: false,
      restore: false
      // driveName: S3Drive.name
    });

    // // Set attributes when adding the browser to the UI
    driveBrowser.node.setAttribute('role', 'region');
    driveBrowser.node.setAttribute('aria-label', 'Drive Browser Section');

    // instate Drive Browser Panel
    const drivePanel = new Panel();
    drivePanel.title.icon = driveBrowserIcon;
    drivePanel.title.iconClass = 'jp-sideBar-tabIcon';
    drivePanel.title.caption = 'Drive FileBrowser';
    drivePanel.id = 'Drive-Browser-Panel';

    app.shell.add(drivePanel, 'left', { rank: 102 });
    drivePanel.addWidget(driveBrowser);
    if (restorer) {
      restorer.add(drivePanel, 'drive-sidepanel');
    }

    void Private.restoreBrowser(driveBrowser, commands, router, tree, labShell);
  }
};

const plugins: JupyterFrontEndPlugin<any>[] = [
  plugin,
  driveFileBrowser,
  openDriveDialogPlugin
];
export default plugins;

namespace Private {
  /**
   * Restores file browser state and overrides state if tree resolver resolves.
   */
  export async function restoreBrowser(
    browser: FileBrowser,
    commands: CommandRegistry,
    router: IRouter | null,
    tree: JupyterFrontEnd.ITreeResolver | null,
    labShell: ILabShell | null
  ): Promise<void> {
    const restoring = 'jp-mod-restoring';

    browser.addClass(restoring);

    if (!router) {
      await browser.model.restore(browser.id);
      await browser.model.refresh();
      browser.removeClass(restoring);
      return;
    }

    const listener = async () => {
      router.routed.disconnect(listener);

      const paths = await tree?.paths;
      if (paths?.file || paths?.browser) {
        // Restore the model without populating it.
        await browser.model.restore(browser.id, false);
        if (paths.file) {
          await commands.execute(CommandIDs.openPath, {
            path: paths.file,
            dontShowBrowser: true
          });
        }
        if (paths.browser) {
          await commands.execute(CommandIDs.openPath, {
            path: paths.browser,
            dontShowBrowser: true
          });
        }
      } else {
        await browser.model.restore(browser.id);
        await browser.model.refresh();
      }
      browser.removeClass(restoring);

      if (labShell?.isEmpty('main')) {
        void commands.execute('launcher:create');
      }
    };
    router.routed.connect(listener);
  }
}
