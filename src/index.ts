import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import {
  driveFileBrowser,
  drivesListProvider,
  openDriveDialogPlugin,
  launcherPlugin
} from './plugins';

const plugins: JupyterFrontEndPlugin<any>[] = [
  driveFileBrowser,
  drivesListProvider,
  openDriveDialogPlugin,
  launcherPlugin
];

export default plugins;
