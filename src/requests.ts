import { ReadonlyJSONObject } from '@lumino/coreutils';

import { requestAPI } from './handler';

/**
 * Fetch the list of available drives.
 * @returns list of drives
 */
export async function getDrivesList() {
  return await requestAPI<any>('drives', 'GET');
}

/**
 * Mount a drive by establishing a connection with it.
 * @param driveName
 */
export async function mountDrive(
  driveName: string,
  options: { provider: string; region: string }
) {
  const body: ReadonlyJSONObject = {
    drive_name: driveName,
    provider: options.provider,
    region: options.region
  };
  return await requestAPI<any>('drives', 'POST', body);
}

export async function getContents(
  driveName: string,
  options: { path: string }
) {
  return await requestAPI<any>(
    'drives/' + driveName + '/' + options.path,
    'GET'
  );
}
