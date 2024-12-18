import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';
import { FileBrowserModel, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ILauncher, Launcher, LauncherModel } from '@jupyterlab/launcher';
import { ITranslator } from '@jupyterlab/translation';
import { addIcon, launcherIcon } from '@jupyterlab/ui-components';
import { find } from '@lumino/algorithm';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { DockPanel, TabBar, Widget } from '@lumino/widgets';

import { CommandIDs } from '../token';

/**
 * A service providing an interface to the the launcher.
 */
export const launcherPlugin: JupyterFrontEndPlugin<ILauncher> = {
  activate,
  id: 'jupyter-drives:launcher-extension-plugin',
  description: 'Provides the launcher tab service for the file browsers.',
  requires: [ITranslator],
  optional: [ILabShell, ICommandPalette, IFileBrowserFactory],
  provides: ILauncher,
  autoStart: true
};

/**
 * Activate the launcher.
 */
function activate(
  app: JupyterFrontEnd,
  translator: ITranslator,
  labShell: ILabShell | null,
  palette: ICommandPalette | null,
  factory: IFileBrowserFactory | null
): ILauncher {
  const { commands, shell } = app;
  const trans = translator.load('jupyter-drives');
  const model = new LauncherModel();

  commands.addCommand(CommandIDs.launcher, {
    label: trans.__('New Launcher'),
    icon: args => (args.toolbar ? addIcon : undefined),
    execute: (args: ReadonlyPartialJSONObject) => {
      // get current file browser used
      const currentBrowser = factory?.tracker.currentWidget;
      const cwd = (args['cwd'] as string) ?? currentBrowser?.model.path ?? '';
      const id = `launcher-${Private.id++}`;
      const callback = (item: Widget) => {
        // If widget is attached to the main area replace the launcher
        if (find(shell.widgets('main'), w => w === item)) {
          shell.add(item, 'main', { ref: id });
          launcher.dispose();
        }
      };
      const launcher = new Launcher({
        model,
        cwd,
        callback,
        commands,
        translator
      });

      launcher.model = model;
      launcher.title.icon = launcherIcon;
      launcher.title.label = trans.__('Launcher');

      const main = new MainAreaWidget({ content: launcher });

      // If there are any other widgets open, remove the launcher close icon.
      main.title.closable = !!Array.from(shell.widgets('main')).length;
      main.id = id;

      shell.add(main, 'main', {
        activate: args['activate'] as boolean,
        ref: args['ref'] as string
      });

      if (labShell) {
        labShell.layoutModified.connect(() => {
          // If there is only a launcher open, remove the close icon.
          main.title.closable = Array.from(labShell.widgets('main')).length > 1;
        }, main);
      }

      if (currentBrowser) {
        const onPathChanged = (model: FileBrowserModel) => {
          launcher.cwd = model.path;
        };
        currentBrowser.model.pathChanged.connect(onPathChanged);
        launcher.disposed.connect(() => {
          currentBrowser.model.pathChanged.disconnect(onPathChanged);
        });
      }

      return main;
    }
  });

  if (labShell) {
    const currentBrowser = factory?.tracker.currentWidget;
    void Promise.all([app.restored, currentBrowser?.model.restored]).then(
      () => {
        function maybeCreate() {
          // Create a launcher if there are no open items.
          if (labShell!.isEmpty('main')) {
            void commands.execute(CommandIDs.launcher);
          }
        }
        // When layout is modified, create a launcher if there are no open items.
        labShell.layoutModified.connect(() => {
          maybeCreate();
        });
      }
    );
  }

  if (palette) {
    palette.addItem({
      command: CommandIDs.launcher,
      category: trans.__('Launcher')
    });
  }

  if (labShell) {
    labShell.addButtonEnabled = true;
    labShell.addRequested.connect((sender: DockPanel, arg: TabBar<Widget>) => {
      // Get the ref for the current tab of the tabbar which the add button was clicked
      const ref =
        arg.currentTitle?.owner.id ||
        arg.titles[arg.titles.length - 1].owner.id;

      return commands.execute(CommandIDs.launcher, { ref });
    });
  }

  return model;
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The incrementing id used for launcher widgets.
   */
  export let id = 0;
}
