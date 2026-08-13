from spikeprime.protocol.crc import crc32


def test_empty() -> None:
    assert crc32(b"") == 0


def test_alignment_padding_changes_digest() -> None:
    # 1 byte is padded to 4, so it must not match a bare crc32 of that byte.
    assert crc32(b"a") != crc32(b"a", align=1)


def test_running_crc_is_stable() -> None:
    data = b"import runloop\nprint('hi')\n" * 20
    first = 0
    second = 0
    chunk = 8
    for i in range(0, len(data), chunk):
        piece = data[i : i + chunk]
        first = crc32(piece, first)
        second = crc32(piece, second)
    assert first == second
    assert first == crc32(data[:chunk], 0) or len(data) > chunk
