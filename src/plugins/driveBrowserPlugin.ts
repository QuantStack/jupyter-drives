import {
  ILabShell,
  ILayoutRestorer,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IDocumentWidgetOpener } from '@jupyterlab/docmanager';
import { IStatusBar } from '@jupyterlab/statusbar';
import {
  IFileBrowserFactory,
  FileBrowser,
  Uploader
} from '@jupyterlab/filebrowser';
import { ITranslator } from '@jupyterlab/translation';
import {
  createToolbarFactory,
  Clipboard,
  IToolbarWidgetRegistry,
  setToolbar,
  showDialog,
  Dialog
} from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  filterIcon,
  FilenameSearcher,
  IScore,
  newFolderIcon,
  fileIcon,
  notebookIcon,
  editIcon
} from '@jupyterlab/ui-components';
import { PageConfig, PathExt } from '@jupyterlab/coreutils';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';

import { driveBrowserIcon, removeIcon } from '../icons';
import { Drive } from '../contents';
import { setListingLimit } from '../requests';
import { CommandIDs } from '../token';

/**
 * Status bar widget for displaying drive information
 */
class DriveStatusWidget extends Widget {
  constructor() {
    super();
    this.node.classList.add(
      'jp-drive-status-widget',
      'jp-drive-status-loading',
      'lm-mod-hidden'
    );

    this._textSpan = document.createElement('span');
    this._textSpan.textContent = '';
    this.node.appendChild(this._textSpan);

    this._isLoading = false;
  }

  updateStatus(text: string) {
    this._textSpan.textContent = text;
  }

  /**
   * Update status when loading a directory or file
   */
  setLoading(path: string, type: string) {
    this._isLoading = true;

    if (type === 'directory') {
      const displayPath =
        path === '' ? 'Root' : path.split('/').pop() || 'Directory';
      this.updateStatus(`Opening: ${displayPath}`);
    } else {
      const fileName = path.split('/').pop() || 'File';
      this.updateStatus(`Opening: ${fileName}`);
    }
    this.removeClass('lm-mod-hidden');
  }

  /**
   * Clear loading state and show current status
   */
  setLoaded(path?: string) {
    this._isLoading = false;
    this.addClass('lm-mod-hidden');

    this.updateStatus('');
  }

  /**
   * Check if currently loading
   */
  get isLoading(): boolean {
    return this._isLoading;
  }

  private _isLoading: boolean;
  private _textSpan: HTMLSpanElement;
}

/**
 * The file browser factory ID.
 */
const FILE_BROWSER_FACTORY = 'DriveBrowser';

/**
 * The class name added to the  drive filebrowser filterbox node.
 */
const FILTERBOX_CLASS = 'jp-drive-browser-search-box';

/**
 * The class name added to dialogs.
 */
const FILE_DIALOG_CLASS = 'jp-FileDialog';

/**
 * The class name added for the new drive label in the creating new drive dialog.
 */
const CREATE_DRIVE_TITLE_CLASS = 'jp-new-drive-title';

/**
 * The drive file browser factory provider.
 */
export const driveFileBrowser: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-drives:drives-file-browser',
  description: 'The drive file browser factory provider.',
  autoStart: true,
  requires: [
    IFileBrowserFactory,
    IToolbarWidgetRegistry,
    ISettingRegistry,
    ITranslator,
    IDocumentWidgetOpener
  ],
  optional: [
    IRouter,
    JupyterFrontEnd.ITreeResolver,
    ILabShell,
    ILayoutRestorer,
    IStatusBar
  ],
  activate: async (
    app: JupyterFrontEnd,
    fileBrowserFactory: IFileBrowserFactory,
    toolbarRegistry: IToolbarWidgetRegistry,
    settingsRegistry: ISettingRegistry,
    translator: ITranslator,
    docWidgetOpener: IDocumentWidgetOpener,
    router: IRouter | null,
    tree: JupyterFrontEnd.ITreeResolver | null,
    labShell: ILabShell | null,
    restorer: ILayoutRestorer | null,
    statusBar: IStatusBar | null
  ): Promise<void> => {
    console.log(
      'JupyterLab extension jupyter-drives:drives-file-browser is activated!'
    );
    const { commands } = app;

    // create drive for drive file browser
    const drive = new Drive({
      name: 's3'
    });

    app.serviceManager.contents.addDrive(drive);

    // get registered file types
    drive.getRegisteredFileTypes(app);

    // Manually restore and load the drive file browser.
    const driveBrowser = fileBrowserFactory.createFileBrowser('drivebrowser', {
      auto: false,
      restore: false,
      driveName: drive.name
    });

    // Set attributes when adding the browser to the UI
    driveBrowser.node.setAttribute('role', 'region');
    driveBrowser.node.setAttribute('aria-label', 'Drive Browser Section');
    driveBrowser.title.icon = driveBrowserIcon;
    driveBrowser.title.caption = 'Drive File Browser';
    driveBrowser.id = 'drive-file-browser';
    driveBrowser.addClass('drive-browser');

    void Private.restoreBrowser(driveBrowser, commands, router, tree, labShell);

    app.shell.add(driveBrowser, 'left', { rank: 102, type: 'File Browser' });
    if (restorer) {
      restorer.add(driveBrowser, 'drive-file-browser');
    }

    // Register status bar widget
    if (statusBar) {
      const driveStatusWidget = new DriveStatusWidget();

      statusBar.registerStatusItem('driveBrowserStatus', {
        item: driveStatusWidget,
        align: 'right',
        rank: 500,
        isActive: () => true
      });

      // Item/dir being opened
      //@ts-expect-error listing is protected
      driveBrowser.listing.onItemOpened.connect((_, args) => {
        const { path, type } = args;
        driveStatusWidget.setLoading(path, type);
      });

      const doneLoading = (_: any, args: any) => {
        driveStatusWidget.setLoaded();
      };
      // Item done opening
      docWidgetOpener.opened.connect(doneLoading);

      // Directory done opening
      driveBrowser.model.pathChanged.connect(doneLoading);
    }

    const uploader = new Uploader({ model: driveBrowser.model, translator });
    toolbarRegistry.addFactory(FILE_BROWSER_FACTORY, 'uploader', () => {
      return uploader;
    });

    toolbarRegistry.addFactory(
      FILE_BROWSER_FACTORY,
      'file-name-searcher',
      (fileBrowser: FileBrowser) => {
        const searcher = FilenameSearcher({
          updateFilter: (
            filterFn: (item: string) => Partial<IScore> | null,
            query?: string
          ) => {
            fileBrowser.model.setFilter(value => {
              return filterFn(value.name.toLowerCase());
            });
          },
          useFuzzyFilter: true,
          placeholder: 'Filter files by names',
          forceRefresh: true
        });
        searcher.addClass(FILTERBOX_CLASS);
        return searcher;
      }
    );

    // Add commands
    Private.addCommands(app, drive, driveBrowser, fileBrowserFactory);

    const updateVisibility = () => {
      // Visibility of context menu and toolbar commands changed.
      if (driveBrowser.model.path !== 's3:') {
        uploader.enabled = true;
      } else {
        uploader.enabled = false;
      }
      app.commands.notifyCommandChanged(CommandIDs.createNewDrive);
      app.commands.notifyCommandChanged(CommandIDs.createNewDirectory);
      app.commands.notifyCommandChanged(CommandIDs.launcher);
    };

    // Listen for path changes.
    driveBrowser.model.pathChanged.connect(updateVisibility);
    updateVisibility();

    // Connect the filebrowser toolbar to the settings registry for the plugin.
    setToolbar(
      driveBrowser,
      createToolbarFactory(
        toolbarRegistry,
        settingsRegistry,
        FILE_BROWSER_FACTORY,
        driveFileBrowser.id,
        translator
      )
    );

    /**
     * Load the settings for this extension
     *
     * @param setting Extension settings
     */
    function loadSetting(setting: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type
      const maxFilesListed = setting.get('maxFilesListed').composite as number;
      // Set new limit.
      setListingLimit(maxFilesListed);
    }

    // Wait for the application to be restored and
    // for the settings for this plugin to be loaded
    Promise.all([app.restored, settingsRegistry.load(driveFileBrowser.id)])
      .then(([, setting]) => {
        // Read the settings
        loadSetting(setting);

        // Listen for your plugin setting changes using Signal
        setting.changed.connect(loadSetting);
      })
      .catch(reason => {
        console.error(
          `Something went wrong when reading the settings.\n${reason}`
        );
      });
  }
};

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
        console.log('PROOF');
        await browser.model.refresh();
      }
      browser.removeClass(restoring);

      if (labShell?.isEmpty('main')) {
        void commands.execute('launcher:create');
      }
    };
    router.routed.connect(listener);
  }

  /**
   * Create the node for a creating a new drive handler.
   */
  const createNewDriveNode = (): HTMLElement => {
    const body = document.createElement('div');

    const drive = document.createElement('label');
    drive.textContent = 'Name';
    drive.className = CREATE_DRIVE_TITLE_CLASS;
    const driveName = document.createElement('input');

    const region = document.createElement('label');
    region.textContent = 'Region';
    region.className = CREATE_DRIVE_TITLE_CLASS;
    const regionName = document.createElement('input');
    regionName.placeholder = 'us-east-1';

    body.appendChild(drive);
    body.appendChild(driveName);
    body.appendChild(region);
    body.appendChild(regionName);
    return body;
  };

  /**
   * A widget used to create a new drive.
   */
  export class CreateDriveHandler extends Widget {
    /**
     * Construct a new "create-drive" dialog.
     */
    constructor(newDriveName: string) {
      super({ node: createNewDriveNode() });
      this.onAfterAttach();
    }

    protected onAfterAttach(): void {
      this.addClass(FILE_DIALOG_CLASS);
      const drive = this.driveInput.value;
      this.driveInput.setSelectionRange(0, drive.length);
      const region = this.regionInput.value;
      this.regionInput.setSelectionRange(0, region.length);
    }

    /**
     * Get the input text node for drive name.
     */
    get driveInput(): HTMLInputElement {
      return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
    }

    /**
     * Get the input text node for region.
     */
    get regionInput(): HTMLInputElement {
      return this.node.getElementsByTagName('input')[1] as HTMLInputElement;
    }

    /**
     * Get the value of the widget.
     */
    getValue(): string[] {
      return [this.driveInput.value, this.regionInput.value];
    }
  }

  /**
   * Create the node for adding a public drive handler.
   */
  const addPublicDriveNode = (): HTMLElement => {
    const body = document.createElement('div');

    const drive = document.createElement('label');
    drive.textContent = 'Name';
    drive.className = CREATE_DRIVE_TITLE_CLASS;
    const driveName = document.createElement('input');

    body.appendChild(drive);
    body.appendChild(driveName);
    return body;
  };

  /**
   * A widget used to add a public drive.
   */
  export class AddPublicDriveHandler extends Widget {
    /**
     * Construct a new "add-public-drive" dialog.
     */
    constructor(newDriveName: string) {
      super({ node: addPublicDriveNode() });
      this.onAfterAttach();
    }

    protected onAfterAttach(): void {
      this.addClass(FILE_DIALOG_CLASS);
      const drive = this.driveInput.value;
      this.driveInput.setSelectionRange(0, drive.length);
    }

    /**
     * Get the input text node for drive name.
     */
    get driveInput(): HTMLInputElement {
      return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
    }

    /**
     * Get the value of the widget.
     */
    getValue(): string {
      return this.driveInput.value;
    }
  }

  export function addCommands(
    app: JupyterFrontEnd,
    drive: Drive,
    browser: FileBrowser,
    factory: IFileBrowserFactory
  ): void {
    const { tracker } = factory;

    app.commands.addCommand(CommandIDs.createNewDrive, {
      isEnabled: () => {
        return browser.model.path === 's3:';
      },
      execute: async () => {
        return showDialog({
          title: 'New Drive',
          body: new Private.CreateDriveHandler(drive.name),
          focusNodeSelector: 'input',
          buttons: [
            Dialog.cancelButton(),
            Dialog.okButton({
              label: 'Create',
              ariaLabel: 'Create New Drive'
            })
          ]
        }).then(result => {
          if (result.value) {
            drive.newDrive(result.value[0], result.value[1]);
          }
        });
      },
      label: 'New Drive',
      icon: driveBrowserIcon.bindprops({ stylesheet: 'menuItem' })
    });

    app.contextMenu.addItem({
      command: CommandIDs.createNewDrive,
      selector: '#drive-file-browser.jp-SidePanel .jp-DirListing-content',
      rank: 105
    });

    app.commands.addCommand(CommandIDs.addPublicDrive, {
      isVisible: () => {
        return browser.model.path === 's3:';
      },
      execute: async () => {
        return showDialog({
          title: 'Add Public Drive',
          body: new Private.AddPublicDriveHandler(drive.name),
          focusNodeSelector: 'input',
          buttons: [
            Dialog.cancelButton(),
            Dialog.okButton({
              label: 'Add',
              ariaLabel: 'Add Drive'
            })
          ]
        }).then(result => {
          if (result.value) {
            drive.addPublicDrive(result.value);
          }
        });
      },
      label: 'Add Public Drive',
      icon: driveBrowserIcon.bindprops({ stylesheet: 'menuItem' })
    });

    app.contextMenu.addItem({
      command: CommandIDs.addPublicDrive,
      selector: '#drive-file-browser.jp-SidePanel .jp-DirListing-content',
      rank: 110
    });

    app.commands.addCommand(CommandIDs.addExternalDrive, {
      isVisible: () => {
        return browser.model.path === 's3:';
      },
      execute: async () => {
        return showDialog({
          title: 'Add External Drive',
          body: new Private.CreateDriveHandler(drive.name),
          focusNodeSelector: 'input',
          buttons: [
            Dialog.cancelButton(),
            Dialog.okButton({
              label: 'Add',
              ariaLabel: 'Add Drive'
            })
          ]
        }).then(result => {
          if (result.value) {
            drive.addExternalDrive(result.value[0], result.value[1]);
          }
        });
      },
      label: 'Add External Drive',
      icon: driveBrowserIcon.bindprops({ stylesheet: 'menuItem' })
    });

    app.contextMenu.addItem({
      command: CommandIDs.addExternalDrive,
      selector: '#drive-file-browser.jp-SidePanel .jp-DirListing-content',
      rank: 110
    });

    app.commands.addCommand(CommandIDs.toggleFileFilter, {
      execute: () => {
        // Update toggled state, then let the toolbar button update
        browser.showFileFilter = !browser.showFileFilter;
        app.commands.notifyCommandChanged(CommandIDs.toggleFileFilter);
      },
      isToggled: () => {
        const toggled = browser.showFileFilter;
        return toggled;
      },
      icon: filterIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'Toggle File Filter'
    });

    app.commands.addCommand(CommandIDs.createNewDirectory, {
      isEnabled: () => {
        return browser.model.path !== 's3:';
      },
      execute: () => {
        app.commands.execute('filebrowser:create-new-directory');
      },
      icon: newFolderIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'New Folder'
    });

    app.commands.addCommand(CommandIDs.createNewFile, {
      isEnabled: () => {
        return browser.model.path !== 's3:';
      },
      execute: () => {
        app.commands.execute('filebrowser:create-new-file');
      },
      icon: fileIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'New File'
    });

    app.commands.addCommand(CommandIDs.createNewNotebook, {
      isEnabled: () => {
        return browser.model.path !== 's3:';
      },
      execute: () => {
        app.commands.execute('notebook:create-new');
      },
      icon: notebookIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'New Notebook'
    });

    app.commands.addCommand(CommandIDs.rename, {
      isEnabled: () => {
        return browser.model.path !== 's3:';
      },
      execute: () => {
        app.commands.execute('filebrowser:rename');
      },
      icon: editIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'Rename'
    });

    app.commands.addCommand(CommandIDs.copyPath, {
      execute: () => {
        const widget = tracker.currentWidget;
        if (!widget) {
          return;
        }
        const item = widget.selectedItems().next();
        if (item.done) {
          return;
        }

        let path: string = item.value.path;
        if (PageConfig.getOption('copyAbsolutePath') === 'true') {
          path = PathExt.joinWithLeadingSlash(
            PageConfig.getOption('serverRoot') ?? '',
            item.value.path
          );
        }
        const parts = path.split(':');
        path = parts[0] + '://' + parts[1];
        Clipboard.copyToSystem(path);
      },
      isVisible: () =>
        // So long as this command only handles one file at time, don't show it
        // if multiple files are selected.
        !!tracker.currentWidget &&
        Array.from(tracker.currentWidget.selectedItems()).length === 1,
      icon: fileIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'Copy Path'
    });

    app.commands.addCommand(CommandIDs.excludeDrive, {
      isVisible: () => {
        return browser.model.path === 's3:';
      },
      execute: async () => {
        const widget = tracker.currentWidget;
        if (!widget) {
          return;
        }
        const item = widget.selectedItems().next();
        if (item.done) {
          return;
        }

        const driveName: string = item.value.name;
        await drive.excludeDrive(driveName);
      },
      label: 'Remove Drive',
      icon: removeIcon.bindprops({ stylesheet: 'menuItem' })
    });

    app.contextMenu.addItem({
      command: CommandIDs.excludeDrive,
      selector:
        '#drive-file-browser.jp-SidePanel .jp-DirListing-content .jp-DirListing-item[data-isdir]',
      rank: 110
    });
  }
}
