import { Box, Button, CurrentUserNav, CurrentUserNavProps, Icon, Text } from '@adminjs/design-system';
import { ReduxState, useTranslation, VersionProps } from 'adminjs';
import React, { FC, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const MyVersion: FC<VersionProps> = () => {
  const { translateButton } = useTranslation();
  const versions = useSelector((state: ReduxState) => state.versions);
  const paths = useSelector((state: ReduxState) => state.paths);

  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    fetch('/me')
      .then(res => res.json())
      .then(data => setAdmin(data))
      .catch(() => setAdmin(null));
  }, []);
  

  const GITHUB_URL = (window as any).AdminJS.env.GITHUB_URL;
  const DOCUMENTATION_URL = (window as any).AdminJS.env.DOCUMENTATION_URL;
  const DISCORD_URL = (window as any).AdminJS.env.DISCORD_URL;

  const dropActions: CurrentUserNavProps['dropActions'] = [
    {
      label: translateButton('account'),
      onClick: (event: Event): void => {
        event.preventDefault();
        window.location.href = admin.iss + '/account';
      },
      icon: 'User',
    },
    {
      label: translateButton('logout'),
      onClick: (event: Event): void => {
        event.preventDefault();
        window.location.href = paths.logoutPath;
      },
      icon: 'LogOut',
    },
  ];

  return (
    <Box flex flexGrow={1} justifyContent="end" alignItems="center">
      <Text ml="xl" mr="auto">
        v{versions.app}
      </Text>
      <Button color="text" as="a" href={DISCORD_URL} target="_blank">
        <Icon icon="MessageSquare" />
        Discord
      </Button>
      <Button color="text" as="a" href={GITHUB_URL} target="_blank">
        <Icon icon="GitHub" />
        GitHub
      </Button>
      <Button color="text" as="a" href={DOCUMENTATION_URL} target="_blank">
        <Icon icon="BookOpen" />
        Documentation
      </Button>
      <CurrentUserNav
        name={admin?.name || admin?.preferred_username || 'User'}
        title={admin?.email || ''}
        avatarUrl={admin?.avatarUrl}
        dropActions={dropActions}
      />
    </Box>
  );
};

export default MyVersion;
