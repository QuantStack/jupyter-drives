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
import { IDriveInfo } from '../token';
import { getDrivesList, getExcludedDrives, includeDrive } from '../requests';
import { ISignal, Signal } from '@lumino/signaling';

interface IProps {
  model: DriveListModel;
}
// export interface IDrive {
//   name: string;
//   url: string;
// }

export interface IDriveInputProps {
  isName: boolean;
  value: string;
  getValue: (event: any) => void;
  // updateSelectedDrives: (item: string, isName: boolean) => void;
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
            // props.updateSelectedDrives(props.value, props.isName);
          }}
        >
          add
        </Button>
      </div>
    </div>
  );
}
interface ISearchListProps {
  isName: boolean;
  value: string;
  // filteredList: Array<string>;
  setValue: (value: any) => void;
  availableDrives: Partial<IDriveInfo>[];
  // updateSelectedDrives: (item: string, isName: boolean) => void;
  model: DriveListModel;
}

export function DriveSearchListComponent(props: ISearchListProps) {
  return (
    <div className="drive-search-list">
      <div className="row">
        <div className="column">
          <Search
            className="drive-search-input"
            onInput={(event: any) => props.setValue(event.target.value)}
          />
        </div>
        <div className="column"></div>
      </div>
      {props.availableDrives
        .filter(item => {
          return (
            item.name!.toLowerCase().indexOf(props.value.toLowerCase()) !== -1
          );
        })
        .map((drive, index) => (
          <li key={index}>
            <div className="row">
              <div className="column">
                <div>{drive.name} </div>
              </div>
              <div className="column">
                <Button
                  className="search-add-drive-button"
                  onClick={async () => {
                    await includeDrive(drive.name!);
                    await props.model.refresh();
                    // props.updateSelectedDrives(item, true);
                  }}
                >
                  add
                </Button>
              </div>
            </div>
          </li>
        ))}
    </div>
  );
}
interface IDriveDataGridProps {
  drives: Partial<IDriveInfo>[];
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
            <b> region </b>
          </DataGridCell>
        </DataGridRow>

        {props.drives.map((item, index) => (
          <DataGridRow key={item.name} row-type="default">
            <DataGridCell className="data-grid-cell" grid-column="1">
              {item.name}
            </DataGridCell>
            <DataGridCell className="data-grid-cell" grid-column="2">
              {item.region}
            </DataGridCell>
          </DataGridRow>
        ))}
      </DataGrid>
    </div>
  );
}

export function DriveListManagerComponent({ model }: IProps) {
  const [driveUrl, setDriveUrl] = useState('');
  const [searchDrive, setSearchDrive] = useState('');
  // let updatedSelectedDrives = [...model.selectedDrives];
  const [selectedDrives, setSelectedDrives] = useState<Partial<IDriveInfo>[]>(
    model.selectedDrives
  );
  const [availableDrives, setAvailableDrives] = useState<Partial<IDriveInfo>[]>(
    model.availableDrives
  );
  // const [drivesFilteredList, setDrivesFilteredList] = useState<Partial<IDriveInfo>[]>(availableDrives);
  // const nameList: Array<string> = [];

  // Called after mounting.
  React.useEffect(() => {
    model.refresh();

    model.selectedDrivesChanged.connect((_, args) => {
      setSelectedDrives(args);
    });
    model.availableDrivesChanged.connect((_, args) => {
      setAvailableDrives(args);
    });
  }, [model]);

  // for (const item of availableDrives) {
  //   if (item.name !== '') {
  //     nameList.push(item.name!);
  //   }
  // }

  const getValue = (event: any) => {
    setDriveUrl(event.target.value);
  };

  // const filter = (event: any) => {
  //   const query = event.target.value;
  //   let updatedList: Partial<IDriveInfo>[];

  //   updatedList = [...drivesFilteredList];
  //   updatedList = updatedList.filter((item: Partial<IDriveInfo>) => {
  //     return item.name!.toLowerCase().indexOf(query.toLowerCase()) !== -1;
  //   });
  //   setDrivesFilteredList(updatedList);
  //   // if (nameFilteredList.length === 1 && nameFilteredList[0] !== '') {
  //   //   setDriveName(nameFilteredList[0]);
  //   //   setDriveUrl('');
  //   // }
  // };

  return (
    <>
      <div className="drive-list-manager">
        <div>
          <h3> Managed listed drives </h3>
        </div>
        <div className="row">
          <div className="column">
            <div> Enter public drive name</div>
            <DriveInputComponent
              isName={false}
              value={driveUrl}
              getValue={getValue}
              // updateSelectedDrives={(value, isName) =>
              //   updateSelectedDrives(value, isName)
              // }
            />

            <div> Available drives </div>
            <DriveSearchListComponent
              isName={true}
              value={searchDrive}
              setValue={setSearchDrive}
              // filteredList={drivesFilteredList}
              // filter={filter}
              availableDrives={availableDrives}
              // updateSelectedDrives={(value, isName) =>
              //   // updateSelectedDrives(value, isName)
              // }
              model={model}
            />
          </div>

          <div className="column">
            <div className="jp-custom-datagrid">
              <label> Listed drives </label>
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
  public availableDrives: Partial<IDriveInfo>[];
  public selectedDrives: Partial<IDriveInfo>[];
  private _selectedDrivesChanged = new Signal<
    DriveListModel,
    Partial<IDriveInfo>[]
  >(this);
  private _availableDrivesChanged = new Signal<
    DriveListModel,
    Partial<IDriveInfo>[]
  >(this);

  constructor(
    availableDrives: Partial<IDriveInfo>[],
    selectedDrives: Partial<IDriveInfo>[]
  ) {
    super();

    this.availableDrives = availableDrives;
    this.selectedDrives = selectedDrives;
  }

  setSelectedDrives(selectedDrives: Partial<IDriveInfo>[]) {
    this.selectedDrives = selectedDrives;
  }

  setAvailableDrives(availableDrives: Partial<IDriveInfo>[]) {
    this.availableDrives = availableDrives;
  }

  get selectedDrivesChanged(): ISignal<DriveListModel, Partial<IDriveInfo>[]> {
    return this._selectedDrivesChanged;
  }

  get availableDrivesChanged(): ISignal<DriveListModel, Partial<IDriveInfo>[]> {
    return this._availableDrivesChanged;
  }

  refreshSelectedDrives() {
    getDrivesList().then((drives: IDriveInfo[]) => {
      this.setSelectedDrives(
        drives.map((drive: IDriveInfo) => ({
          name: drive.name,
          region: drive.region
        }))
      );
      this._selectedDrivesChanged.emit(this.selectedDrives);
    });
  }

  refreshAvailanbleDrives() {
    getExcludedDrives().then((drives: IDriveInfo[]) => {
      this.setAvailableDrives(
        drives.map((drive: IDriveInfo) => ({
          name: drive.name,
          region: drive.region
        }))
      );
      this._availableDrivesChanged.emit(this.availableDrives);
    });
  }

  async refresh() {
    await this.refreshSelectedDrives();
    await this.refreshAvailanbleDrives();
  }
}

export class DriveListView extends VDomRenderer<DriveListModel> {
  constructor(model: DriveListModel) {
    super(model);
    this.model = model;
  }
  render() {
    return <DriveListManagerComponent model={this.model} />;
  }
}
