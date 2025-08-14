import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import {
  driveFileBrowser,
  openDriveDialogPlugin,
  launcherPlugin,
  sessionContextPatch
} from './plugins';

const plugins: JupyterFrontEndPlugin<any>[] = [
  driveFileBrowser,
  openDriveDialogPlugin,
  launcherPlugin,
  sessionContextPatch
];

export default plugins;
