import { Token } from '@lumino/coreutils';

/**
 * A token for the plugin that provides the list of drives.
 */
export const IDrivesList = new Token<IDriveInfo[]>(
  '@jupyter/drives:drives-list-provider'
);

/**
 * An interface for the available drives.
 */
export interface IDriveInfo {
  name: string;
  region: string;
  provider: string;
  creationDate: string;
}
