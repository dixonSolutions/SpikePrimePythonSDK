import type { DocPage } from '../types';

export const sensors: DocPage = {
  slug: 'sensors-and-devices',
  title: 'Sensors and devices',
  summary:
    'Turning on device notifications and reading typed snapshots of the battery, IMU, motors and every attached sensor.',
  keywords: [
    'device notification',
    'sensor',
    'motor',
    'imu',
    'battery',
    'color',
    'distance',
    'force',
    'port',
    'snapshot',
    'interval',
  ],
  sections: [
    {
      id: 'enable',
      title: 'Turning them on',
      blocks: [
        {
          kind: 'prose',
          html: 'The hub sends nothing about its devices until you ask. <code>enable_notifications()</code> sets the interval in milliseconds; after that the hub pushes a device notification on that cadence.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.enable_notifications(200)   # every 200 ms
await hub.enable_notifications()      # defaults to 500 ms
await hub.disable_notifications()     # same as enable_notifications(0)`,
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Pick an interval you actually need',
          html: 'Every notification is a BLE packet competing with uploads and console output on the same link. 200&nbsp;ms is comfortable for watching a robot; 20&nbsp;ms will fight with everything else you are doing.',
        },
      ],
    },
    {
      id: 'snapshot',
      title: 'Reading a snapshot',
      blocks: [
        {
          kind: 'prose',
          html: 'Each notification is parsed into a <code>DeviceSnapshot</code>: frozen dataclasses for the battery, the IMU and the light matrix, plus dictionaries keyed by <code>Port</code> for anything attached to a port.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `async with await connect() as hub:
    await hub.enable_notifications(200)

    async for snapshot in hub.device_updates():
        if snapshot.battery:
            print("battery", snapshot.battery.percent, "%")
        if snapshot.imu:
            print("yaw", snapshot.imu.yaw, "face up", snapshot.imu.face_up.name)
        for port, motor in snapshot.motors.items():
            print(f"motor {port.name}: pos={motor.position} speed={motor.speed}")`,
        },
        {
          kind: 'prose',
          html: 'A callback form is available too, and the most recent snapshot is always readable synchronously from <code>hub.devices</code> — useful when you need current state at an arbitrary moment rather than a stream of them.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `hub.on_device(lambda snapshot: print(snapshot.battery))

latest = hub.devices          # DeviceSnapshot | None
if latest and latest.distance:
    print(latest.distance[Port.C].millimeters)`,
        },
      ],
    },
    {
      id: 'contents',
      title: 'What a snapshot contains',
      blocks: [
        {
          kind: 'table',
          headers: ['Attribute', 'Type', 'Meaning'],
          rows: [
            ['<code>battery</code>', '<code>Battery | None</code>', 'Charge as a percentage'],
            ['<code>imu</code>', '<code>IMU | None</code>', 'Orientation, yaw/pitch/roll, raw accelerometer and gyroscope'],
            ['<code>display</code>', '<code>Matrix5x5 | None</code>', 'The 25 pixels of the hub light matrix'],
            ['<code>motors</code>', '<code>dict[Port, Motor]</code>', 'One entry per attached motor'],
            ['<code>force</code>', '<code>dict[Port, ForceSensor]</code>', 'Force sensors'],
            ['<code>color</code>', '<code>dict[Port, ColorSensor]</code>', 'Colour sensors'],
            ['<code>distance</code>', '<code>dict[Port, DistanceSensor]</code>', 'Distance sensors'],
            ['<code>color_matrix</code>', '<code>dict[Port, ColorMatrix]</code>', '3×3 colour matrices'],
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Every snapshot is complete, not a delta',
          html: 'Each notification is parsed fresh, so a device that is unplugged simply stops appearing in the next snapshot. Do not carry a <code>Motor</code> from an old snapshot forward and assume it is still there.',
        },
      ],
    },
    {
      id: 'devices',
      title: 'The device types',
      blocks: [
        {
          kind: 'table',
          headers: ['Type', 'Fields'],
          rows: [
            ['<code>Battery</code>', '<code>percent</code>'],
            [
              '<code>IMU</code>',
              '<code>face_up</code>, <code>yaw_face</code> (both <code>HubFace</code>), <code>yaw</code>, <code>pitch</code>, <code>roll</code>, <code>accel</code>, <code>gyro</code>',
            ],
            ['<code>Matrix5x5</code>', '<code>pixels</code> — 25 brightness values'],
            [
              '<code>Motor</code>',
              '<code>port</code>, <code>motor_type</code>, <code>absolute_position</code>, <code>power</code>, <code>speed</code>, <code>position</code>',
            ],
            ['<code>ForceSensor</code>', '<code>port</code>, <code>value</code>, <code>pressed</code>'],
            ['<code>ColorSensor</code>', '<code>port</code>, <code>color</code> (a <code>Color</code>), <code>red</code>, <code>green</code>, <code>blue</code>'],
            ['<code>DistanceSensor</code>', '<code>port</code>, <code>millimeters</code>, and a <code>detected</code> property'],
            ['<code>ColorMatrix</code>', '<code>port</code>, <code>pixels</code> — 9 values'],
          ],
        },
        {
          kind: 'prose',
          html: 'All of them are frozen dataclasses, so they are hashable, comparable and safe to keep. Field-by-field detail is in the <a href="docs/api-devices">devices API reference</a>.',
        },
      ],
    },
    {
      id: 'distance',
      title: 'Distance: nothing detected is not zero',
      blocks: [
        {
          kind: 'prose',
          html: 'A distance sensor with nothing in front of it reports a negative value, not zero. <code>detected</code> exists so you never have to remember which sentinel it used.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `for port, sensor in snapshot.distance.items():
    if sensor.detected:
        print(f"{port.name}: {sensor.millimeters} mm")
    else:
        print(f"{port.name}: nothing in range")`,
        },
      ],
    },
    {
      id: 'colour',
      title: 'Colour: a name and the raw channels',
      blocks: [
        {
          kind: 'prose',
          html: 'A colour sensor reports both the colour HubOS decided on and the raw red, green and blue channels behind that decision. An unrecognised reading becomes <code>Color.UNKNOWN</code> rather than raising, so a sensor pointed at something ambiguous will not crash a run.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime import Color

sensor = snapshot.color[Port.B]
if sensor.color is Color.UNKNOWN:
    print("unsure:", sensor.red, sensor.green, sensor.blue)
else:
    print("saw", sensor.color.name)`,
        },
      ],
    },
    {
      id: 'orientation',
      title: 'Orientation',
      blocks: [
        {
          kind: 'prose',
          html: '<code>face_up</code> is which face of the hub is pointing up, and <code>yaw_face</code> is the face yaw is measured around; both are <code>HubFace</code> values (<code>TOP</code>, <code>FRONT</code>, <code>RIGHT</code>, <code>BOTTOM</code>, <code>BACK</code>, <code>LEFT</code>). Yaw, pitch and roll are signed integers, and <code>accel</code> and <code>gyro</code> are raw three-axis tuples straight from the sensor.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `imu = snapshot.imu
if imu:
    print(f"{imu.face_up.name} up, yaw {imu.yaw}")
    ax, ay, az = imu.accel
    print(f"accel {ax} {ay} {az}")`,
        },
      ],
    },
    {
      id: 'complete',
      title: 'A complete monitor',
      blocks: [
        {
          kind: 'prose',
          html: 'This is <code>examples/sensors.py</code> from the repository: subscribe, then print one line per update describing everything currently attached.',
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'examples/sensors.py',
          code: `import asyncio

from spikeprime import DeviceSnapshot, connect


def describe(snapshot: DeviceSnapshot) -> str:
    parts: list[str] = []
    if snapshot.battery:
        parts.append(f"battery {snapshot.battery.percent}%")
    if snapshot.imu:
        parts.append(f"yaw {snapshot.imu.yaw}")
    for port, motor in snapshot.motors.items():
        parts.append(f"motor {port.name} pos={motor.position} spd={motor.speed}")
    for port, color in snapshot.color.items():
        parts.append(f"color {port.name} {color.color.name}")
    for port, distance in snapshot.distance.items():
        label = f"{distance.millimeters}mm" if distance.detected else "none"
        parts.append(f"distance {port.name} {label}")
    for port, force in snapshot.force.items():
        parts.append(f"force {port.name} {force.value}")
    return ", ".join(parts) or "(no devices)"


async def main() -> None:
    async with await connect() as hub:
        await hub.enable_notifications(200)
        print("Listening for device notifications. Ctrl+C to stop.")
        async for snapshot in hub.device_updates():
            print(describe(snapshot))


if __name__ == "__main__":
    asyncio.run(main())`,
        },
      ],
    },
    {
      id: 'unknown',
      title: 'Unknown devices',
      blocks: [
        {
          kind: 'prose',
          html: 'A device notification packs several device messages into one payload, each with a leading type byte. The parser walks them in order and <strong>stops at the first type it does not recognise</strong>, because without knowing that message\'s length it cannot find where the next one begins.',
        },
        {
          kind: 'prose',
          html: 'In practice that means a firmware that adds a new device type yields snapshots truncated at that point rather than wrong ones. The raw bytes stay available on the notification if you need to decode them yourself — see <a href="docs/api-protocol#devicenotification">DeviceNotification</a>.',
        },
      ],
    },
  ],
};
