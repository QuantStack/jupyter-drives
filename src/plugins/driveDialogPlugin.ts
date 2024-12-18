import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin
  } from '@jupyterlab/application';
  import {
    IFileBrowserFactory
  } from '@jupyterlab/filebrowser';
  import { ITranslator } from '@jupyterlab/translation';
  import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
  import {
    Dialog,
    showDialog
  } from '@jupyterlab/apputils';
  
  import { DriveListModel, DriveListView, IDrive } from './drivelistmanager';
  import { DriveIcon } from '../icons';

  /**
   * The command IDs used by the driveBrowser plugin.
   */
  namespace CommandIDs {
    export const openDrivesDialog = 'drives:open-drives-dialog';
    export const openPath = 'drives:open-path';
    export const toggleBrowser = 'drives:toggle-main';
  }
  
 export const openDriveDialogPlugin: JupyterFrontEndPlugin<void> = {
    id: 'jupyter-drives:widget',
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
