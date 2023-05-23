import mergeWith from "lodash.mergewith";

import type {
  app_device_MeshChannel,
  app_ipc_DeviceBulkConfig,
  app_protobufs_Channel,
  app_protobufs_LocalConfig,
  app_protobufs_LocalModuleConfig,
} from "@bindings/index";

import type {
  ChannelConfigInput,
  IModuleConfigState,
  IRadioConfigState,
} from "@features/config/configSlice";

import { getMeshChannelFromCurrentConfig } from "@utils/form";

const mergeWithOmitNull = <T>(a: T, b: T) => (b === null ? a : undefined);

export const getCombinedRadioConfig = (
  currentRadioConfig: app_protobufs_LocalConfig | null,
  editedRadioConfig: IRadioConfigState
): app_protobufs_LocalConfig | null => {
  return mergeWith(
    {},
    currentRadioConfig,
    editedRadioConfig,
    mergeWithOmitNull
  );
};

export const getCombinedModuleConfig = (
  currentModuleConfig: app_protobufs_LocalModuleConfig | null,
  editedModuleConfig: IModuleConfigState
): app_protobufs_LocalModuleConfig | null => {
  return mergeWith(
    {},
    currentModuleConfig,
    editedModuleConfig,
    mergeWithOmitNull
  );
};

export const getCombinedChannelConfig = (
  currentChannelConfig: Record<number, app_device_MeshChannel> | null,
  editedChannelConfig: Record<number, ChannelConfigInput | null>
): app_protobufs_Channel[] | null => {
  if (!currentChannelConfig) {
    throw new Error("Current channel config not defined");
  }

  const mergedConfig: Record<number, app_device_MeshChannel> = {};

  for (const [idx, currentChannel] of Object.entries(currentChannelConfig)) {
    const channelNum = parseInt(idx);
    const editedChannel = getMeshChannelFromCurrentConfig(
      editedChannelConfig[channelNum]
    );

    console.warn(currentChannel, editedChannel);

    mergedConfig[channelNum] = mergeWith(
      {},
      currentChannel,
      editedChannel,
      // * Need to override array values instead of merging
      (objVal, srcVal) => {
        // * Modification of `mergeWithOmitNull`
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (srcVal === null) return objVal;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (Array.isArray(objVal)) return srcVal;
      }
    );
  }

  return Object.values(mergedConfig).map((mc) => mc.config);
};

export const getCombinedConfig = (
  includeRadioConfig: boolean,
  currentRadioConfig: app_protobufs_LocalConfig | null,
  editedRadioConfig: IRadioConfigState,
  includeModuleConfig: boolean,
  currentModuleConfig: app_protobufs_LocalModuleConfig | null,
  editedModuleConfig: IModuleConfigState,
  includeChannelConfig: boolean,
  currentChannelConfig: Record<number, app_device_MeshChannel> | null,
  editedChannelConfig: Record<number, ChannelConfigInput | null>
): app_ipc_DeviceBulkConfig | null => {
  const configPayload: app_ipc_DeviceBulkConfig = {
    radio: null,
    module: null,
    channels: null,
  };

  if (includeRadioConfig) {
    configPayload.radio = getCombinedRadioConfig(
      currentRadioConfig,
      editedRadioConfig
    );
  }

  if (includeModuleConfig) {
    configPayload.module = getCombinedModuleConfig(
      currentModuleConfig,
      editedModuleConfig
    );
  }

  if (includeChannelConfig) {
    configPayload.channels = getCombinedChannelConfig(
      currentChannelConfig,
      editedChannelConfig
    );
  }

  return configPayload;
}
