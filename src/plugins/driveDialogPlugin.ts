import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ITranslator } from '@jupyterlab/translation';
import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';

import { DriveListModel, DriveListView } from './drivelistmanager';
import { driveBrowserIcon } from '../icons';
import { CommandIDs, IDriveInfo } from '../token';
import { getDrivesList, getExcludedDrives } from '../requests';

export const openDriveDialogPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-drives:widget',
  description: 'Open a dialog to managed listed drives in the filebrowser.',
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
    const selectedDrivesModelMap = new Map<
      Partial<IDriveInfo>[],
      DriveListModel
    >();

    let selectedDrives: Partial<IDriveInfo>[] = [];
    getDrivesList().then((drives: IDriveInfo[]) => {
      selectedDrives = drives.map((drive: IDriveInfo) => ({
        name: drive.name,
        region: drive.region
      }));
    });

    let availableDrives: Partial<IDriveInfo>[] = [];
    getExcludedDrives().then((drives: IDriveInfo[]) => {
      availableDrives = drives.map((drive: IDriveInfo) => ({
        name: drive.name,
        region: drive.region
      }));
    });

    let model = selectedDrivesModelMap.get(selectedDrives);

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

      icon: driveBrowserIcon.bindprops({ stylesheet: 'menuItem' }),
      caption: trans.__('Manage drives listed in filebrowser.'),
      label: trans.__('Manage listed drives')
    });

    app.contextMenu.addItem({
      command: CommandIDs.openDrivesDialog,
      selector: '#drive-file-browser.jp-SidePanel',
      rank: 100
    });
  }
};
