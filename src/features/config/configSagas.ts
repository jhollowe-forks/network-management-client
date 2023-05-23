import { invoke } from "@tauri-apps/api";
import { all, call, put, select, takeEvery } from "redux-saga/effects";

import type { app_ipc_DeviceBulkConfig } from "@bindings/index";

import {
  requestLoadConfigFromFile,
  requestSaveConfigToFile,
  requestUploadConfigToDevice,
} from "@features/config/configActions";
import {
  selectCurrentAllChannelConfig,
  selectCurrentModuleConfig,
  selectCurrentRadioConfig,
  selectEditedAllChannelConfig,
  selectEditedModuleConfig,
  selectEditedRadioConfig,
} from "@features/config/configSelectors";
import { configSliceActions } from "@features/config/configSlice";

import {
  selectActiveNode,
  selectConnectedDeviceNode,
  selectPrimarySerialPort,
} from "@features/device/deviceSelectors";
import { requestSliceActions } from "@features/requests/requestReducer";

import { getCombinedConfig } from "@utils/config";
import type { CommandError } from "@utils/errors";

function* uploadConfigToDeviceWorker(
  action: ReturnType<typeof requestUploadConfigToDevice>
) {
  try {
    yield put(requestSliceActions.setRequestPending({ name: action.type }));

    const fieldFlags = action.payload;

    const includeRadioConfig = fieldFlags.includes("radio");
    const includeModuleConfig = fieldFlags.includes("module");
    const includeChannelConfig = fieldFlags.includes("channel");

    const activePort = (yield select(selectPrimarySerialPort())) as
      | string
      | null;

    if (!activePort) {
      throw new Error("No active port");
    }

    // Get current and edited config

    const currentRadioConfig = (yield select(
      selectCurrentRadioConfig()
    )) as ReturnType<ReturnType<typeof selectCurrentRadioConfig>>;

    const editedRadioConfig = (yield select(
      selectEditedRadioConfig()
    )) as ReturnType<ReturnType<typeof selectEditedRadioConfig>>;

    const currentModuleConfig = (yield select(
      selectCurrentModuleConfig()
    )) as ReturnType<ReturnType<typeof selectCurrentModuleConfig>>;

    const editedModuleConfig = (yield select(
      selectEditedModuleConfig()
    )) as ReturnType<ReturnType<typeof selectEditedModuleConfig>>;

    const currentChannelConfig = (yield select(
      selectCurrentAllChannelConfig()
    )) as ReturnType<ReturnType<typeof selectCurrentAllChannelConfig>>;

    const editedChannelConfig = (yield select(
      selectEditedAllChannelConfig()
    )) as ReturnType<ReturnType<typeof selectEditedAllChannelConfig>>;

    if (!currentRadioConfig || !currentModuleConfig) {
      throw new Error("Current radio or module config not defined");
    }

    const configPayload = getCombinedConfig(
      includeRadioConfig,
      currentRadioConfig,
      editedRadioConfig,
      includeModuleConfig,
      currentModuleConfig,
      editedModuleConfig,
      includeChannelConfig,
      currentChannelConfig,
      editedChannelConfig
    );

    // Dispatch update to backend

    yield call(invoke, "update_device_config_bulk", {
      portName: activePort,
      config: configPayload,
    });

    // Clear temporary config fields

    if (includeRadioConfig) {
      yield put(configSliceActions.clearRadioConfig());
    }

    if (includeModuleConfig) {
      yield put(configSliceActions.clearModuleConfig());
    }

    if (includeChannelConfig) {
      yield put(configSliceActions.clearChannelConfig());
    }

    yield put(requestSliceActions.setRequestSuccessful({ name: action.type }));
  } catch (error) {
    yield put(
      requestSliceActions.setRequestFailed({
        name: action.type,
        message: (error as CommandError).message,
      })
    );
  }
}

function* saveConfigToFileWorker(
  action: ReturnType<typeof requestSaveConfigToFile>
) {
  try {
    yield put(requestSliceActions.setRequestPending({ name: action.type }));

    const fieldFlags = action.payload;

    const includeRadioConfig = fieldFlags.includes("radio");
    const includeModuleConfig = fieldFlags.includes("module");
    const includeChannelConfig = fieldFlags.includes("channel");

    const activePort = (yield select(selectPrimarySerialPort())) as
      | string
      | null;

    if (!activePort) {
      throw new Error("No active port");
    }

    // Get current and edited config

    const currentRadioConfig = (yield select(
      selectCurrentRadioConfig()
    )) as ReturnType<ReturnType<typeof selectCurrentRadioConfig>>;

    const editedRadioConfig = (yield select(
      selectEditedRadioConfig()
    )) as ReturnType<ReturnType<typeof selectEditedRadioConfig>>;

    const currentModuleConfig = (yield select(
      selectCurrentModuleConfig()
    )) as ReturnType<ReturnType<typeof selectCurrentModuleConfig>>;

    const editedModuleConfig = (yield select(
      selectEditedModuleConfig()
    )) as ReturnType<ReturnType<typeof selectEditedModuleConfig>>;

    const currentChannelConfig = (yield select(
      selectCurrentAllChannelConfig()
    )) as ReturnType<ReturnType<typeof selectCurrentAllChannelConfig>>;

    const editedChannelConfig = (yield select(
      selectEditedAllChannelConfig()
    )) as ReturnType<ReturnType<typeof selectEditedAllChannelConfig>>;

    if (!currentRadioConfig || !currentModuleConfig) {
      throw new Error("Current radio or module config not defined");
    }

    const activeNode = (yield select(
      selectConnectedDeviceNode()
    )) as ReturnType<ReturnType<typeof selectActiveNode>>;

    const configPayload = getCombinedConfig(
      includeRadioConfig,
      currentRadioConfig,
      editedRadioConfig,
      includeModuleConfig,
      currentModuleConfig,
      editedModuleConfig,
      includeChannelConfig,
      currentChannelConfig,
      editedChannelConfig
    );

    // Dispatch update to backend

    const nodeLongName = activeNode?.data.user?.longName ?? null;

    const includedFields = fieldFlags.reduce((accum, flag) => {
      switch (flag) {
        case "radio":
          return [...accum, "radio"];
        case "module":
          return [...accum, "module"];
        case "channel":
          return [...accum, "channel"];
        default:
          return accum;
      }
    }, [] as string[]).join("-");

    if (!includedFields.length) {
      throw new Error("No fields included");
    }

    const startingFileName = nodeLongName ?
      `${nodeLongName.toLocaleLowerCase().replace(" ", "")}-${includedFields}` :
      null;

    yield call(invoke, "export_config_to_file", {
      config: configPayload,
      startingFileName,
    });

    yield put(requestSliceActions.setRequestSuccessful({ name: action.type }));
  } catch (error) {
    yield put(
      requestSliceActions.setRequestFailed({
        name: action.type,
        message: (error as CommandError).message,
      })
    );
  }
}

function* loadConfigFromFileWorker(
  action: ReturnType<typeof requestLoadConfigFromFile>
) {
  try {
    yield put(requestSliceActions.setRequestPending({ name: action.type }));

    const activePort = (yield select(selectPrimarySerialPort())) as
      | string
      | null;

    if (!activePort) {
      throw new Error("No active port");
    }

    // Get loaded file from backend

    const loadedConfig = (yield call(
      invoke,
      "import_config_from_file"
    )) as app_ipc_DeviceBulkConfig;

    // Upload loaded config to devicce

    console.warn('loadedConfig', loadedConfig);

    yield call(invoke, "update_device_config_bulk", {
      portName: activePort,
      config: loadedConfig,
    });

    yield put(requestSliceActions.setRequestSuccessful({ name: action.type }));
  } catch (error) {
    yield put(
      requestSliceActions.setRequestFailed({
        name: action.type,
        message: (error as CommandError).message,
      })
    );
  }
}

export function* configSaga() {
  yield all([
    takeEvery(requestUploadConfigToDevice.type, uploadConfigToDeviceWorker),
  ]);
  yield all([takeEvery(requestSaveConfigToFile.type, saveConfigToFileWorker)]);
  yield all([
    takeEvery(requestLoadConfigFromFile.type, loadConfigFromFileWorker),
  ]);
}
