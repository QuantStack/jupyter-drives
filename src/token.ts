import { Token } from '@lumino/coreutils';

export const IDrivesList = new Token<IDrivesList>(
  '@jupyter/drives:drives-list-provider'
);

export interface IDrivesList {
  names: string[];
}
