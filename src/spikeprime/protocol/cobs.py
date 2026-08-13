"""SPIKE Prime COBS: escape 0x00, 0x01, and 0x02, then XOR with 0x03.

Algorithm matches the reference in the LEGO Group protocol docs:
https://lego.github.io/spike-prime-docs/encoding.html
"""

DELIMITER = 0x02
NO_DELIMITER = 0xFF
COBS_CODE_OFFSET = DELIMITER
MAX_BLOCK_SIZE = 84
XOR = 3


def encode(data: bytes) -> bytearray:
    """COBS-encode so the result contains no 0x00/0x01/0x02 bytes."""
    buffer = bytearray()
    code_index = 0
    block = 0

    def begin_block() -> None:
        nonlocal code_index, block
        code_index = len(buffer)
        buffer.append(NO_DELIMITER)
        block = 1

    begin_block()
    for byte in data:
        if byte > DELIMITER:
            buffer.append(byte)
            block += 1

        if byte <= DELIMITER or block > MAX_BLOCK_SIZE:
            if byte <= DELIMITER:
                delimiter_base = byte * MAX_BLOCK_SIZE
                block_offset = block + COBS_CODE_OFFSET
                buffer[code_index] = delimiter_base + block_offset
            begin_block()

    buffer[code_index] = block + COBS_CODE_OFFSET
    return buffer


def decode(data: bytes) -> bytearray:
    """Inverse of encode()."""
    if not data:
        return bytearray()

    buffer = bytearray()

    def unescape(code: int) -> tuple[int | None, int]:
        if code == 0xFF:
            return None, MAX_BLOCK_SIZE + 1
        value, block = divmod(code - COBS_CODE_OFFSET, MAX_BLOCK_SIZE)
        if block == 0:
            block = MAX_BLOCK_SIZE
            value -= 1
        return value, block

    value, block = unescape(data[0])
    for byte in data[1:]:
        block -= 1
        if block > 0:
            buffer.append(byte)
            continue
        if value is not None:
            buffer.append(value)
        value, block = unescape(byte)

    return buffer


def pack(data: bytes) -> bytes:
    """COBS-encode, XOR with 0x03, and suffix the 0x02 frame delimiter."""
    buffer = encode(data)
    for i in range(len(buffer)):
        buffer[i] ^= XOR
    buffer.append(DELIMITER)
    return bytes(buffer)


def unpack(frame: bytes) -> bytes:
    """Strip optional 0x01 priority prefix and trailing 0x02, then decode."""
    if len(frame) < 2:
        raise ValueError("frame too short")
    start = 1 if frame[0] == 0x01 else 0
    unframed = bytes(byte ^ XOR for byte in frame[start:-1])
    return bytes(decode(unframed))
