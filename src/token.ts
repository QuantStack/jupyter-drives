import { Token } from '@lumino/coreutils';

export const IDrivesList = new Token<IDriveInfo[]>(
  '@jupyter/drives:drives-list-provider'
);

export interface IDriveInfo {
  name: string;
  region: string;
  provider: string;
  creationDate: string;
}
