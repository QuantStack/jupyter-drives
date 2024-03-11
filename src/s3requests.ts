import { requestAPI } from './handler';

export interface IBucket {
  name: string;
  region: string;
  provider: string;
  creation_date: string;
  status: string;
}

export async function getDrivesList() {
  return await requestAPI<any>('drives', {
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
  return await requestAPI<any>(
    'drives' + '/' + driveName + '/' + path,
    {
      method: 'GET'
    }
  );
}
