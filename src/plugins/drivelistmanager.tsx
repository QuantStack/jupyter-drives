import * as React from 'react';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import { Button, Search } from '@jupyter/react-components';
import { useState } from 'react';
import { IDriveInfo } from '../token';
import {
  addExternalDrive,
  addPublicDrive,
  excludeDrive,
  getDrivesList,
  getExcludedDrives,
  includeDrive,
  mountDrive
} from '../requests';
import { ISignal, Signal } from '@lumino/signaling';
import { driveBrowserIcon, addIcon, removeIcon } from '../icons';

interface IProps {
  model: DriveListModel;
}

export interface IDriveInputProps {
  isName: boolean;
  driveValue: string;
  regionValue: string;
  setPublicDrive: (value: string) => void;
  setRegion: (value: string) => void;
  onSubmit: () => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  mountError: string;
  resetMountError: () => void;
}

export function DriveInputComponent({
  driveValue,
  regionValue,
  setPublicDrive,
  setRegion,
  onSubmit,
  isPublic,
  setIsPublic,
  mountError,
  resetMountError
}: IDriveInputProps) {
  return (
    <div>
      <div className="add-public-drive-section">
        <input
          className="drive-search-input"
          onInput={(event: any) => {
            setPublicDrive(event.target.value);
            resetMountError();
          }}
          placeholder="Enter drive name"
          value={driveValue}
        />
        <Button
          className="input-add-drive-button"
          onClick={onSubmit}
          title="Add public drive"
        >
          add
        </Button>
      </div>
      <div className="add-public-drive-section">
        {'Public drive?'}
        <input
          type="checkbox"
          checked={isPublic}
          onChange={event => {
            setIsPublic(event.target.checked);
            setRegion('');
          }}
        />
        {!isPublic && (
          <input
            className="drive-region-input"
            onInput={(event: any) => {
              setRegion(event.target.value);
              resetMountError();
            }}
            placeholder="Region (e.g.: us-east-1)"
            value={regionValue}
          />
        )}
      </div>
      {mountError && (
        <div className="add-public-drive-section">
          <p className="error">{mountError}</p>
        </div>
      )}
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
                    title="Add drive"
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
                title="Remove drive"
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
  const [publicDrive, setPublicDrive] = useState('');
  const [searchDrive, setSearchDrive] = useState('');
  const [selectedDrives, setSelectedDrives] = useState<Partial<IDriveInfo>[]>(
    model.selectedDrives
  );
  const [availableDrives, setAvailableDrives] = useState<Partial<IDriveInfo>[]>(
    model.availableDrives
  );
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [driveRegion, setDriveRegion] = useState<string>('');
  const [mountError, setMountError] = useState<string>('');

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

  const onAddedPublicDrive = async () => {
    // Check if user has access to drive.
    const result = await mountDrive(publicDrive, {
      provider: 's3',
      location: driveRegion
    });
    if (result && result.error) {
      // Show error in case of failure.
      setMountError(result.error.message);
    } else {
      // Proceed with adding the drive otherwise.
      if (isPublic) {
        await addPublicDrive(publicDrive);
      } else {
        await addExternalDrive(publicDrive, driveRegion);
      }
      setPublicDrive('');
      setDriveRegion('');
      setIsPublic(false);
      await model.refresh();
    }
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
          <div className="drives-section-title"> Add external drive</div>
          <DriveInputComponent
            isName={false}
            driveValue={publicDrive}
            regionValue={driveRegion}
            setPublicDrive={setPublicDrive}
            setRegion={setDriveRegion}
            isPublic={isPublic}
            setIsPublic={setIsPublic}
            onSubmit={onAddedPublicDrive}
            mountError={mountError}
            resetMountError={() => setMountError('')}
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
