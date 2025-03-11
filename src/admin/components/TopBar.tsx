import { Box, Button, Icon, Text } from '@adminjs/design-system';
import { ReduxState } from 'adminjs';
import React, { FC } from 'react';
import { useSelector } from 'react-redux';

const TopBar: FC = () => {
  const versions = useSelector((state: ReduxState) => state.versions);
  const GITHUB_URL = (window as any).AdminJS.env.GITHUB_URL;
  const DOCUMENTATION_URL = (window as any).AdminJS.env.DOCUMENTATION_URL;
  const DISCORD_URL = (window as any).AdminJS.env.DISCORD_URL;

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
    </Box>
  );
};

export { TopBar };
export default TopBar;
