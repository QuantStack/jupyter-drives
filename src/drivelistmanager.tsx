import * as React from 'react';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridRow,
  Search
} from '@jupyter/react-components';
import { useState } from 'react';

interface IProps {
  model: DriveListModel;
}
export interface IDrive {
  name: string;
  url: string;
}

export interface IDriveInputProps {
  isName: boolean;
  value: string;
  getValue: (event: any) => void;
  updateSelectedDrives: (item: string, isName: boolean) => void;
}
export function DriveInputComponent(props: IDriveInputProps) {
  return (
    <div>
      <div className="row">
        <div className="column">
          <Search className="drive-search-input" onInput={props.getValue} />
        </div>
        <div className="column"></div>
        <Button
          className="input-add-drive-button"
          onClick={() => {
            props.updateSelectedDrives(props.value, props.isName);
          }}
        >
          add drive
        </Button>
      </div>
    </div>
  );
}
interface ISearchListProps {
  isName: boolean;
  value: string;
  filteredList: Array<string>;
  filter: (value: any) => void;
  updateSelectedDrives: (item: string, isName: boolean) => void;
}

export function DriveSearchListComponent(props: ISearchListProps) {
  return (
    <div className="drive-search-list">
      <div className="row">
        <div className="column">
          <Search className="drive-search-input" onInput={props.filter} />
        </div>
        <div className="column"></div>
      </div>
      {props.filteredList.map((item, index) => (
        <li key={item}>
          <div className="row">
            <div className="column">
              <div>{item} </div>
            </div>
            <div className="column">
              <Button
                className="search-add-drive-button"
                onClick={() => {
                  props.updateSelectedDrives(item, true);
                }}
              >
                add drive
              </Button>
            </div>
          </div>
        </li>
      ))}
    </div>
  );
}
interface IDriveDataGridProps {
  drives: IDrive[];
}

export function DriveDataGridComponent(props: IDriveDataGridProps) {
  return (
    <div className="drive-data-grid">
      <DataGrid grid-template-columns="1f 1fr">
        <DataGridRow row-type="header">
          <DataGridCell className="data-grid-cell" grid-column="1">
            <b> name </b>
          </DataGridCell>
          <DataGridCell className="data-grid-cell" grid-column="2">
            <b> url </b>
          </DataGridCell>
        </DataGridRow>

        {props.drives.map((item, index) => (
          <DataGridRow key={item.name} row-type="default">
            <DataGridCell className="data-grid-cell" grid-column="1">
              {item.name}
            </DataGridCell>
            <DataGridCell className="data-grid-cell" grid-column="2">
              {item.url}
            </DataGridCell>
          </DataGridRow>
        ))}
      </DataGrid>
    </div>
  );
}

export function DriveListManagerComponent(props: IProps) {
  const [driveUrl, setDriveUrl] = useState('');
  const [driveName, setDriveName] = useState('');
  let updatedSelectedDrives = [...props.model.selectedDrives];
  const [selectedDrives, setSelectedDrives] = useState(updatedSelectedDrives);

  const nameList: Array<string> = [];

  for (const item of props.model.availableDrives) {
    if (item.name !== '') {
      nameList.push(item.name);
    }
  }
  const [nameFilteredList, setNameFilteredList] = useState(nameList);

  const isDriveAlreadySelected = (pickedDrive: IDrive, driveList: IDrive[]) => {
    const isbyNameIncluded: boolean[] = [];
    const isbyUrlIncluded: boolean[] = [];
    let isIncluded: boolean = false;
    driveList.forEach(item => {
      if (pickedDrive.name !== '' && pickedDrive.name === item.name) {
        isbyNameIncluded.push(true);
      } else {
        isbyNameIncluded.push(false);
      }
      if (pickedDrive.url !== '' && pickedDrive.url === item.url) {
        isbyUrlIncluded.push(true);
      } else {
        isbyUrlIncluded.push(false);
      }
    });

    if (isbyNameIncluded.includes(true) || isbyUrlIncluded.includes(true)) {
      isIncluded = true;
    }

    return isIncluded;
  };

  const updateSelectedDrives = (item: string, isName: boolean) => {
    updatedSelectedDrives = [...props.model.selectedDrives];
    let pickedDrive: IDrive;
    if (isName) {
      pickedDrive = { name: item, url: '' };
    } else {
      if (item !== driveUrl) {
        setDriveUrl(item);
      }
      pickedDrive = { name: '', url: driveUrl };
    }

    const checkDrive = isDriveAlreadySelected(
      pickedDrive,
      updatedSelectedDrives
    );
    if (checkDrive === false) {
      updatedSelectedDrives.push(pickedDrive);
    } else {
      console.log('The selected drive is already in the list');
    }

    setSelectedDrives(updatedSelectedDrives);
    props.model.setSelectedDrives(updatedSelectedDrives);
  };

  const getValue = (event: any) => {
    setDriveUrl(event.target.value);
  };

  const filter = (event: any) => {
    const query = event.target.value;
    let updatedList: Array<string>;

    updatedList = [...nameList];
    updatedList = updatedList.filter(item => {
      return item.toLowerCase().indexOf(query.toLowerCase()) !== -1;
    });
    setNameFilteredList(updatedList);
    if (nameFilteredList.length === 1 && nameFilteredList[0] !== '') {
      setDriveName(nameFilteredList[0]);
      setDriveUrl('');
    }
  };

  return (
    <>
      <div className="drive-list-manager">
        <div>
          <h3> Select drive(s) to be added to your filebrowser </h3>
        </div>
        <div className="row">
          <div className="column">
            <div> Enter a drive URL</div>
            <DriveInputComponent
              isName={false}
              value={driveUrl}
              getValue={getValue}
              updateSelectedDrives={(value, isName) =>
                updateSelectedDrives(value, isName)
              }
            />

            <div> Select drive(s) from list</div>
            <DriveSearchListComponent
              isName={true}
              value={driveName}
              filteredList={nameFilteredList}
              filter={filter}
              updateSelectedDrives={(value, isName) =>
                updateSelectedDrives(value, isName)
              }
            />
          </div>

          <div className="column">
            <div className="jp-custom-datagrid">
              <label> Selected drives </label>
              <label> </label>
              <DriveDataGridComponent drives={selectedDrives} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export class DriveListModel extends VDomModel {
  public availableDrives: IDrive[];
  public selectedDrives: IDrive[];

  constructor(availableDrives: IDrive[], selectedDrives: IDrive[]) {
    super();

    this.availableDrives = availableDrives;
    this.selectedDrives = selectedDrives;
  }
  setSelectedDrives(selectedDrives: IDrive[]) {
    this.selectedDrives = selectedDrives;
  }
}

export class DriveListView extends VDomRenderer<DriveListModel> {
  constructor(model: DriveListModel) {
    super(model);
    this.model = model;
  }
  render() {
    return (
      <>
        <DriveListManagerComponent model={this.model} />
      </>
    );
  }
}
