import React, { FC } from 'react';
import { Navigation } from '@adminjs/design-system';
import { useTranslation, type SidebarResourceSectionProps, useNavigationResources } from 'adminjs';

const MYSidebarResourceSection: FC<SidebarResourceSectionProps> = ({ resources }) => {
  const elements = useNavigationResources(resources);
  const { translateLabel } = useTranslation();

  return <Navigation label={translateLabel('navigation')} elements={elements} />;
};

export default MYSidebarResourceSection;
