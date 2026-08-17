import type { DocPage } from '../types';

export const apiEnums: DocPage = {
  slug: 'api-enums',
  title: 'spikeprime.enums',
  summary: 'Every enumeration from the HubOS protocol documentation, with its wire values.',
  keywords: ['Port', 'Color', 'HubFace', 'MotorType', 'MotorDirection', 'MotorEndState', 'IntEnum', 'enum'],
  sections: [
    {
      id: 'about',
      title: 'About these enums',
      blocks: [
        {
          kind: 'prose',
          html: 'All of them subclass <code>IntEnum</code>, so a member compares equal to its wire value and can be passed anywhere an <code>int</code> is expected. That keeps serialization simple and makes debugging output readable.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime import Port

Port.C == 2        # True
Port.C.name        # "C"
Port.C.value       # 2
Port(2)            # Port.C`,
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Two of them tolerate unknown values',
          html: '<code>Color</code> and <code>MotorType</code> have <code>from_int8()</code> / <code>from_uint8()</code> constructors that fall back to an <code>UNKNOWN</code> member instead of raising. That is what keeps an unfamiliar reading from crashing a run.',
        },
      ],
    },
    {
      id: 'port',
      title: 'Port',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Port',
              kind: 'enum',
              signature: 'class Port(IntEnum)',
              summary: 'The six external ports on the hub.',
              params: [
                { name: 'A', default: '0x00', doc: '' },
                { name: 'B', default: '0x01', doc: '' },
                { name: 'C', default: '0x02', doc: '' },
                { name: 'D', default: '0x03', doc: '' },
                { name: 'E', default: '0x04', doc: '' },
                { name: 'F', default: '0x05', doc: '' },
              ],
              example: {
                lang: 'python',
                code: `for port, motor in snapshot.motors.items():
    print(port.name, motor.position)`,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'color',
      title: 'Color',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Color',
              kind: 'enum',
              signature: 'class Color(IntEnum)',
              summary: 'The colours a colour sensor can report.',
              params: [
                { name: 'BLACK', default: '0x00', doc: '' },
                { name: 'MAGENTA', default: '0x01', doc: '' },
                { name: 'PURPLE', default: '0x02', doc: '' },
                { name: 'BLUE', default: '0x03', doc: '' },
                { name: 'AZURE', default: '0x04', doc: '' },
                { name: 'TURQUOISE', default: '0x05', doc: '' },
                { name: 'GREEN', default: '0x06', doc: '' },
                { name: 'YELLOW', default: '0x07', doc: '' },
                { name: 'ORANGE', default: '0x08', doc: '' },
                { name: 'RED', default: '0x09', doc: '' },
                { name: 'WHITE', default: '0x0A', doc: '' },
                { name: 'UNKNOWN', default: '-1', doc: '<code>0xFF</code> on the wire, read as a signed byte.' },
              ],
            },
            {
              name: 'Color.from_int8',
              kind: 'method',
              signature: '@classmethod\ndef from_int8(cls, value: int) -> Color',
              summary:
                'Build a <code>Color</code> from a signed byte, mapping both <code>-1</code> and <code>0xFF</code> — and anything unrecognised — to <code>UNKNOWN</code>.',
            },
          ],
        },
      ],
    },
    {
      id: 'hubface',
      title: 'HubFace',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'HubFace',
              kind: 'enum',
              signature: 'class HubFace(IntEnum)',
              summary: 'Which face of the hub is being referred to, as used by the IMU.',
              params: [
                { name: 'TOP', default: '0x00', doc: '' },
                { name: 'FRONT', default: '0x01', doc: '' },
                { name: 'RIGHT', default: '0x02', doc: '' },
                { name: 'BOTTOM', default: '0x03', doc: '' },
                { name: 'BACK', default: '0x04', doc: '' },
                { name: 'LEFT', default: '0x05', doc: '' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'motor',
      title: 'Motor enums',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'MotorType',
              kind: 'enum',
              signature: 'class MotorType(IntEnum)',
              summary: 'Which motor is attached.',
              params: [
                { name: 'MEDIUM', default: '0x30', doc: '' },
                { name: 'LARGE', default: '0x31', doc: '' },
                { name: 'SMALL', default: '0x41', doc: '' },
                { name: 'UNKNOWN', default: '0x00', doc: 'Anything this build does not recognise.' },
              ],
            },
            {
              name: 'MotorType.from_uint8',
              kind: 'method',
              signature: '@classmethod\ndef from_uint8(cls, value: int) -> MotorType',
              summary: 'Build a <code>MotorType</code> from an unsigned byte, falling back to <code>UNKNOWN</code>.',
            },
            {
              name: 'MotorEndState',
              kind: 'enum',
              signature: 'class MotorEndState(IntEnum)',
              summary: 'What a motor should do when a movement finishes.',
              params: [
                { name: 'COAST', default: '0x00', doc: '' },
                { name: 'BRAKE', default: '0x01', doc: '' },
                { name: 'HOLD', default: '0x02', doc: '' },
                { name: 'CONTINUE', default: '0x03', doc: '' },
                { name: 'COAST_SMART', default: '0x04', doc: '' },
                { name: 'BRAKE_SMART', default: '0x05', doc: '' },
                { name: 'DEFAULT', default: '-1', doc: '<code>0xFF</code> on the wire.' },
              ],
            },
            {
              name: 'MotorDirection',
              kind: 'enum',
              signature: 'class MotorDirection(IntEnum)',
              summary: 'How a motor should reach a target position.',
              params: [
                { name: 'CLOCKWISE', default: '0x00', doc: '' },
                { name: 'COUNTER_CLOCKWISE', default: '0x01', doc: '' },
                { name: 'SHORTEST_PATH', default: '0x02', doc: '' },
                { name: 'LONGEST_PATH', default: '0x03', doc: '' },
              ],
            },
          ],
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'These two describe hub-side behaviour',
          html: '<code>MotorEndState</code> and <code>MotorDirection</code> are part of the documented enumeration set and are provided for completeness. Nothing in the host protocol drives a motor directly — motor control happens in the program running on the hub.',
        },
      ],
    },
    {
      id: 'protocol-enums',
      title: 'Protocol enums',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'ProgramAction',
              kind: 'enum',
              signature: 'class ProgramAction(IntEnum)',
              summary: 'The action carried by a program-flow request or notification.',
              params: [
                { name: 'START', default: '0x00', doc: '' },
                { name: 'STOP', default: '0x01', doc: '' },
              ],
            },
            {
              name: 'ResponseStatus',
              kind: 'enum',
              signature: 'class ResponseStatus(IntEnum)',
              summary:
                'The status byte in an acknowledgement. A <code>NACK</code> is what surfaces as <code>HubNackError</code>.',
              params: [
                { name: 'ACK', default: '0x00', doc: 'Acknowledged.' },
                { name: 'NACK', default: '0x01', doc: 'Not acknowledged.' },
              ],
            },
            {
              name: 'ProductGroup',
              kind: 'enum',
              signature: 'class ProductGroup(IntEnum)',
              summary:
                'The product group reported in the handshake. <code>InfoResponse.product_group</code> returns <code>None</code> rather than raising when a hub reports one this build does not know.',
              params: [{ name: 'SPIKE_PRIME', default: '0x0000', doc: '' }],
            },
          ],
        },
      ],
    },
  ],
};
