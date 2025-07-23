import * as React from 'react';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import { Button, Search } from '@jupyter/react-components';
import { useState } from 'react';
import { IDriveInfo } from '../token';
import {
  addPublicDrive,
  excludeDrive,
  getDrivesList,
  getExcludedDrives,
  includeDrive
} from '../requests';
import { ISignal, Signal } from '@lumino/signaling';
import { driveBrowserIcon, addIcon, removeIcon } from '../icons';

interface IProps {
  model: DriveListModel;
}

export interface IDriveInputProps {
  isName: boolean;
  value: string;
  getValue: (event: any) => void;
}

export function DriveInputComponent(props: IDriveInputProps) {
  return (
    <div>
      <div className="add-public-drive-section">
        <Search
          className="drive-search-input"
          onInput={props.getValue}
          placeholder="Enter drive name"
        />
        <Button
          className="input-add-drive-button"
          onClick={() => addPublicDrive(props.value)}
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
  setValue: (value: any) => void;
  availableDrives: Partial<IDriveInfo>[];
  model: DriveListModel;
}

export function DriveSearchListComponent(props: ISearchListProps) {
  return (
    <>
      <Search
        className="drive-search-input"
        onInput={(event: any) => props.setValue(event.target.value)}
        placeholder="Search drive name"
      />
      <div className="drive-search-list">
        {props.availableDrives.length === 0 ? (
          <div className="drives-manager-header-info">
            {'No available drives.'}
          </div>
        ) : (
          props.availableDrives
            .filter(item => {
              return (
                item.name!.toLowerCase().indexOf(props.value.toLowerCase()) !==
                -1
              );
            })
            .map((drive, index) => (
              <li key={index}>
                <div className="available-drives-section">
                  <div>{drive.name} </div>
                  <Button
                    className="search-add-drive-button"
                    onClick={async () => {
                      await includeDrive(drive.name!);
                      await props.model.refresh();
                    }}
                  >
                    <addIcon.react
                      tag="span"
                      className="available-drives-icon"
                      height="18px"
                    />
                  </Button>
                </div>
              </li>
            ))
        )}
      </div>
    </>
  );
}
interface IDriveDataGridProps {
  drives: Partial<IDriveInfo>[];
  model: DriveListModel;
}

export function DriveDataGridComponent(props: IDriveDataGridProps) {
  return (
    <div className="drive-search-list">
      {props.drives.length === 0 ? (
        <div className="drives-manager-header-info">
          {'No selected drives.'}
        </div>
      ) : (
        props.drives.map((drive, index) => (
          <li key={index}>
            <div className="available-drives-section">
              <div>{drive.name} </div>
              <Button
                className="search-add-drive-button"
                onClick={async () => {
                  await excludeDrive(drive.name!);
                  await props.model.refresh();
                }}
              >
                <removeIcon.react
                  tag="span"
                  className="available-drives-icon"
                  height="18px"
                />
              </Button>
            </div>
          </li>
        ))
      )}
    </div>
  );
}

export function DriveListManagerComponent({ model }: IProps) {
  const [driveUrl, setDriveUrl] = useState('');
  const [searchDrive, setSearchDrive] = useState('');
  const [selectedDrives, setSelectedDrives] = useState<Partial<IDriveInfo>[]>(
    model.selectedDrives
  );
  const [availableDrives, setAvailableDrives] = useState<Partial<IDriveInfo>[]>(
    model.availableDrives
  );

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

  const getValue = (event: any) => {
    setDriveUrl(event.target.value);
  };

  return (
    <div className="drive-list-manager">
      <span className="drives-manager-header">
        <driveBrowserIcon.react
          margin="15px 9.5px 0px 0px"
          height="auto"
          width="28px"
        />
        <div className="drives-manager-header-title">
          {'Manage listed drives'}
          <div className="drives-manager-header-info">
            {'Add or remove drives from the filebrowser.'}
          </div>
        </div>
      </span>
      <div>
        <div className="drives-manager-section">
          <div className="drives-section-title">Selected drives</div>
          <DriveDataGridComponent drives={selectedDrives} model={model} />
        </div>

        <div className="drives-manager-section">
          <div className="drives-section-title"> Add public drive</div>
          <DriveInputComponent
            isName={false}
            value={driveUrl}
            getValue={getValue}
          />
        </div>

        <div className="drives-manager-section">
          <div className="drives-section-title"> Browser available drives </div>
          <DriveSearchListComponent
            isName={true}
            value={searchDrive}
            setValue={setSearchDrive}
            availableDrives={availableDrives}
            model={model}
          />
        </div>
      </div>
    </div>
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
