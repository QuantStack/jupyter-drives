import { requestAPI } from './handler';

/**
 * Fetch the list of available drives.
 * @returns list of drives
 */
export async function getDrivesList() {
  return await requestAPI<any>('drives', 'GET');
}
