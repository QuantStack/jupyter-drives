import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import {
  driveFileBrowser,
  openDriveDialogPlugin,
  launcherPlugin
} from './plugins';

const plugins: JupyterFrontEndPlugin<any>[] = [
  driveFileBrowser,
  openDriveDialogPlugin,
  launcherPlugin
];

export default plugins;
