import type { DocPage } from '../types';

export const apiDevices: DocPage = {
  slug: 'api-devices',
  title: 'spikeprime.devices',
  summary: 'The typed snapshot returned for every device notification, and each dataclass inside it.',
  keywords: ['DeviceSnapshot', 'Battery', 'IMU', 'Motor', 'ColorSensor', 'DistanceSensor', 'ForceSensor', 'dataclass'],
  sections: [
    {
      id: 'snapshot',
      title: 'DeviceSnapshot',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'DeviceSnapshot',
              id: 'devicesnapshot',
              kind: 'dataclass',
              signature: `@dataclass
class DeviceSnapshot:
    battery: Battery | None = None
    imu: IMU | None = None
    display: Matrix5x5 | None = None
    motors: dict[Port, Motor] = field(default_factory=dict)
    force: dict[Port, ForceSensor] = field(default_factory=dict)
    color: dict[Port, ColorSensor] = field(default_factory=dict)
    distance: dict[Port, DistanceSensor] = field(default_factory=dict)
    color_matrix: dict[Port, ColorMatrix] = field(default_factory=dict)`,
              summary:
                'The latest values from one device notification. Built fresh each time, so it is a complete picture rather than a delta — a device that has been unplugged simply stops appearing.',
            },
            {
              name: 'DeviceSnapshot.from_notification',
              kind: 'method',
              signature:
                '@classmethod\ndef from_notification(cls, notification: DeviceNotification) -> DeviceSnapshot',
              summary:
                'Build a snapshot from a decoded device notification. Called for you by the client; useful directly when replaying a capture.',
              example: {
                lang: 'python',
                code: `from spikeprime.devices import DeviceSnapshot
from spikeprime.protocol.messages import DeviceNotification

notification = DeviceNotification.deserialize(raw)
snapshot = DeviceSnapshot.from_notification(notification)`,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'hub-devices',
      title: 'Hub-level devices',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Battery',
              kind: 'dataclass',
              signature: '@dataclass(frozen=True)\nclass Battery:\n    percent: int',
              summary: 'Charge as a percentage.',
            },
            {
              name: 'IMU',
              kind: 'dataclass',
              signature: `@dataclass(frozen=True)
class IMU:
    face_up: HubFace
    yaw_face: HubFace
    yaw: int
    pitch: int
    roll: int
    accel: tuple[int, int, int]
    gyro: tuple[int, int, int]`,
              summary: 'Orientation and raw motion data from the hub’s inertial sensor.',
              params: [
                { name: 'face_up', type: 'HubFace', doc: 'Which face of the hub is pointing up.' },
                { name: 'yaw_face', type: 'HubFace', doc: 'The face yaw is measured around.' },
                { name: 'yaw / pitch / roll', type: 'int', doc: 'Signed angles.' },
                { name: 'accel', type: 'tuple[int, int, int]', doc: 'Raw accelerometer, three axes.' },
                { name: 'gyro', type: 'tuple[int, int, int]', doc: 'Raw gyroscope, three axes.' },
              ],
            },
            {
              name: 'Matrix5x5',
              kind: 'dataclass',
              signature: '@dataclass(frozen=True)\nclass Matrix5x5:\n    pixels: tuple[int, ...]',
              summary: 'The 25 pixels of the hub’s light matrix, row by row.',
            },
          ],
        },
      ],
    },
    {
      id: 'port-devices',
      title: 'Port devices',
      blocks: [
        {
          kind: 'prose',
          html: 'Each of these carries the <code>Port</code> it was read from, and each lives in a dictionary on the snapshot keyed by that same port.',
        },
        {
          kind: 'api',
          entries: [
            {
              name: 'Motor',
              kind: 'dataclass',
              signature: `@dataclass(frozen=True)
class Motor:
    port: Port
    motor_type: MotorType
    absolute_position: int
    power: int
    speed: int
    position: int`,
              summary: 'One attached motor.',
              params: [
                { name: 'motor_type', type: 'MotorType', doc: '<code>MEDIUM</code>, <code>LARGE</code>, <code>SMALL</code>, or <code>UNKNOWN</code> for a type this build does not recognise.' },
                { name: 'absolute_position', type: 'int', doc: 'Absolute encoder position.' },
                { name: 'power', type: 'int', doc: 'Applied power.' },
                { name: 'speed', type: 'int', doc: 'Current speed.' },
                { name: 'position', type: 'int', doc: 'Relative position since the motor was reset.' },
              ],
            },
            {
              name: 'ForceSensor',
              kind: 'dataclass',
              signature: `@dataclass(frozen=True)
class ForceSensor:
    port: Port
    value: int
    pressed: bool`,
              summary: 'A force sensor: the measured value, and whether the hub considers it pressed.',
            },
            {
              name: 'ColorSensor',
              kind: 'dataclass',
              signature: `@dataclass(frozen=True)
class ColorSensor:
    port: Port
    color: Color
    red: int
    green: int
    blue: int`,
              summary:
                'A colour sensor: the colour HubOS decided on, plus the raw channels behind that decision. An unrecognised reading becomes <code>Color.UNKNOWN</code> rather than raising.',
            },
            {
              name: 'DistanceSensor',
              kind: 'dataclass',
              signature: `@dataclass(frozen=True)
class DistanceSensor:
    port: Port
    millimeters: int

    @property
    def detected(self) -> bool: ...`,
              summary:
                'A distance sensor. Nothing in range is reported as a <em>negative</em> value, not zero, so check <code>detected</code> before reading <code>millimeters</code>.',
              example: {
                lang: 'python',
                code: `sensor = snapshot.distance[Port.C]
print(sensor.millimeters if sensor.detected else "nothing in range")`,
              },
            },
            {
              name: 'ColorMatrix',
              kind: 'dataclass',
              signature: `@dataclass(frozen=True)
class ColorMatrix:
    port: Port
    pixels: tuple[int, ...]`,
              summary: 'A 3×3 colour matrix on a port — 9 values.',
            },
          ],
        },
      ],
    },
    {
      id: 'parsing',
      title: 'How parsing works',
      blocks: [
        {
          kind: 'prose',
          html: 'A device notification packs several device messages into one payload, each starting with a type byte that determines its length. The parser walks them in order and <strong>stops at the first type it does not recognise</strong>, because without that length it cannot locate the next message.',
        },
        {
          kind: 'table',
          headers: ['Type byte', 'Message', 'Becomes'],
          rows: [
            ['<code>0x00</code>', 'Battery', '<code>snapshot.battery</code>'],
            ['<code>0x01</code>', 'IMU', '<code>snapshot.imu</code>'],
            ['<code>0x02</code>', '5×5 matrix', '<code>snapshot.display</code>'],
            ['<code>0x0A</code>', 'Motor', '<code>snapshot.motors[port]</code>'],
            ['<code>0x0B</code>', 'Force', '<code>snapshot.force[port]</code>'],
            ['<code>0x0C</code>', 'Color', '<code>snapshot.color[port]</code>'],
            ['<code>0x0D</code>', 'Distance', '<code>snapshot.distance[port]</code>'],
            ['<code>0x0E</code>', '3×3 matrix', '<code>snapshot.color_matrix[port]</code>'],
          ],
        },
        {
          kind: 'prose',
          html: 'The consequence is that a firmware adding a new device type produces snapshots truncated at that point rather than wrong ones. The raw payload stays on the notification, so you can decode the remainder yourself.',
        },
      ],
    },
  ],
};
