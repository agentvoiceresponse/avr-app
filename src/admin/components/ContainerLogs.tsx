import { Box } from '@adminjs/design-system';
import { BasePropertyProps } from 'adminjs';
import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ContainerLogs = (props: BasePropertyProps) => {
  const { record } = props;
  return (
    <Box variant="container" boxShadow="card" padding="lg">
      <Box maxHeight={500} overflowY="scroll">
        <SyntaxHighlighter language="bash" style={solarizedlight}>
          {record.params.logs}
        </SyntaxHighlighter>
      </Box>
    </Box>
  );
};

export default ContainerLogs;
