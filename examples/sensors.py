"""Subscribe to device notifications and print motors/sensors as they update."""

import asyncio

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
    asyncio.run(main())
