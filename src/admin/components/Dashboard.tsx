import React, { useEffect, useState } from 'react';
import { Box, Button, H1, H2, H5, Illustration, Text } from '@adminjs/design-system';
import { styled } from '@adminjs/design-system/styled-components';

import RocketSVG from './utils/rocket-svg.js';
import DiscordLogo from './utils/discord-logo-svg.js';
import { ApiClient, useTranslation } from 'adminjs';

const pageHeaderHeight = 300;
const pageHeaderPaddingY = 74;
const pageHeaderPaddingX = 250;

export const DashboardHeader: React.FC = () => {
  const { translateMessage } = useTranslation();
  return (
    <Box data-css="default-dashboard">
      <Box
        position="relative"
        overflow="hidden"
        bg="white"
        height={pageHeaderHeight}
        py={pageHeaderPaddingY}
        px={['default', 'lg', pageHeaderPaddingX]}
      >
        <Box position="absolute" top={30} left={0} opacity={0.9} animate display={['none', 'none', 'none', 'block']}>
          <RocketSVG />
        </Box>
        <Text textAlign="center" color="grey100">
          <H2 fontWeight="bold">{translateMessage('welcomeOnBoard_title')} Admin</H2>
          <Text opacity={0.8}>{translateMessage('welcomeOnBoard_subtitle')}</Text>
        </Text>
      </Box>
    </Box>
  );
};

type BoxType = {
  counter: number;
  title: string;
  href: string;
};

const boxes = ({ data, translateLabel }): Array<BoxType> => [
  {
    counter: data?.cores || 0,
    title: translateLabel('core'),
    href: '/admin/resources/core',
  },
  {
    counter: data?.asr || 0,
    title: translateLabel('asr'),
    href: '/admin/resources/asr',
  },
  {
    counter: data?.llm || 0,
    title: translateLabel('llm'),
    href: '/admin/resources/llm',
  },
  {
    counter: data?.tts || 0,
    title: translateLabel('tts'),
    href: '/admin/resources/tts',
  },
];

const Card = styled(Box)`
  display: ${({ flex }): string => (flex ? 'flex' : 'block')};
  color: ${({ theme }) => theme.colors.grey100};
  height: 100%;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.space.md};
  transition: all 0.1s ease-in;

  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary60};
    box-shadow: ${({ theme }) => theme.shadows.cardHover};
  }

  & .dsc-icon svg,
  .gh-icon svg {
    width: 64px;
    height: 64px;
  }
`;

Card.defaultProps = {
  variant: 'container',
  boxShadow: 'card',
};

export const Dashboard: React.FC = () => {
  const { translateMessage, translateLabel, translateButton } = useTranslation();
  const [data, setData] = useState(null);
  const api = new ApiClient();
  useEffect(() => {
    api
      .getDashboard()
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        // handle any errors
        console.error(error);
      });
  }, []);
  return (
    <Box>
      <DashboardHeader />
      <Box
        mt={['xl', 'xl', '-100px']}
        mb="xl"
        mx={[0, 0, 0, 'auto']}
        px={['default', 'lg', 'xxl', '0']}
        position="relative"
        flex
        flexDirection="row"
        flexWrap="wrap"
        width={[1, 1, 1, 1024]}
      >
        {boxes({ data, translateLabel }).map((box, index) => (
          <Box key={index} width={[1, 1 / 2, 1 / 2, 1 / 2]} p="lg">
            <Card as="a" href={box.href}>
              <Text textAlign="center">
                <H1>{box.counter}</H1>
                <H5 mt="md">{box.title}</H5>
                {/* <Text>{box.subtitle}</Text> */}
              </Text>
            </Card>
          </Box>
        ))}
        <Card width={1} m="lg">
          <Text textAlign="center">
            {/* <Illustration variant="AdminJSLogo" /> */}
            <H5>{translateMessage('needMoreSolutions_title')}</H5>
            <Text>{translateMessage('needMoreSolutions_subtitle')}</Text>
            <Text mt="xxl">
              <Button as="a" variant="contained" href="https://agentvoiceresponse.com/#contact" target="_blank">
                {translateButton('contactUs')}
              </Button>
            </Text>
          </Text>
        </Card>
        <Box width={[1, 1, 1 / 2]} p="lg">
          <Card as="a" flex href="https://discord.gg/mzsZ4Unk" target="_blank">
            <Box flexShrink={0} className="dsc-icon">
              <DiscordLogo />
            </Box>
            <Box ml="xl">
              <H5>{translateMessage('community_title')}</H5>
              <Text>{translateMessage('community_subtitle')}</Text>
            </Box>
          </Card>
        </Box>
        <Box width={[1, 1, 1 / 2]} p="lg">
          <Card as="a" flex href="https://github.com/agentvoiceresponse" target="_blank">
            <Box flexShrink={0} className="gh-icon">
              <Illustration variant="GithubLogo" />
            </Box>
            <Box ml="xl">
              <H5>{translateMessage('foundBug_title')}</H5>
              <Text>{translateMessage('foundBug_subtitle')}</Text>
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
