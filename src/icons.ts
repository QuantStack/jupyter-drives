import { LabIcon } from '@jupyterlab/ui-components';
import driveSvgstr from '../style/drive.svg';
import driveBrowserSvg from '../style/driveIconFileBrowser.svg';

export const DriveIcon = new LabIcon({
  name: '@jupyter/drives:drive',
  svgstr: driveSvgstr
});

export const driveBrowserIcon = new LabIcon({
  name: '@jupyter/drives:drive-browser',
  svgstr: driveBrowserSvg
});
