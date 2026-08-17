"""Recovering a hub whose link is already open, so it is not advertising."""

from spikeprime.client import SERVICE_UUID, match_open_link

ADDRESS = "64:8C:BB:10:AB:B6"


def device(
    path: str = "/org/bluez/hci0/dev_64_8C_BB_10_AB_B6",
    address: str = ADDRESS,
    alias: str = "Granbots2",
    connected: bool = True,
    hub: bool = True,
) -> tuple[str, dict]:
    uuids = ["00001800-0000-1000-8000-00805f9b34fb"]
    if hub:
        uuids.append(SERVICE_UUID)
    return path, {
        "Address": address,
        "Alias": alias,
        "Connected": connected,
        "UUIDs": uuids,
    }


def test_finds_a_connected_hub_by_name() -> None:
    found = match_open_link([device()], name="Granbots2")
    assert found is not None
    assert found.address == ADDRESS
    assert found.name == "Granbots2"
    assert found.details["path"].endswith("dev_64_8C_BB_10_AB_B6")


def test_name_matching_is_case_insensitive_and_partial() -> None:
    assert match_open_link([device()], name="granbots") is not None
    assert match_open_link([device()], name="GRANBOTS2") is not None
    assert match_open_link([device()], name="Sherlock 2") is None


def test_finds_a_connected_hub_by_address() -> None:
    assert match_open_link([device()], address=ADDRESS) is not None
    assert match_open_link([device()], address=ADDRESS.lower()) is not None
    assert match_open_link([device()], address="00:11:22:33:44:55") is None


def test_ignores_devices_that_are_not_connected() -> None:
    """A remembered but absent device would hang on connect, not fail."""
    assert match_open_link([device(connected=False)], name="Granbots2") is None
    assert match_open_link([device(connected=False)], address=ADDRESS) is None


def test_a_name_match_still_has_to_be_a_hub() -> None:
    headphones = device(alias="Granbots2 Headphones", hub=False)
    assert match_open_link([headphones], name="Granbots2") is None


def test_any_connected_hub_will_do_when_nothing_is_specified() -> None:
    assert match_open_link([device()]) is not None
    assert match_open_link([device(hub=False)]) is None


def test_picks_the_hub_out_of_a_crowd() -> None:
    others = [
        device(path="/d/1", address="AA:AA:AA:AA:AA:AA", alias="Rockerz 450", hub=False),
        device(path="/d/2", address="BB:BB:BB:BB:BB:BB", alias="Kate's iPhone", hub=False),
        device(),
    ]
    found = match_open_link(others, name="Granbots2")
    assert found is not None and found.address == ADDRESS


def test_no_devices_at_all() -> None:
    assert match_open_link([], name="Granbots2") is None


def test_survives_devices_with_missing_fields() -> None:
    sparse = ("/d/3", {"Connected": True})
    assert match_open_link([sparse, device()], name="Granbots2") is not None
    assert match_open_link([sparse], name="Granbots2") is None
