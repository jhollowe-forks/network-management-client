import { invoke } from "@tauri-apps/api";
import { all, call, put, select, takeEvery } from "redux-saga/effects";

import { requestCommitConfig } from "@features/config/configActions";
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

function* commitConfigWorker(action: ReturnType<typeof requestCommitConfig>) {
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

    const startingFileName = activeNode?.data.user?.longName.toLocaleLowerCase().replace(" ", "") ?? null;

    yield call(invoke, "export_config_to_file", {
      config: configPayload,
      startingFileName,
    });

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

export function* configSaga() {
  yield all([takeEvery(requestCommitConfig.type, commitConfigWorker)]);
}
