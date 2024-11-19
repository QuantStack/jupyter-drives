import { Token } from '@lumino/coreutils';

/**
 * A token for the plugin that provides the list of drives.
 */
export const IDrivesList = new Token<IDriveInfo[]>(
  '@jupyter/drives:drives-list-provider'
);

/**
 * An interface that stores the drive information.
 */
export interface IDriveInfo {
  /**
   * Name of drive as stored on the provider account.
   */
  name: string;
  /**
   * Region of drive (e.g.: eu-north-1).
   */
  region: string;
  /**
   * Provider of drive (e.g.: s3, gcs).
   */
  provider: string;
  /**
   * Date drive was created.
   */
  creationDate: string;
  /**
   * Whether a content manager for the drive was already set up in the backend (true) or not (false).
   */
  mounted: boolean;
}
