"""CRC32 used for HubOS file transfers.

The hub expects zlib/ITU CRC32 with the payload padded to a 4-byte boundary.
Chunk transfers pass the previous digest as the seed so the running CRC covers
the whole file.
"""

from binascii import crc32 as _crc32


def crc32(data: bytes, seed: int = 0, align: int = 4) -> int:
    remainder = len(data) % align
    if remainder:
        data += b"\x00" * (align - remainder)
    return _crc32(data, seed)
