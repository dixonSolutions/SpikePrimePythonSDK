import type { DocPage } from '../types';

export const apiErrors: DocPage = {
  slug: 'api-errors',
  title: 'spikeprime.errors',
  summary: 'The exception hierarchy, and exactly what raises each one.',
  keywords: ['HubError', 'HubNotFoundError', 'HubProtocolError', 'HubNackError', 'HubTimeoutError', 'exception'],
  sections: [
    {
      id: 'tree',
      title: 'The tree',
      blocks: [
        {
          kind: 'code',
          lang: 'text',
          code: `Exception
└── HubError
    ├── HubNotFoundError
    ├── HubProtocolError
    ├── HubNackError
    └── HubTimeoutError`,
        },
        {
          kind: 'prose',
          html: 'Catching <code>HubError</code> catches everything hub-related without swallowing genuine bugs. <code>ValueError</code> is deliberately outside the tree: an invalid slot or an empty firmware image is a mistake in the calling code, raised before anything is sent.',
        },
      ],
    },
    {
      id: 'classes',
      title: 'The exceptions',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'HubError',
              kind: 'exception',
              signature: 'class HubError(Exception)',
              summary: 'Base error for hub communication. Every other error here derives from it.',
            },
            {
              name: 'HubNotFoundError',
              kind: 'exception',
              signature: 'class HubNotFoundError(HubError)',
              summary:
                'No matching hub was advertising the HubOS GATT service — and, on Linux, no already-connected device matched either. Raised by <code>connect()</code> and by <code>reconnect()</code>.',
              notes:
                'The message names what was being looked for, so a mistyped hub name is obvious from the traceback alone.',
            },
            {
              name: 'HubProtocolError',
              kind: 'exception',
              signature: 'class HubProtocolError(HubError)',
              summary:
                'Bytes from the hub could not be decoded, or a response was the wrong type. Also covers a few state and consistency failures.',
              notes:
                'Raised for: an empty or unknown message id; a reply whose type does not match the request; reading <code>hub.info</code> before the handshake; an outstanding request when the link drops; an unusable chunk size; and a firmware resume offset that is not a multiple of the chunk size. Unknown <em>notifications</em> are logged and skipped instead, so new firmware messages do not break a session.',
            },
            {
              name: 'HubNackError',
              kind: 'exception',
              signature: 'class HubNackError(HubError):\n    operation: str',
              summary:
                'The hub returned response status <code>0x01</code> (Not Acknowledged). It understood the request and declined it.',
              params: [
                {
                  name: 'operation',
                  type: 'str',
                  doc: 'What was refused, e.g. <code>"start slot 5"</code> or <code>"transfer chunk at 2048"</code>. Prefer this over parsing the message text.',
                },
              ],
              example: {
                lang: 'python',
                code: `try:
    await hub.start(5)
except HubNackError as exc:
    print(exc.operation)     # "start slot 5"
    print(exc)               # "start slot 5 was not acknowledged by the hub"`,
              },
            },
            {
              name: 'HubTimeoutError',
              kind: 'exception',
              signature: 'class HubTimeoutError(HubError)',
              summary:
                'A request did not receive its matching response in time, or a bounded <code>wait_until_stopped()</code> elapsed.',
              notes:
                'Requests default to 10 seconds. Hubs answer in milliseconds, so a timeout almost always means the link is gone rather than that the hub is slow — <code>reconnect()</code> is usually the right response, not a retry.',
            },
          ],
        },
      ],
    },
    {
      id: 'guide',
      title: 'Handling them',
      blocks: [
        {
          kind: 'prose',
          html: 'Patterns for retrying, reconnecting and supervising a session are in <a href="docs/errors-and-timeouts">Errors and timeouts</a>, along with the exit codes the CLI maps these onto.',
        },
      ],
    },
  ],
};
