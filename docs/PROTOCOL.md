# Protocol notes

This SDK implements HubOS 3 over BLE. Source of truth:

- [Connection](https://lego.github.io/spike-prime-docs/connect.html)
- [Encoding](https://lego.github.io/spike-prime-docs/encoding.html)
- [Messages](https://lego.github.io/spike-prime-docs/messages.html)
- [Enumerations](https://lego.github.io/spike-prime-docs/enums.html)

## GATT

| Item | UUID |
|---|---|
| Service | `0000fd02-0000-1000-8000-00805f9b34fb` |
| RX (host → hub, write without response) | `0000fd02-0001-1000-8000-00805f9b34fb` |
| TX (hub → host, notifications) | `0000fd02-0002-1000-8000-00805f9b34fb` |

RX/TX names are from the hub's point of view.

## Framing

1. COBS-encode so the payload contains no `0x00`, `0x01`, or `0x02`
2. XOR every byte with `0x03`
3. Suffix `0x02` (end of frame). Optional prefix `0x01` marks high priority

Incoming BLE notifications can fragment or coalesce frames. `FrameAssembler`
implements the delimiter state machine from the encoding docs.

## CRC32

Upload checksums use `binascii.crc32` with the payload padded to a 4-byte
boundary. Chunk transfers pass the previous CRC as the seed so the running
value covers the whole file.

## Slots

Program slots are `0`–`19`. Clearing an empty slot may return NACK; the SDK
treats that as success unless `ignore_nack=False`.

## Firmware update

`Hub.update_firmware()` runs the documented sequence:

1. `StartFirmwareUploadRequest` carries the image's SHA-1 (the 20-byte "File
   SHA") and its CRC32. The response reports how many bytes the hub already
   holds for that SHA.
2. `TransferChunkRequest` per chunk, carrying the running CRC32.
3. `BeginFirmwareUpdateRequest` installs the image. The hub reboots into the
   updater and drops the connection. Pass `begin=False` to stage without
   installing.

Resume uses the byte count from step 1: chunks the hub already has are skipped
but still folded into the running CRC. Because that CRC is accumulated per
chunk, a resume offset that is not a multiple of the hub's chunk size cannot be
reproduced, and the SDK raises rather than sending a CRC the hub will reject.

Flashing firmware overwrites the hub's operating system. The CLI requires
`--yes`.

## Message priority

`0x01` marks a high-priority frame. `Hub._send()` and `Hub.tunnel()` take
`high_priority=`; everything else is sent as low priority, which is what the
hub expects for normal request/response traffic.
