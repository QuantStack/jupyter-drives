import { LabIcon } from '@jupyterlab/ui-components';
import driveBrowserSvg from '../style/driveIconFileBrowser.svg';
import addIconSvg from '../style/addIcon.svg';

export const driveBrowserIcon = new LabIcon({
  name: 'jupyter-drives:drive-browser',
  svgstr: driveBrowserSvg
});

export const addIcon = new LabIcon({
  name: 'jupyter-drives:add-drive',
  svgstr: addIconSvg
});
