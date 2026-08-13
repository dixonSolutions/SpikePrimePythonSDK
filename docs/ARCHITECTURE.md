# Architecture

**SpikePrimePythonSDK** is a host-side SDK for HubOS 3. The Python import is
`spikeprime`. Programs still run on the hub. This library talks to the hub over
Bluetooth Low Energy using the protocol documented at
[lego.github.io/spike-prime-docs](https://lego.github.io/spike-prime-docs/).

```
Your Python script
        │
        ▼
   spikeprime.Hub          high-level: scan, connect, upload, start/stop
        │
        ▼
   protocol.messages      typed request/response/notification structs
        │
        ▼
   protocol.framing       COBS + XOR + 0x02 delimiters, packet reassembly
        │
        ▼
   bleak (GATT)           write RX, notify TX
        │
        ▼
   HubOS 3
```

## Layers

| Module | Responsibility |
|---|---|
| `spikeprime.client` | Connection lifecycle, request/response matching, file transfer |
| `spikeprime.devices` | Parsed sensor/motor snapshots from `DeviceNotification` |
| `spikeprime.protocol.messages` | Binary layout of every HubOS message |
| `spikeprime.protocol.framing` | Encode/decode frames and reassemble BLE packets |
| `spikeprime.protocol.cobs` | SPIKE-specific COBS (escapes 0x00, 0x01, 0x02) |
| `spikeprime.protocol.crc` | CRC32 with 4-byte alignment, as used for uploads |

## Connection handshake

After GATT connect, the first message must be `InfoRequest`. The hub replies
with packet, message, and chunk size limits. Every later write honors
`max_packet_size`; file uploads honor `max_chunk_size`.

## Upload sequence

1. Optional `ClearSlotRequest`
2. `StartFileUploadRequest` with filename, slot, and CRC32 of the whole file
3. `TransferChunkRequest` for each chunk, carrying a running CRC32
4. `ProgramFlowRequest(Start, slot)` if the caller asked to run

## Notifications

The hub can push `ConsoleNotification`, `ProgramFlowNotification`,
`DeviceNotification`, and `TunnelMessage` at any time. These never complete a
pending request; they go to queues and optional callbacks.
