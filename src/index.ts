import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ITranslator } from '@jupyterlab/translation';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { DriveListModel, DriveListView } from './drivelistmanager';
import { DriveIcon } from './icons';

namespace CommandIDs {
  export const openDrivesDialog = 'drives:open-drives-dialog';
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

    commands.addCommand(CommandIDs.openDrivesDialog, {
      execute: args => {
        const widget = tracker.currentWidget;
        const driveList = [
          'BananaDrive',
          'RaspberryDrive',
          'PineAppleDrive',
          'PomeloDrive',
          'OrangeDrive',
          'TomatoDrive',
          'AvocadoDrive'
        ];

        const model = new DriveListModel(driveList);

        if (widget) {
          showDialog({
            body: new DriveListView(model),
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
