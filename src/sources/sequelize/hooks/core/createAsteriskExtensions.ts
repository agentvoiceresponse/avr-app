import fs from 'fs';
import path from 'path';
import * as url from 'url';

import { ActionRequest, ActionResponse, After } from 'adminjs';
import { CoreModel } from '../../models/index.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const createAsteriskExtensions =
  (): After<ActionResponse> =>
  async (response: ActionResponse, request: ActionRequest): Promise<ActionResponse> => {
    const { method } = request;
    const { notice } = response;

    if (method !== 'post') return response;

    if (notice.type == 'error') return response;

    const template = `[avr]
exten => s,1,Answer()
 same => n,Ringing()
 same => n,Set(UUID=\${SHELL(uuidgen | tr -d '\\n')})
 same => n,AudioSocket(\${UUID},\${ARG1})
 same => n,Hangup()

[demo]

{{GOSUBS}}
`;
    try {
      const cores = await CoreModel.findAll({ attributes: ['id', 'name'] });
      const gosubLines = cores
        .map((core) => {
          const port = (+process.env.CORE_PORT_START || 5000) + Number(core.id);
          return `exten => ${port},1,GoSub(avr,s,1(avr-core-${core.id}:${port}))`;
        })
        .join('\n');
      const config = template.replace('{{GOSUBS}}', gosubLines);
      const extensions = path.join(__dirname, '../../../../../asterisk/conf', 'extensions.conf');
      fs.writeFileSync(extensions, config, 'utf8');
    } catch (error) {
      console.error('Error creating Asterisk extensions:', error);
    }

    return response;
  };
