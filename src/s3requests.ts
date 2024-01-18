import { requestAPI } from './handler';

export interface IBucket {
  name: string;
  region: string;
  provider: string;
  creation_date: string;
  status: string;
}

export async function getDrivesList() {
  return await requestAPI<Array<IBucket>>('drives', {
    method: 'GET'
  });
}

export async function getDriveContent(driveName: string, path: string) {
  return await requestAPI<Array<IBucket>>('drives/' + driveName + '/' + path, {
    method: 'GET'
  });
}
