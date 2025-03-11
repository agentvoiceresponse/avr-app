import { buildFeature, FeatureType } from 'adminjs';

export const disableBulkDelete = (): FeatureType => {
  return buildFeature({
    actions: {
      bulkDelete: {
        isAccessible: false,
        isVisible: false,
      },
    },
  });
};
