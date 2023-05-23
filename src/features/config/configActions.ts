import { createAction } from "@reduxjs/toolkit";
import type { IConfigState } from "@features/config/configSlice";

export const requestUploadConfigToDevice = createAction<(keyof IConfigState)[]>(
  "@device/request-upload-config-to-device"
);

export const requestSaveConfigToFile = createAction<(keyof IConfigState)[]>(
  "@device/request-save-config-to-file"
);

export const requestLoadConfigFromFile = createAction(
  "@device/request-load-config-from-file"
);
