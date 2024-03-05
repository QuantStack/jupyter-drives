import { requestAPI } from './handler';
import { Contents } from '@jupyterlab/services';

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

export async function postDriveMounted(driveName: string) {
  await requestAPI<any>('drives', {
    method: 'POST',
    body: `{"drive_name":"${driveName}"}`
  });
}

export async function getDriveContents(driveName: string, path: string) {
  return await requestAPI<Contents.IModel>(
    'drives' + '/' + driveName + '/' + path,
    {
      method: 'GET'
    }
  );
}
